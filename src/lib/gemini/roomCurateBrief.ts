import type { CategoryId } from '../../data/categories';
import { getGeminiApiKey } from './apiKey';
import { fileToInlineImage, type InlineImagePayload } from './imageUtils';

const BRIEF_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'] as const;
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

const STORE_CATEGORIES: CategoryId[] = [
  'sofa',
  'bed',
  'rug',
  'table',
  'lamp',
  'decor',
];

export interface RoomCurateBrief {
  roomType: string;
  style: string;
  colorPalette: string;
  lighting: string;
  scale: 'small' | 'medium' | 'large';
  focalPoint: string;
  existingItems: string;
  gapsToFill: string;
  /** Store category ids that fit this room — pick 2–4 */
  categories: CategoryId[];
  stagingNotes: string;
}

interface GeminiTextResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  error?: { message?: string };
}

function buildRoomBriefPrompt(): string {
  return `You are a senior residential interior designer. Study the customer's room photo and produce a concise staging brief for our furniture store.

INPUT
- Image 1: Customer room photograph.

TASK — analyze before any product decisions
1. Room type: living room, bedroom, dining, home office, studio, entryway, kids room, etc.
2. Architectural style: modern, mid-century, scandi, japandi, industrial, traditional, farmhouse, transitional, mediterranean, eclectic…
3. Color palette: wall, floor, trim, dominant accents; warm/cool/neutral; light or dark; saturation.
4. Light: direction, softness, time of day, color temperature.
5. Scale: small | medium | large (ceiling height, sense of space).
6. Focal point: window, fireplace, TV wall, view, art wall, etc.
7. Existing furniture & decor already in the photo (list main pieces).
8. Gaps: what is missing or weak for a finished, functional, beautiful room (seating, surfaces, rug, lighting, textiles, storage, decor balance).
9. Store categories: choose 2–4 from ONLY this list that best match what this room needs: ${STORE_CATEGORIES.join(', ')}.
   - Example: empty living room → sofa, rug, table, lamp.
   - Example: furnished bedroom needing refresh → bed, lamp, rug, decor.
10. Staging notes: one paragraph — how a pro stylist would complete this room using catalog pieces (placement zones, color harmony, what to replace vs. add).

OUTPUT — JSON only, no markdown fences, no commentary:
{
  "roomType": "string",
  "style": "string",
  "colorPalette": "string",
  "lighting": "string",
  "scale": "small" | "medium" | "large",
  "focalPoint": "string",
  "existingItems": "string",
  "gapsToFill": "string",
  "categories": ["sofa","rug"],
  "stagingNotes": "string"
}

Rules for categories array:
- Use only ids from: ${STORE_CATEGORIES.join(', ')}.
- 2–4 entries. Prefer categories that fill real gaps, not duplicates of what already looks complete.`;
}

function parseBriefJson(text: string): RoomCurateBrief | null {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const raw = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    const scale = raw.scale;
    const validScale =
      scale === 'small' || scale === 'medium' || scale === 'large'
        ? scale
        : 'medium';

    const categoriesRaw = Array.isArray(raw.categories) ? raw.categories : [];
    const categories = categoriesRaw
      .map((c) => (typeof c === 'string' ? c.trim() : ''))
      .filter((c): c is CategoryId =>
        STORE_CATEGORIES.includes(c as CategoryId)
      );

    if (categories.length === 0) return null;

    return {
      roomType: String(raw.roomType ?? 'living room').slice(0, 120),
      style: String(raw.style ?? 'transitional').slice(0, 120),
      colorPalette: String(raw.colorPalette ?? '').slice(0, 400),
      lighting: String(raw.lighting ?? '').slice(0, 200),
      scale: validScale,
      focalPoint: String(raw.focalPoint ?? '').slice(0, 200),
      existingItems: String(raw.existingItems ?? '').slice(0, 500),
      gapsToFill: String(raw.gapsToFill ?? '').slice(0, 500),
      categories: categories.slice(0, 4),
      stagingNotes: String(raw.stagingNotes ?? '').slice(0, 600),
    };
  } catch {
    return null;
  }
}

async function callGeminiBrief(
  roomImage: InlineImagePayload,
  signal?: AbortSignal
): Promise<string> {
  const apiKey = getGeminiApiKey();
  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: buildRoomBriefPrompt() }, { inlineData: roomImage }],
      },
    ],
    generationConfig: {
      temperature: 0.15,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json',
    },
  };

  let lastError: Error | null = null;

  for (const model of BRIEF_MODELS) {
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
      lastError = new Error('Empty room brief response');
      continue;
    }

    const msg = json.error?.message ?? `API error ${response.status}`;
    if (response.status === 404 || msg.toLowerCase().includes('not found')) {
      lastError = new Error(msg);
      continue;
    }
    throw new Error(msg);
  }

  throw lastError ?? new Error('Room analysis failed');
}

/** Infer room type, palette, gaps, and which store categories belong in this space. */
export async function analyzeRoomForCurate(
  roomFile: File,
  options?: { signal?: AbortSignal }
): Promise<RoomCurateBrief> {
  const roomImage = await fileToInlineImage(roomFile);
  const raw = await callGeminiBrief(roomImage, options?.signal);
  const parsed = parseBriefJson(raw);

  if (parsed) return parsed;

  return {
    roomType: 'living room',
    style: 'transitional',
    colorPalette: 'neutral walls and warm wood tones',
    lighting: 'natural window light',
    scale: 'medium',
    focalPoint: 'main window wall',
    existingItems: 'furniture visible in the uploaded photo',
    gapsToFill: 'seating, surface, rug, and accent lighting',
    categories: ['sofa', 'rug', 'table', 'lamp'],
    stagingNotes:
      'Stage a cohesive seating zone with catalog pieces that harmonize with existing wall and floor colors.',
  };
}

export function formatRoomBriefForStaging(brief: RoomCurateBrief): string {
  return `ROOM BRIEF (follow exactly — this was written by our lead interior designer after studying Image 1)
• Room type: ${brief.roomType}
• Style: ${brief.style}
• Color palette: ${brief.colorPalette}
• Lighting: ${brief.lighting}
• Scale: ${brief.scale}
• Focal point: ${brief.focalPoint}
• Already in the customer's photo: ${brief.existingItems}
• Gaps to fill or upgrade: ${brief.gapsToFill}
• Stylist direction: ${brief.stagingNotes}`;
}
