import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { AIContext } from '../types/ai';
import type { ChatMessage } from '../types/chat';
import { buildSystemPrompt } from '../lib/ai/systemPrompt';
import { parseAssistantContent } from '../lib/ai/parseProducts';
import { resolveProductsByIds } from '../lib/ai/catalog';
import { streamOpenRouterChat, type ChatTurn } from '../lib/openrouter/chat';
import { prepareImageForApi } from '../lib/openrouter/imageAttachment';
import { hasOpenRouterConfig } from '../lib/openrouter/apiKey';
import {
  isSpeechRecognitionSupported,
  startSpeechListen,
} from '../lib/openrouter/speech';

const PRODUCTS_TAG_COMPLETE = /\[PRODUCTS:\s*[^\]]+\]\s*$/im;
const PRODUCTS_TAG_PARTIAL = /\[PRODUCTS:[^\]]*$/i;

/** Strip product ids tag from streamed text (complete or in-progress tag). */
export function stripProductsTagForDisplay(text: string): string {
  return text
    .replace(PRODUCTS_TAG_COMPLETE, '')
    .replace(PRODUCTS_TAG_PARTIAL, '')
    .trimEnd();
}

export function getWelcomeMessage(ctx: AIContext): string {
  if (ctx.surface === 'product' && ctx.product) {
    return `You're viewing the ${ctx.product.name}. I can help with fit, finishes, and what pairs well with it.`;
  }
  if (ctx.surface === 'visualizer') {
    const count = ctx.stagedProducts?.length ?? 0;
    if (ctx.visualizerStep === 'result') {
      return count > 0
        ? `Your staged room looks great with ${count} piece${count === 1 ? '' : 's'}. Want tweaks or alternatives?`
        : 'Your room is staged. Ask me to refine the layout or suggest complementary pieces.';
    }
    if (count > 0) {
      return `You have ${count} piece${count === 1 ? '' : 's'} selected. Ask about placement, scale, or what to change.`;
    }
    if (ctx.roomImageUrl) {
      return 'Your room photo is attached. Ask about layout, style, or which pieces to try.';
    }
    return 'Add a room photo to get tailored suggestions.';
  }
  return 'Tell me the mood, room, or piece you have in mind — I’ll help you discover from our collection.';
}

export function getSuggestionChips(ctx: AIContext): string[] {
  if (ctx.surface === 'product' && ctx.product) {
    return [
      'Will this fit a small living room?',
      'What rug pairs with this?',
      'Show similar styles',
    ];
  }
  if (ctx.surface === 'visualizer') {
    return [
      'Does this layout feel balanced?',
      'Suggest a warmer palette',
      'What else should I add?',
    ];
  }
  return [
    'Modern sofa for a bright loft',
    'Dining set under $800',
    'Cozy bedroom refresh',
  ];
}

export interface UseAIAssistantChatOptions {
  context: AIContext;
  active: boolean;
  initialQuery?: string;
  onClearInitialQuery?: () => void;
}

export function useAIAssistantChat({
  context,
  active,
  initialQuery,
  onClearInitialQuery,
}: UseAIAssistantChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [attachedImageUrl, setAttachedImageUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const contextKeyRef = useRef<string>('');
  const abortRef = useRef<AbortController | null>(null);
  const stopSpeechRef = useRef<(() => void) | null>(null);
  const voiceSupported = isSpeechRecognitionSupported();

  const systemPrompt = useMemo(() => buildSystemPrompt(context), [context]);

  const contextKey = `${context.surface}:${context.product?.id ?? ''}:${context.stagedProducts?.length ?? 0}:${context.categoryId ?? ''}:${context.visualizerStep ?? ''}:${context.roomImageUrl ? 'room' : ''}`;

  const chatActive =
    messages.some((m) => m.role === 'user') || isTyping || Boolean(streamingId);

  useEffect(() => {
    if (!active) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 120);
    return () => window.clearTimeout(t);
  }, [active]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      stopSpeechRef.current?.();
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, streamingId, active]);

  useEffect(() => {
    if (context.surface !== 'visualizer') {
      setAttachedImageUrl(null);
      return;
    }
    if (context.roomImageUrl) {
      setAttachedImageUrl(context.roomImageUrl);
    }
  }, [context.surface, context.roomImageUrl]);

  /** Re-attach latest room whenever the user opens the panel */
  useEffect(() => {
    if (!active || context.surface !== 'visualizer') return;
    if (context.roomImageUrl) {
      setAttachedImageUrl(context.roomImageUrl);
    }
  }, [active, context.surface, context.roomImageUrl]);

  useEffect(() => {
    if (!active) return;
    if (contextKeyRef.current === contextKey) return;
    contextKeyRef.current = contextKey;

    if (messages.length === 0 && !initialQuery) {
      setMessages([
        {
          id: `welcome-${Date.now()}`,
          role: 'assistant',
          content: getWelcomeMessage(context),
        },
      ]);
    }
  }, [active, context, contextKey, initialQuery, messages.length]);

  const finalizeAssistantMessage = useCallback(
    (messageId: string, rawContent: string, isError = false) => {
      const { text, productIds } = parseAssistantContent(rawContent);
      const products = resolveProductsByIds(productIds, context.catalog);

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                content: isError ? rawContent : text || rawContent,
                productIds: isError ? undefined : productIds,
                products: isError ? undefined : products,
                error: isError,
              }
            : m
        )
      );
      setIsTyping(false);
      setStreamingId(null);
    },
    [context.catalog]
  );

  const streamAssistantReply = useCallback(
    (_userText: string, historyBefore: ChatMessage[]) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const assistantId = `a-${Date.now()}`;
      setIsTyping(false);
      setStreamingId(assistantId);
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: 'assistant', content: '' },
      ]);

      if (!hasOpenRouterConfig()) {
        finalizeAssistantMessage(
          assistantId,
          'OpenRouter is not configured. Add VITE_OPENROUTER_API_KEY to your .env file and restart the dev server.',
          true
        );
        return;
      }

      const history: ChatTurn[] = historyBefore
        .filter((m) => m.id !== assistantId && !m.error)
        .map((m) => ({
          role: m.role,
          content:
            m.role === 'assistant'
              ? stripProductsTagForDisplay(m.content)
              : m.content,
          imageDataUrl: m.role === 'user' ? m.imageDataUrl : undefined,
        }));

      let accumulated = '';

      void streamOpenRouterChat(
        systemPrompt,
        history,
        {
          onToken: (chunk) => {
            accumulated += chunk;
            const display = stripProductsTagForDisplay(accumulated);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: display } : m
              )
            );
          },
          onDone: () => {
            finalizeAssistantMessage(assistantId, accumulated);
            abortRef.current = null;
          },
          onError: (message) => {
            finalizeAssistantMessage(assistantId, message, true);
            abortRef.current = null;
          },
        },
        controller.signal
      );
    },
    [systemPrompt, finalizeAssistantMessage]
  );

  useEffect(() => {
    if (!active || !initialQuery?.trim()) return;

    const query = initialQuery.trim();
    onClearInitialQuery?.();

    void (async () => {
      const displayImage = attachedImageUrl;
      let imageDataUrl: string | undefined;
      if (displayImage) {
        try {
          imageDataUrl = await prepareImageForApi(displayImage);
        } catch {
          imageDataUrl = undefined;
        }
      }

      setMessages((prev) => {
        const already = prev.some((m) => m.role === 'user' && m.content === query);
        if (already) return prev;
        const next: ChatMessage[] = [
          ...prev,
          {
            id: `u-${Date.now()}`,
            role: 'user',
            content: query,
            imageUrl: displayImage ?? undefined,
            imageDataUrl,
          },
        ];
        window.setTimeout(() => streamAssistantReply(query, next), 0);
        return next;
      });
    })();
  }, [
    active,
    initialQuery,
    onClearInitialQuery,
    streamAssistantReply,
    attachedImageUrl,
  ]);

  const sendText = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isTyping || streamingId) return;

      const displayImage = attachedImageUrl;
      let imageDataUrl: string | undefined;
      if (displayImage) {
        try {
          imageDataUrl = await prepareImageForApi(displayImage);
        } catch (err) {
          const msg =
            err instanceof Error ? err.message : 'Could not attach the room image.';
          setMessages((prev) => [
            ...prev,
            { id: `err-${Date.now()}`, role: 'assistant', content: msg, error: true },
          ]);
          return;
        }
      }

      setIsTyping(true);
      setMessages((prev) => {
        const next: ChatMessage[] = [
          ...prev,
          {
            id: `u-${Date.now()}`,
            role: 'user',
            content: trimmed,
            imageUrl: displayImage ?? undefined,
            imageDataUrl,
          },
        ];
        streamAssistantReply(trimmed, next);
        return next;
      });
      setInputValue('');
      stopSpeechRef.current?.();
      setIsListening(false);
    },
    [isTyping, streamingId, streamAssistantReply, attachedImageUrl]
  );

  const handleSend = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      void sendText(inputValue);
    },
    [inputValue, sendText]
  );

  const handleToggleVoice = useCallback(() => {
    if (isListening) {
      stopSpeechRef.current?.();
      setIsListening(false);
      return;
    }

    stopSpeechRef.current?.();
    setIsListening(true);

    stopSpeechRef.current = startSpeechListen({
      lang: navigator.language || 'en-US',
      onResult: (transcript) => setInputValue(transcript),
      onError: (msg) => {
        setInputValue((v) => v || '');
        if (msg) {
          setMessages((prev) => [
            ...prev,
            { id: `err-${Date.now()}`, role: 'assistant', content: msg, error: true },
          ]);
        }
      },
      onEnd: () => setIsListening(false),
    });
  }, [isListening]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    stopSpeechRef.current?.();
    setIsListening(false);
  }, []);

  const streamingMessage = streamingId
    ? messages.find((m) => m.id === streamingId)
    : undefined;
  const isWaitingForStream = Boolean(
    streamingId && !streamingMessage?.content?.trim()
  );

  return {
    context,
    messages,
    isTyping,
    isStreaming: Boolean(streamingId),
    isWaitingForStream,
    streamingMessageId: streamingId,
    isListening,
    voiceSupported,
    inputValue,
    setInputValue,
    handleSend,
    sendText,
    handleToggleVoice,
    attachedImageUrl,
    setAttachedImageUrl,
    inputRef,
    messagesEndRef,
    chatActive,
    stop,
    suggestionChips: getSuggestionChips(context),
  };
}

export type AIAssistantChatReturn = ReturnType<typeof useAIAssistantChat>;
