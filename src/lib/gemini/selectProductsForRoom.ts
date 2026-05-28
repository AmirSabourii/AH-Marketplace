import type { Product } from '../../data/scenes';
import type { CatalogItem } from '../medusa/products';
import { getGeminiApiKey } from './apiKey';
import { fileToInlineImage, type InlineImagePayload } from './imageUtils';
import type { CurateIntent } from './curateIntent';
import { formatCurateIntentForPrompt } from './curateIntent';
import {
  analyzeRoomForCurate,
  formatRoomBriefForStaging,
  type RoomCurateBrief,
} from './roomCurateBrief';

const PICK_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'] as const;
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export interface CurateSelectionResult {
  products: Product[];
  brief: RoomCurateBrief;
}

interface GeminiTextResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  error?: { message?: string };
}

function buildCatalogLines(catalog: CatalogItem[]): string {
  return catalog
    .map(
      (item) =>
        `- id: ${item.product.id} | category: ${item.categoryId} | ${item.product.name} | ${item.product.price} | ${item.product.description}`
    )
    .join('\n');
}

function filterCatalogByBrief(
  catalog: CatalogItem[],
  brief: RoomCurateBrief
): CatalogItem[] {
  const allowed = new Set(brief.categories);
  const filtered = catalog.filter((item) => allowed.has(item.categoryId));
  if (filtered.length >= 3) return filtered;
  return catalog;
}

function parseProductIds(text: string): string[] {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as unknown;
      if (Array.isArray(parsed)) {
        return parsed
          .map((id) => (typeof id === 'string' ? id.trim() : ''))
          .filter(Boolean);
      }
    } catch {
      /* fall through */
    }
  }

  return trimmed
    .split(/[\n,]+/)
    .map((line) => line.replace(/^[-*\d.)\s]+/, '').trim())
    .filter((line) => line.length > 0 && !line.includes(' '));
}

function buildPickPrompt(
  catalog: CatalogItem[],
  brief: RoomCurateBrief,
  maxPick: number,
  userIntent?: CurateIntent
): string {
  const briefBlock = formatRoomBriefForStaging(brief);
  const customerBlock = formatCurateIntentForPrompt(userIntent ?? { wish: '' });

  return `You are a senior interior stylist at a premium furniture retailer. Your job is to choose catalog products that will be photorealistically staged into the customer's real room.

INPUT
- Image 1: The customer's room photograph.
- ROOM BRIEF below: written after a professional read of this exact photo.
- CATALOG: products allowed for this room (already filtered to relevant categories).

${briefBlock}
${customerBlock ? `\n${customerBlock}\n` : ''}
SELECTION RULES
1. Read Image 1 and confirm the brief still fits; adjust mentally if the photo contradicts anything.
2. Pick ${maxPick} products maximum (aim for 3–5) that TOGETHER complete the room:
   - Style must match "${brief.style}" and room type "${brief.roomType}".
   - Colors/finishes must harmonize with: ${brief.colorPalette}.
   - Scale must suit a ${brief.scale} room — no oversized monsters in small spaces.
   - Build a functional set: seating and/or bed + surface + rug (if floor is bare) + lamp/lighting + optional decor.
   - Prefer pieces that fill: ${brief.gapsToFill}.
   - Do NOT pick items that duplicate strong existing pieces unless replacing them (e.g. skip a new sofa if a full sofa already anchors the room — pick rug, table, lamp instead).
3. Cohesion: all picks must look like one designer curated them — shared wood tone, metal finish, or upholstery family.
4. Bold but believable: an empty corner is worse than one strong accent. Prefer fewer perfect pieces over many mediocre ones.
5. Use ONLY product ids from the catalog list.
${customerBlock ? '6. If CUSTOMER WISH names a household need or product (bunk bed, desk, sectional, storage, kids room), prioritize catalog items that satisfy it — adjust categories mentally if the brief categories are too narrow.' : ''}

OUTPUT
Return ONLY a JSON array of product id strings, best-fit first. Between 1 and ${maxPick} ids.
Example: ["prod-a","prod-b","prod-c"]
No keys. No prose. JSON array only.

CATALOG (category-filtered for this room)
${buildCatalogLines(catalog)}`;
}

async function callGeminiPicker(
  roomImage: InlineImagePayload,
  prompt: string,
  signal?: AbortSignal
): Promise<string> {
  const apiKey = getGeminiApiKey();
  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }, { inlineData: roomImage }],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 512,
      responseMimeType: 'text/plain',
    },
  };

  let lastError: Error | null = null;

  for (const model of PICK_MODELS) {
    const response = await fetch(
      `${API_BASE}/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(body),
        signal,
      }
    );

    const json = (await response.json()) as GeminiTextResponse;

    if (response.ok) {
      const text = (json.candidates?.[0]?.content?.parts ?? [])
        .map((p) => p.text ?? '')
        .join('')
        .trim();
      if (text) return text;
      lastError = new Error('Empty model response');
      continue;
    }

    const msg = json.error?.message ?? `API error ${response.status}`;
    if (response.status === 404 || msg.toLowerCase().includes('not found')) {
      lastError = new Error(msg);
      continue;
    }
    throw new Error(msg);
  }

  throw lastError ?? new Error('Product selection failed');
}

function resolvePickedProducts(
  ids: string[],
  catalog: CatalogItem[],
  maxPick: number
): Product[] {
  const byId = new Map(catalog.map((item) => [item.product.id, item.product]));
  const picked: Product[] = [];
  const seen = new Set<string>();

  for (const id of ids) {
    if (seen.has(id)) continue;
    const product = byId.get(id);
    if (product) {
      seen.add(id);
      picked.push(product);
      if (picked.length >= maxPick) break;
    }
  }

  return picked;
}

/**
 * Two-step curate prep: (1) professional room brief, (2) category-filtered product pick.
 */
export async function selectProductsForCurate(
  roomFile: File,
  catalog: CatalogItem[],
  options?: {
    signal?: AbortSignal;
    maxPick?: number;
    userIntent?: CurateIntent;
  }
): Promise<CurateSelectionResult> {
  if (catalog.length === 0) {
    throw new Error('Catalog is empty');
  }

  const maxPick = Math.min(options?.maxPick ?? 5, catalog.length);
  const brief = await analyzeRoomForCurate(roomFile, {
    signal: options?.signal,
    userIntent: options?.userIntent,
  });
  const filteredCatalog = filterCatalogByBrief(catalog, brief);

  const roomImage = await fileToInlineImage(roomFile);
  const raw = await callGeminiPicker(
    roomImage,
    buildPickPrompt(filteredCatalog, brief, maxPick, options?.userIntent),
    options?.signal
  );

  const ids = parseProductIds(raw);
  let picked = resolvePickedProducts(ids, filteredCatalog, maxPick);

  if (picked.length === 0) {
    picked = resolvePickedProducts(
      filteredCatalog.slice(0, maxPick).map((i) => i.product.id),
      filteredCatalog,
      maxPick
    );
  }

  if (picked.length === 0) {
    picked = catalog.slice(0, Math.min(3, maxPick)).map((item) => item.product);
  }

  return { products: picked, brief };
}

/**
 * Legacy picker — brief-aware but skips the dedicated room analysis call.
 */
export async function selectProductsForRoom(
  roomFile: File,
  catalog: CatalogItem[],
  options?: { signal?: AbortSignal; maxPick?: number }
): Promise<Product[]> {
  const result = await selectProductsForCurate(roomFile, catalog, options);
  return result.products;
}
