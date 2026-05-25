import {
  closestAspectRatio,
  fileToInlineImage,
  loadImageDimensions,
  type InlineImagePayload,
} from './imageUtils';
import type { ProcessingMode } from './modes';
import { buildProductStudioPrompt, buildProductStagedPrompt } from './prompt';
import {
  resizeStagedOutput,
  resizeToCatalogSquare,
  type ResizeOptions,
} from './resize';

const MODEL = 'gemini-3.1-flash-image-preview';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

function getApiKey(): string {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key?.trim()) {
    throw new Error(
      'کلید Gemini تنظیم نشده. فایل .env بسازید و VITE_GEMINI_API_KEY را از https://aistudio.google.com/apikey قرار دهید.'
    );
  }
  return key.trim();
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
    throw new Error(textPart?.trim() || 'Gemini تصویری برنگرداند. عکس واضح‌تری امتحان کنید.');
  }

  const best = imageParts.reduce((largest, part) =>
    part.inlineData!.data.length > largest.inlineData!.data.length ? part : largest
  );

  const { mimeType, data } = best.inlineData!;
  return `data:${mimeType};base64,${data}`;
}

export interface ProcessProductPhotoParams {
  file: File;
  productName: string;
  mode: ProcessingMode;
  resize?: Partial<ResizeOptions>;
  signal?: AbortSignal;
}

export interface ProcessProductPhotoResult {
  rawDataUrl: string;
  finalDataUrl: string;
  productName: string;
}

function promptForMode(mode: ProcessingMode, productName: string): string {
  return mode === 'staged'
    ? buildProductStagedPrompt(productName)
    : buildProductStudioPrompt(productName);
}

function aspectRatioForMode(
  mode: ProcessingMode,
  width: number,
  height: number
): string {
  if (mode === 'catalog') {
    return closestAspectRatio(width, height);
  }
  const ratio = width / height;
  if (ratio >= 1.2) return '16:9';
  if (ratio <= 0.85) return '4:5';
  return '4:3';
}

export async function processProductPhoto({
  file,
  productName,
  mode,
  resize,
  signal,
}: ProcessProductPhotoParams): Promise<ProcessProductPhotoResult> {
  const apiKey = getApiKey();
  const preview = URL.createObjectURL(file);
  let aspectRatio = mode === 'staged' ? '16:9' : '1:1';
  try {
    const dims = await loadImageDimensions(preview);
    aspectRatio = aspectRatioForMode(mode, dims.width, dims.height);
  } finally {
    URL.revokeObjectURL(preview);
  }

  const sourceImage: InlineImagePayload = await fileToInlineImage(file);
  const prompt = promptForMode(mode, productName);

  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: sourceImage },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: { aspectRatio },
    },
  };

  const response = await fetch(`${API_BASE}/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
    signal,
  });

  const json = (await response.json()) as GeminiResponse;

  if (!response.ok) {
    throw new Error(json.error?.message ?? `خطای Gemini (${response.status})`);
  }

  const rawDataUrl = extractGeneratedImageDataUrl(json);

  const finalDataUrl =
    mode === 'catalog'
      ? await resizeToCatalogSquare(rawDataUrl, resize)
      : await resizeStagedOutput(rawDataUrl, {
          maxSize: resize?.size ?? 2048,
          format: resize?.format ?? 'jpeg',
          jpegQuality: resize?.jpegQuality ?? 0.95,
        });

  return { rawDataUrl, finalDataUrl, productName };
}
