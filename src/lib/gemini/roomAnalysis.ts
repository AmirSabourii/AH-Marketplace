import {
  normalizeRoomAnalysis,
  parseGeminiAnalysisJson,
} from '../roomAnalysis/normalize';
import type { RoomSceneAnalysis } from '../roomAnalysis/types';
import { getGeminiApiKey } from './apiKey';
import { fileToInlineImage, loadImageDimensions, type InlineImagePayload } from './imageUtils';
import { buildRoomAnalysisPrompt } from './roomAnalysisPrompt';

const ANALYSIS_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'] as const;
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

interface GeminiTextResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  error?: { message?: string };
}

export interface AnalyzeRoomSceneParams {
  roomFile: File;
  signal?: AbortSignal;
}

async function generateStructuredJson(
  parts: Array<{ text: string } | { inlineData: InlineImagePayload }>,
  signal?: AbortSignal
): Promise<string> {
  const apiKey = getGeminiApiKey();
  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 2048,
      responseMimeType: 'text/plain',
    },
  };

  let lastError: Error | null = null;

  for (const model of ANALYSIS_MODELS) {
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
      const textParts = json.candidates?.[0]?.content?.parts ?? [];
      const text = textParts
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

  throw lastError ?? new Error('Room analysis failed');
}

export async function analyzeRoomScene({
  roomFile,
  signal,
}: AnalyzeRoomSceneParams): Promise<RoomSceneAnalysis> {
  const preview = URL.createObjectURL(roomFile);
  let imageWidth = 1;
  let imageHeight = 1;
  try {
    const dims = await loadImageDimensions(preview);
    imageWidth = dims.width;
    imageHeight = dims.height;
  } finally {
    URL.revokeObjectURL(preview);
  }

  const roomImage = await fileToInlineImage(roomFile);
  const prompt = buildRoomAnalysisPrompt();

  const text = await generateStructuredJson(
    [{ text: prompt }, { inlineData: roomImage }],
    signal
  );

  const raw = parseGeminiAnalysisJson(text);
  const analysis = normalizeRoomAnalysis(raw, imageWidth, imageHeight);

  if (analysis.elements.length === 0) {
    throw new Error(
      'Could not detect furniture in this photo. Try a wider shot with visible seating or tables.'
    );
  }

  return analysis;
}
