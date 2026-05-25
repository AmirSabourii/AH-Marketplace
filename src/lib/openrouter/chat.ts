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

function parseSseLine(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith('data:')) return null;
  const data = trimmed.slice(5).trim();
  if (data === '[DONE]') return null;
  try {
    const json = JSON.parse(data) as {
      choices?: { delta?: { content?: string } }[];
    };
    return json.choices?.[0]?.delta?.content ?? null;
  } catch {
    return null;
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
        max_tokens: 1024,
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
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const token = parseSseLine(line);
        if (token) callbacks.onToken(token);
      }
    }

    if (buffer.trim()) {
      const token = parseSseLine(buffer);
      if (token) callbacks.onToken(token);
    }

    callbacks.onDone();
  } catch (err) {
    if (!signal?.aborted) {
      callbacks.onError(err instanceof Error ? err.message : 'Stream error');
    }
  }
}
