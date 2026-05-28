import { getOpenRouterApiKey, getOpenRouterModel } from './apiKey';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
  /** Base64 data URL — sent as vision input on user turns */
  imageDataUrl?: string;
}

type OpenRouterMessage =
  | { role: 'system'; content: string }
  | { role: 'assistant'; content: string }
  | {
      role: 'user';
      content:
        | string
        | Array<
            | { type: 'text'; text: string }
            | { type: 'image_url'; image_url: { url: string } }
          >;
    };

function toOpenRouterMessage(turn: ChatTurn): OpenRouterMessage {
  if (turn.role === 'assistant') {
    return { role: 'assistant', content: turn.content };
  }

  if (turn.imageDataUrl) {
    return {
      role: 'user',
      content: [
        { type: 'text', text: turn.content },
        { type: 'image_url', image_url: { url: turn.imageDataUrl } },
      ],
    };
  }

  return { role: 'user', content: turn.content };
}

interface StreamCallbacks {
  onToken: (chunk: string) => void;
  onDone: () => void;
  onError: (message: string) => void;
}

function extractStreamText(
  json: Record<string, unknown>
): string | null {
  const choices = json.choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;

  const choice = choices[0] as Record<string, unknown>;
  const delta = choice.delta as Record<string, unknown> | undefined;
  const message = choice.message as Record<string, unknown> | undefined;

  if (typeof delta?.content === 'string') return delta.content;
  if (typeof delta?.text === 'string') return delta.text;
  if (typeof message?.content === 'string') return message.content;

  return null;
}

function parseSseDataPayload(data: string): string | null {
  if (data === '[DONE]') return null;
  try {
    const json = JSON.parse(data) as Record<string, unknown>;
    const text = extractStreamText(json);
    return text && text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

function dispatchSseBlock(block: string, callbacks: StreamCallbacks): void {
  for (const line of block.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(':')) continue;
    if (!trimmed.startsWith('data:')) continue;

    const data = trimmed.slice(5).trim();
    const token = parseSseDataPayload(data);
    if (token) callbacks.onToken(token);
  }
}

export async function streamOpenRouterChat(
  systemPrompt: string,
  history: ChatTurn[],
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    callbacks.onError(
      'OpenRouter API key is missing. Add VITE_OPENROUTER_API_KEY to your .env file.'
    );
    return;
  }

  const messages: OpenRouterMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history.map(toOpenRouterMessage),
  ];

  let response: Response;
  try {
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : '',
        'X-Title': 'TheHome ASK AI',
      },
      body: JSON.stringify({
        model: getOpenRouterModel(),
        messages,
        stream: true,
        temperature: 0.65,
        max_tokens: 2048,
      }),
      signal,
    });
  } catch (err) {
    if (signal?.aborted) return;
    callbacks.onError(err instanceof Error ? err.message : 'Network error');
    return;
  }

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      detail = body.error?.message ?? detail;
    } catch {
      /* ignore */
    }
    callbacks.onError(detail || `Request failed (${response.status})`);
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    callbacks.onError('No response stream');
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (signal?.aborted) {
        await reader.cancel();
        return;
      }

      buffer += decoder.decode(value, { stream: true });

      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        if (block.trim()) dispatchSseBlock(block, callbacks);
        boundary = buffer.indexOf('\n\n');
      }
    }

    if (buffer.trim()) {
      dispatchSseBlock(buffer, callbacks);
    }

    callbacks.onDone();
  } catch (err) {
    if (!signal?.aborted) {
      callbacks.onError(err instanceof Error ? err.message : 'Stream error');
    }
  }
}
