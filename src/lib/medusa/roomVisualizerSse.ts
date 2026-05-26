import { getGeminiApiKey } from '../gemini/apiKey';
import { clientAnalyzeRoom, clientStageRoom } from '../roomVisualizer/clientFallback';
import type { RoomStageMode } from '../roomVisualizer/stageRequest';
import { getMedusaBackendUrl, getMedusaPublishableKey } from './config';

export type { RoomStageMode };

function hasGeminiFallback(): boolean {
  try {
    getGeminiApiKey();
    return true;
  } catch {
    return false;
  }
}

function missingPublishableKeyError(): Error {
  const hint = import.meta.env.DEV
    ? 'Add VITE_MEDUSA_PUBLISHABLE_KEY to .env in the project root (from your Medusa backend: npm run publishable-key), then restart Vite. Or keep VITE_GEMINI_API_KEY set to use direct Gemini staging without Medusa.'
    : 'Set VITE_MEDUSA_PUBLISHABLE_KEY in your environment.';
  return new Error(`Medusa publishable API key is missing. ${hint}`);
}

export type SseProgress = {
  phase?: string;
  message?: string;
  provider?: string;
  index?: number;
  total?: number;
};

type SseHandlers<TComplete> = {
  onProgress?: (data: SseProgress) => void;
  signal?: AbortSignal;
  onComplete: (data: TComplete) => void;
  onError?: (message: string) => void;
};

async function consumeSsePost<TComplete>(
  path: string,
  body: unknown,
  handlers: SseHandlers<TComplete>
): Promise<TComplete> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
  };
  const publishableKey = getMedusaPublishableKey();
  if (!publishableKey) {
    throw missingPublishableKeyError();
  }
  headers['x-publishable-api-key'] = publishableKey;

  const res = await fetch(`${getMedusaBackendUrl()}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: handlers.signal,
  });

  if (!res.ok) {
    const contentType = res.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const json = (await res.json()) as { error?: string; message?: string };
      throw new Error(
        json.error || json.message || `Request failed (${res.status})`
      );
    }
    if (res.status === 413) {
      throw new Error(
        'Image payload is too large for the server. Try a smaller photo.'
      );
    }
    const text = (await res.text()).trim();
    if (/entity\.too\.large|payload too large/i.test(text)) {
      throw new Error(
        'Image payload is too large for the server. Try a smaller photo.'
      );
    }
    if (res.status === 504) {
      throw new Error(
        'Room visualizer timed out (504). Start Docker, run npm run infra:up, then npm run backend:dev. ' +
          'Set GEMINI_API_KEY in apps/backend/.env and restart Vite (npm run marketplace:dev).'
      );
    }
    throw new Error(
      text
        ? `Request failed (${res.status}): ${text.slice(0, 200)}`
        : `Request failed (${res.status})`
    );
  }

  if (!res.body) {
    throw new Error('No response stream from server');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let completePayload: TComplete | null = null;

  const dispatchBlock = (block: string) => {
    const lines = block.split('\n');
    let event = 'message';
    const dataLines: string[] = [];
    for (const line of lines) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
    }
    if (!dataLines.length) return;
    const raw = dataLines.join('\n');
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return;
    }

    if (event === 'progress') {
      handlers.onProgress?.(parsed as SseProgress);
      return;
    }
    if (event === 'error') {
      const msg =
        typeof parsed.message === 'string'
          ? parsed.message
          : 'Room visualizer failed';
      handlers.onError?.(msg);
      throw new Error(msg);
    }
    if (event === 'complete') {
      completePayload = parsed as TComplete;
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';
    for (const part of parts) {
      if (part.trim()) dispatchBlock(part.trim());
    }
    if (completePayload !== null) break;
  }

  if (buffer.trim()) dispatchBlock(buffer.trim());

  if (completePayload === null) {
    throw new Error('Stream ended without a result');
  }

  return completePayload;
}

export type StageComplete = {
  imageUrl: string;
  provider?: string;
};

import type { RoomSceneAnalysis } from '../roomAnalysis/types';

export type AnalyzeComplete = {
  analysis: RoomSceneAnalysis;
};

export async function streamRoomStage(
  body: {
    roomDataUri: string;
    /** Medusa product ids — backend resolves images for Gemini staging */
    productIds?: string[];
    productImageUrls?: string[];
    productTitles?: string[];
    productDescriptions?: string[];
    mode?: RoomStageMode;
    removeProductTitle?: string;
  },
  options: {
    onProgress?: (p: SseProgress) => void;
    signal?: AbortSignal;
  }
): Promise<StageComplete> {
  const mode = body.mode ?? 'compose';
  const useClient =
    !getMedusaPublishableKey() ||
    mode === 'rearrange' ||
    mode === 'curate';

  if (useClient) {
    if (!hasGeminiFallback()) throw missingPublishableKeyError();
    return clientStageRoom(body, options);
  }

  return consumeSsePost<StageComplete>(
    '/store/room-visualizer/stage',
    body,
    {
      onProgress: options.onProgress,
      signal: options.signal,
      onComplete: (data) => data,
    }
  );
}

export async function streamRoomAnalyze(
  roomDataUri: string,
  options: {
    onProgress?: (p: SseProgress) => void;
    signal?: AbortSignal;
  }
): Promise<AnalyzeComplete['analysis']> {
  if (!getMedusaPublishableKey()) {
    if (!hasGeminiFallback()) throw missingPublishableKeyError();
    return clientAnalyzeRoom(roomDataUri, options);
  }

  const result = await consumeSsePost<AnalyzeComplete>(
    '/store/room-visualizer/analyze',
    { roomDataUri },
    {
      onProgress: options.onProgress,
      signal: options.signal,
      onComplete: (data) => data,
    }
  );
  return result.analysis;
}
