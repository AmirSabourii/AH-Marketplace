import {
  closestAspectRatio,
  fileToInlineImage,
  loadImageDimensions,
  urlToInlineImage,
  type InlineImagePayload,
} from './imageUtils';
import { buildRoomStagingPrompt, type StagingProductContext } from './stagingPrompt';
import { getGeminiApiKey } from './apiKey';

const MODEL = 'gemini-3.1-flash-image-preview';
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
    (part.inlineData!.data.length > largest.inlineData!.data.length ? part : largest)
  );

  const { mimeType, data } = best.inlineData!;
  return `data:${mimeType};base64,${data}`;
}

export async function generateRoomVisualization({
  roomFile,
  products,
  signal,
}: GenerateRoomVisualizationParams): Promise<string> {
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

  const stagingProducts: StagingProductContext[] = products.map((p, i) => ({
    name: p.name,
    description: p.description,
    variantName: p.variantName,
    imageIndex: i + 2,
  }));

  const prompt = buildRoomStagingPrompt(stagingProducts);

  const parts: Array<{ text: string } | { inlineData: InlineImagePayload }> = [
    { text: prompt },
    { inlineData: roomImage },
    ...productImages.map((img) => ({ inlineData: img })),
  ];

  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: {
        aspectRatio,
      },
    },
  };

  const response = await fetch(
    `${API_BASE}/models/${MODEL}:generateContent`,
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

  const json = (await response.json()) as GeminiResponse;

  if (!response.ok) {
    throw new Error(json.error?.message ?? `Gemini API error (${response.status})`);
  }

  return extractGeneratedImageDataUrl(json);
}
