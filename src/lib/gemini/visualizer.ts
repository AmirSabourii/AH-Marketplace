import {
  closestAspectRatio,
  fileToInlineImage,
  loadImageDimensions,
  urlToInlineImage,
  type InlineImagePayload,
} from './imageUtils';
import { consumeCurateBrief } from './curateStageContext';
import {
  buildRoomCuratePrompt,
  buildRoomRearrangeExistingPrompt,
  buildRoomStagingPrompt,
  type StagingProductContext,
} from './stagingPrompt';
import type { RoomCurateBrief } from './roomCurateBrief';
import { getGeminiApiKey } from './apiKey';

/** Models that can return IMAGE via generateContent (tried in order). */
const IMAGE_MODELS = [
  'gemini-3.1-flash-image-preview',
  'gemini-2.5-flash-image',
  'gemini-2.0-flash-preview-image-generation',
] as const;

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export interface VisualizerProductInput {
  name: string;
  description: string;
  imageUrl: string;
  variantName?: string;
}

export interface GenerateRoomVisualizationParams {
  roomFile: File;
  products: VisualizerProductInput[];
  signal?: AbortSignal;
}

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
  }>;
  error?: { message?: string };
}

function extractGeneratedImageDataUrl(response: GeminiResponse): string {
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const imageParts = parts.filter((p) => p.inlineData?.data);

  if (imageParts.length === 0) {
    const textPart = parts.find((p) => p.text)?.text;
    throw new Error(textPart?.trim() || 'Gemini returned no image. Try a clearer room photo.');
  }

  const best = imageParts.reduce((largest, part) =>
    part.inlineData!.data.length > largest.inlineData!.data.length ? part : largest
  );

  const { mimeType, data } = best.inlineData!;
  if (!data || data.length === 0) {
    throw new Error('Gemini returned an empty image. Try again.');
  }
  const normalisedMime =
    mimeType && /^image\/[a-z0-9.+-]+$/i.test(mimeType) ? mimeType : 'image/png';
  return `data:${normalisedMime};base64,${data}`;
}

function toStagingContext(products: VisualizerProductInput[]): StagingProductContext[] {
  return products.map((p, i) => ({
    name: p.name,
    description: p.description,
    variantName: p.variantName,
    imageIndex: i + 2,
  }));
}

async function callGeminiRoomImage(
  roomFile: File,
  products: VisualizerProductInput[],
  buildPrompt: (ctx: StagingProductContext[]) => string,
  signal?: AbortSignal,
  options?: { temperature?: number }
): Promise<string> {
  const apiKey = getGeminiApiKey();

  const roomPreview = URL.createObjectURL(roomFile);
  let aspectRatio = '16:9';
  try {
    const dims = await loadImageDimensions(roomPreview);
    aspectRatio = closestAspectRatio(dims.width, dims.height);
  } finally {
    URL.revokeObjectURL(roomPreview);
  }

  const roomImage = await fileToInlineImage(roomFile);
  const productImages: InlineImagePayload[] = await Promise.all(
    products.map((p) => urlToInlineImage(p.imageUrl))
  );

  const stagingProducts = toStagingContext(products);
  const prompt = buildPrompt(stagingProducts);

  const parts: Array<{ text: string } | { inlineData: InlineImagePayload }> = [
    { text: prompt },
    { inlineData: roomImage },
    ...productImages.map((img) => ({ inlineData: img })),
  ];

  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: { aspectRatio },
      ...(options?.temperature != null ? { temperature: options.temperature } : {}),
    },
  };

  let lastError: Error | null = null;

  for (const model of IMAGE_MODELS) {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    // Per-model timeout (60s) so a slow/unresponsive model can't hang the UI
    // forever. Composes with the caller's signal.
    const timeoutCtl = new AbortController();
    const timer = window.setTimeout(() => timeoutCtl.abort(), 60_000);
    const onCallerAbort = () => timeoutCtl.abort();
    signal?.addEventListener('abort', onCallerAbort);

    let response: Response;
    try {
      response = await fetch(`${API_BASE}/models/${model}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(body),
        signal: timeoutCtl.signal,
      });
    } catch (fetchErr) {
      window.clearTimeout(timer);
      signal?.removeEventListener('abort', onCallerAbort);
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      lastError =
        fetchErr instanceof Error
          ? fetchErr
          : new Error(`Network error calling ${model}`);
      // eslint-disable-next-line no-console
      console.warn(`[gemini] ${model} network/timeout error:`, lastError.message);
      continue;
    }
    window.clearTimeout(timer);
    signal?.removeEventListener('abort', onCallerAbort);

    let json: GeminiResponse;
    try {
      json = (await response.json()) as GeminiResponse;
    } catch {
      lastError = new Error(`Gemini ${model} returned a non-JSON response`);
      // eslint-disable-next-line no-console
      console.warn(`[gemini] ${model} non-JSON response`);
      continue;
    }

    if (response.ok) {
      try {
        return extractGeneratedImageDataUrl(json);
      } catch (parseErr) {
        lastError =
          parseErr instanceof Error ? parseErr : new Error('No image in Gemini response');
        // eslint-disable-next-line no-console
        console.warn(
          `[gemini] ${model} ok but no image:`,
          lastError.message,
          json.candidates?.[0]?.content?.parts
        );
        continue;
      }
    }

    const msg = json.error?.message ?? `Gemini API error (${response.status})`;
    lastError = new Error(msg);
    // eslint-disable-next-line no-console
    console.warn(`[gemini] ${model} HTTP ${response.status}:`, msg);
    if (response.status !== 404 && response.status !== 400) {
      throw lastError;
    }
  }

  throw (
    lastError ??
    new Error('Image generation failed. Check VITE_GEMINI_API_KEY and try again.')
  );
}

export async function generateRoomVisualization(
  params: GenerateRoomVisualizationParams
): Promise<string> {
  return callGeminiRoomImage(
    params.roomFile,
    params.products,
    buildRoomStagingPrompt,
    params.signal
  );
}

/**
 * Rearrange: uses the EXACT same Gemini request shape as compose (preview).
 *
 * We send three parts — prompt + room image + the same room image as a
 * "reference" — so the payload is structurally identical to a 1-product
 * compose call. This is the pattern that reliably returns an image from
 * Gemini's image-preview models. The prompt itself instructs the model to
 * keep the room and re-position the existing furniture.
 *
 * Catalog products are ignored on purpose: rearrange is a single-image
 * transformation of the current room (raw upload or previously staged frame).
 */
export async function rearrangeRoomVisualization(params: {
  roomFile: File;
  signal?: AbortSignal;
}): Promise<string> {
  const apiKey = getGeminiApiKey();

  const roomPreview = URL.createObjectURL(params.roomFile);
  let aspectRatio = '16:9';
  try {
    const dims = await loadImageDimensions(roomPreview);
    aspectRatio = closestAspectRatio(dims.width, dims.height);
  } finally {
    URL.revokeObjectURL(roomPreview);
  }

  const roomImage = await fileToInlineImage(params.roomFile);
  const prompt = buildRoomRearrangeExistingPrompt();

  // Same shape as a 1-product compose call: text + base image + reference.
  // We send the room photo twice on purpose — once as the base scene and
  // once as the reference for the items present.
  const parts: Array<{ text: string } | { inlineData: InlineImagePayload }> = [
    { text: prompt },
    { inlineData: roomImage },
    { inlineData: roomImage },
  ];

  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: { aspectRatio },
      temperature: 0.2,
    },
  };

  let lastError: Error | null = null;
  for (const model of IMAGE_MODELS) {
    if (params.signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    const timeoutCtl = new AbortController();
    const timer = window.setTimeout(() => timeoutCtl.abort(), 60_000);
    const onCallerAbort = () => timeoutCtl.abort();
    params.signal?.addEventListener('abort', onCallerAbort);

    let response: Response;
    try {
      response = await fetch(`${API_BASE}/models/${model}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(body),
        signal: timeoutCtl.signal,
      });
    } catch (fetchErr) {
      window.clearTimeout(timer);
      params.signal?.removeEventListener('abort', onCallerAbort);
      if (params.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      lastError =
        fetchErr instanceof Error
          ? fetchErr
          : new Error(`Network error calling ${model}`);
      // eslint-disable-next-line no-console
      console.warn(`[gemini rearrange] ${model} fetch error:`, lastError.message);
      continue;
    }
    window.clearTimeout(timer);
    params.signal?.removeEventListener('abort', onCallerAbort);

    let json: GeminiResponse;
    try {
      json = (await response.json()) as GeminiResponse;
    } catch {
      lastError = new Error(`Gemini ${model} returned a non-JSON response`);
      // eslint-disable-next-line no-console
      console.warn(`[gemini rearrange] ${model} non-JSON response`);
      continue;
    }

    if (response.ok) {
      try {
        return extractGeneratedImageDataUrl(json);
      } catch (parseErr) {
        lastError =
          parseErr instanceof Error
            ? parseErr
            : new Error('No image in Gemini response');
        // eslint-disable-next-line no-console
        console.warn(
          `[gemini rearrange] ${model} ok but no image:`,
          lastError.message,
          json.candidates?.[0]?.content?.parts
        );
        continue;
      }
    }

    const msg = json.error?.message ?? `Gemini API error (${response.status})`;
    lastError = new Error(msg);
    // eslint-disable-next-line no-console
    console.warn(`[gemini rearrange] ${model} HTTP ${response.status}:`, msg);
    if (response.status !== 404 && response.status !== 400) {
      throw lastError;
    }
  }

  throw (
    lastError ??
    new Error('Rearrange failed. Check VITE_GEMINI_API_KEY and try again.')
  );
}

export async function curateRoomVisualization(
  params: GenerateRoomVisualizationParams & { roomBrief?: RoomCurateBrief }
): Promise<string> {
  const brief = params.roomBrief ?? consumeCurateBrief();
  return callGeminiRoomImage(
    params.roomFile,
    params.products,
    (ctx) => buildRoomCuratePrompt(ctx, brief),
    params.signal,
    { temperature: 0.2 }
  );
}
