import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Mic, ArrowUp, X, MessageCircle, Square, ImageIcon } from 'lucide-react';
import { cn } from '../lib/cn';
import { slidePanel, slideSheet } from '../lib/motion';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { PANEL_Z } from '../lib/panelLayers';
import { buildAIContextLabel, type AIContext } from '../types/ai';
import type { ChatMessage } from '../types/chat';
import type { Product } from '../data/scenes';
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
import AIProductSuggestions from './AIProductSuggestions';

const PRODUCTS_TAG_DISPLAY = /\[PRODUCTS:[^\]]*\]\s*$/im;

function stripProductsTag(text: string): string {
  return text.replace(PRODUCTS_TAG_DISPLAY, '').trim();
}

export interface AIAssistantShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: AIContext;
  initialQuery?: string;
  onClearInitialQuery?: () => void;
  showCollapsed: boolean;
  placement: 'shop' | 'visualizer';
  onChatActiveChange?: (active: boolean) => void;
  onTryInRoom?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  onProductClick?: (product: Product) => void;
}

function getWelcomeMessage(ctx: AIContext): string {
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
      return `I see ${count} piece${count === 1 ? '' : 's'} in your room. Ask about placement, scale, or swaps before you generate.`;
    }
    return 'Upload or pick a room photo, then ask me what would work in your space.';
  }
  return 'Tell me the mood, room, or piece you have in mind — I’ll help you discover from our collection.';
}

function getSuggestionChips(ctx: AIContext): string[] {
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

interface ChatBodyProps {
  context: AIContext;
  layout: 'sheet' | 'sidebar';
  messages: ChatMessage[];
  isTyping: boolean;
  isStreaming: boolean;
  isListening: boolean;
  voiceSupported: boolean;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: (e?: React.FormEvent) => void;
  onSuggestion: (text: string) => void;
  onToggleVoice: () => void;
  onClose: () => void;
  onTryInRoom?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  onProductClick?: (product: Product) => void;
  attachedImageUrl: string | null;
  onRemoveAttachment: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

function ChatBody({
  context,
  layout,
  messages,
  isTyping,
  isStreaming,
  isListening,
  voiceSupported,
  inputValue,
  onInputChange,
  onSend,
  onSuggestion,
  onToggleVoice,
  onClose,
  onTryInRoom,
  onAddToCart,
  onProductClick,
  attachedImageUrl,
  onRemoveAttachment,
  inputRef,
  messagesEndRef,
}: ChatBodyProps) {
  const chips = useMemo(() => getSuggestionChips(context), [context]);
  const contextLabel = buildAIContextLabel(context);
  const showSuggestions = messages.length <= 1 && !isTyping && !messages.some((m) => m.role === 'assistant' && !m.content);

  return (
    <>
      <header
        className={cn(
          'flex shrink-0 items-center justify-between border-b border-ink/8',
          layout === 'sheet' ? 'px-4 py-3' : 'px-5 py-4'
        )}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-bronze/12">
            <Sparkles className="h-4 w-4 text-bronze" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-ink-faint">
              Ask AI
            </p>
            <p className="truncate text-sm font-medium text-ink">{contextLabel}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-muted transition-all hover:bg-parchment active:scale-95"
          aria-label="Close assistant"
        >
          <X className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          className={cn(
            'flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain no-scrollbar',
            layout === 'sheet' ? 'px-4 py-4' : 'px-5 py-5'
          )}
        >
          <AnimatePresence initial={false}>
            {messages.map((msg) => {
              const displayText =
                msg.role === 'assistant' ? stripProductsTag(msg.content) : msg.content;
              const products = msg.products ?? [];

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    'flex max-w-[92%] flex-col',
                    msg.role === 'user' ? 'self-end' : 'self-start'
                  )}
                >
                  <div
                    className={cn(
                      'relative rounded-3xl p-3.5 text-sm leading-relaxed shadow-sm',
                      msg.role === 'user'
                        ? 'rounded-br-md bg-ink text-cream'
                        : cn(
                            'glass-strong rounded-bl-md text-ink',
                            msg.error && 'border border-red-200/80 bg-red-50/90 text-red-900'
                          )
                    )}
                  >
                    {msg.role === 'assistant' && !msg.error && (
                      <div className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-bronze shadow-sm">
                        <Sparkles className="h-3 w-3 text-cream" />
                      </div>
                    )}
                    {msg.role === 'user' && msg.imageUrl && (
                      <img
                        src={msg.imageUrl}
                        alt="Attached room"
                        className="mb-2 max-h-36 w-full rounded-2xl object-cover"
                      />
                    )}
                    <span className="whitespace-pre-wrap">{displayText}</span>
                  </div>

                  {msg.role === 'assistant' && products.length > 0 && onTryInRoom && onAddToCart && (
                    <AIProductSuggestions
                      products={products}
                      onTryInRoom={onTryInRoom}
                      onAddToCart={onAddToCart}
                      onProductClick={onProductClick}
                    />
                  )}
                </motion.div>
              );
            })}
            {isTyping && !messages.some((m) => m.role === 'assistant' && m.content === '') && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-strong relative max-w-[85%] self-start rounded-3xl rounded-bl-md p-4 shadow-sm"
              >
                <div className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-bronze shadow-sm">
                  <Sparkles className="h-3 w-3 text-cream" />
                </div>
                <div className="flex h-4 items-center gap-1.5 px-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink/40 [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink/40 [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink/40 [animation-delay:300ms]" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} className="h-px shrink-0" />
        </div>

        {showSuggestions && (
          <div
            className={cn(
              'flex shrink-0 flex-wrap gap-2 border-t border-ink/6',
              layout === 'sheet' ? 'px-4 py-3' : 'px-5 py-3'
            )}
          >
            {chips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => onSuggestion(chip)}
                className="rounded-full border border-ink/10 bg-parchment/80 px-3 py-1.5 text-left text-xs font-medium text-ink-muted transition-all hover:border-ink/16 hover:bg-parchment hover:text-ink active:scale-[0.98]"
              >
                {chip}
              </button>
            ))}
          </div>
        )}
      </div>

      <footer
        className={cn(
          'shrink-0 border-t border-ink/8 bg-cream/95 backdrop-blur-md',
          layout === 'sheet'
            ? 'p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]'
            : 'px-5 py-4'
        )}
      >
        {attachedImageUrl && (
          <div
            className={cn(
              'mb-2 flex items-center gap-2',
              layout === 'sheet' ? 'px-0' : 'px-0'
            )}
          >
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl ring-1 ring-ink/10">
              <img
                src={attachedImageUrl}
                alt="Staged room preview"
                className="h-full w-full object-cover"
              />
              <span className="absolute bottom-0.5 left-0.5 flex items-center gap-0.5 rounded-md bg-ink/70 px-1 py-0.5 text-[9px] font-medium text-cream">
                <ImageIcon className="h-2.5 w-2.5" />
                Room
              </span>
            </div>
            <p className="min-w-0 flex-1 text-xs text-ink-muted">
              Staged room attached — your message will include this image.
            </p>
            <button
              type="button"
              onClick={onRemoveAttachment}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink"
              aria-label="Remove attached room image"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <form
          onSubmit={onSend}
          className={cn(
            'flex items-center gap-2 rounded-full border py-1.5 pl-4 pr-1.5 transition-colors',
            isListening
              ? 'border-bronze/40 bg-bronze/8'
              : 'border-ink/10 bg-parchment/60 focus-within:border-bronze/25 focus-within:bg-parchment'
          )}
        >
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder={
              isListening ? 'Listening…' : 'Ask about style, fit, or pairing…'
            }
            className="h-10 min-w-0 flex-1 border-none bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
          />
          {voiceSupported && (
            <button
              type="button"
              onClick={onToggleVoice}
              className={cn(
                'rounded-full p-2 transition-colors',
                isListening
                  ? 'bg-bronze text-cream'
                  : 'text-ink-muted hover:bg-ink/5 hover:text-ink'
              )}
              aria-label={isListening ? 'Stop voice input' : 'Voice input'}
            >
              {isListening ? (
                <Square className="h-5 w-5" fill="currentColor" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </button>
          )}
          <button
            type="submit"
            disabled={!inputValue.trim() || isTyping || isStreaming}
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bronze text-cream shadow-sm transition-all',
              inputValue.trim() && !isTyping && !isStreaming
                ? 'hover:bg-bronze/90 active:scale-95'
                : 'opacity-40'
            )}
            aria-label="Send message"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </form>
      </footer>
    </>
  );
}

export function AIAssistantTrigger({
  onClick,
  variant = 'light',
  className,
  label = 'AI',
}: {
  onClick: () => void;
  variant?: 'light' | 'dark';
  className?: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-all active:scale-95',
        variant === 'dark'
          ? 'glass-dark text-cream/90 hover:bg-white/10'
          : 'bg-ink/5 text-ink hover:bg-ink/10',
        className
      )}
      aria-label="Open AI designer"
    >
      <MessageCircle className="h-4 w-4 text-bronze" strokeWidth={1.75} />
      <span className="hidden min-[380px]:inline">{label}</span>
    </button>
  );
}

export default function AIAssistantShell({
  open,
  onOpenChange,
  context,
  initialQuery,
  onClearInitialQuery,
  showCollapsed,
  placement,
  onChatActiveChange,
  onTryInRoom,
  onAddToCart,
  onProductClick,
}: AIAssistantShellProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
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

  const chatActive =
    messages.some((m) => m.role === 'user') || isTyping || Boolean(streamingId);
  const panelZ =
    placement === 'visualizer' && !isDesktop
      ? PANEL_Z.aiVisualizerExpanded
      : PANEL_Z.aiPanel;
  const backdropZ =
    placement === 'visualizer' && !isDesktop
      ? PANEL_Z.aiVisualizerExpanded - 1
      : PANEL_Z.aiBackdrop;

  const systemPrompt = useMemo(() => buildSystemPrompt(context), [context]);

  useEffect(() => {
    const notifyHero = placement === 'shop' && chatActive;
    onChatActiveChange?.(notifyHero);
    return () => onChatActiveChange?.(false);
  }, [chatActive, onChatActiveChange, placement]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 120);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      stopSpeechRef.current?.();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, streamingId, open]);

  const contextKey = `${context.surface}:${context.product?.id ?? ''}:${context.stagedProducts?.length ?? 0}:${context.categoryId ?? ''}:${context.visualizerStep ?? ''}:${context.roomImageUrl ? 'room' : ''}`;

  useEffect(() => {
    if (context.surface === 'visualizer' && context.roomImageUrl) {
      setAttachedImageUrl(context.roomImageUrl);
    } else if (context.surface !== 'visualizer') {
      setAttachedImageUrl(null);
    }
  }, [context.surface, context.roomImageUrl]);

  useEffect(() => {
    if (!open) return;
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
  }, [open, context, contextKey, initialQuery, messages.length]);

  const finalizeAssistantMessage = useCallback(
    (messageId: string, rawContent: string, isError = false) => {
      const { text, productIds } = parseAssistantContent(rawContent);
      const products = resolveProductsByIds(productIds);

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
    []
  );

  const streamAssistantReply = useCallback(
    (_userText: string, historyBefore: ChatMessage[]) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const assistantId = `a-${Date.now()}`;
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
          content: m.role === 'assistant' ? stripProductsTag(m.content) : m.content,
          imageDataUrl: m.role === 'user' ? m.imageDataUrl : undefined,
        }));

      let accumulated = '';

      void streamOpenRouterChat(
        systemPrompt,
        history,
        {
          onToken: (chunk) => {
            accumulated += chunk;
            const display = stripProductsTag(accumulated);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: display || accumulated } : m
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
    if (!initialQuery?.trim()) return;

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
  }, [initialQuery, onClearInitialQuery, streamAssistantReply, attachedImageUrl]);

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

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    void sendText(inputValue);
  };

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

  const handleClose = () => {
    abortRef.current?.abort();
    stopSpeechRef.current?.();
    setIsListening(false);
    onOpenChange(false);
  };

  const chatBodyProps = {
    context,
    messages,
    isTyping,
    isStreaming: Boolean(streamingId),
    isListening,
    voiceSupported,
    inputValue,
    onInputChange: setInputValue,
    onSend: handleSend,
    onSuggestion: (text: string) => void sendText(text),
    attachedImageUrl,
    onRemoveAttachment: () => setAttachedImageUrl(null),
    onToggleVoice: handleToggleVoice,
    onClose: handleClose,
    onTryInRoom,
    onAddToCart,
    onProductClick,
    inputRef,
    messagesEndRef,
  };

  return (
    <>
      <AnimatePresence>
        {showCollapsed && !open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className={cn(
              'pointer-events-none fixed z-[var(--ai-fab-z)] flex justify-center',
              placement === 'shop'
                ? 'inset-x-0 bottom-[max(1.25rem,env(safe-area-inset-bottom))]'
                : 'right-4 bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-auto w-auto max-w-none'
            )}
            style={{ '--ai-fab-z': PANEL_Z.aiCollapsed } as React.CSSProperties}
          >
            <button
              type="button"
              onClick={() => onOpenChange(true)}
              className={cn(
                'pointer-events-auto flex items-center gap-2.5 rounded-full glass-strong py-3 pl-4 pr-5 shadow-[0_8px_32px_rgba(28,26,23,0.14)] transition-colors hover:bg-parchment/90 active:scale-[0.98]',
                chatActive && 'ring-2 ring-bronze/25'
              )}
            >
              <Sparkles className="h-5 w-5 text-bronze" strokeWidth={1.75} />
              <span className="text-sm font-medium text-ink">Ask AI Designer</span>
              {chatActive && (
                <span
                  className="flex h-2 w-2 rounded-full bg-bronze"
                  aria-label="Conversation in progress"
                />
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className={cn(
                'fixed inset-0',
                isDesktop ? 'bg-ink/10' : 'bg-ink/35 backdrop-blur-sm'
              )}
              style={{ zIndex: backdropZ }}
              aria-hidden
            />

            {isDesktop ? (
              <motion.aside
                variants={slidePanel}
                initial="hidden"
                animate="visible"
                exit="exit"
                role="dialog"
                aria-modal="true"
                aria-label="AI designer assistant"
                className="fixed top-0 right-0 bottom-0 flex w-full max-w-[400px] flex-col overflow-hidden glass-panel-solid shadow-[-12px_0_48px_rgba(28,26,23,0.10)]"
                style={{ zIndex: panelZ }}
              >
                <ChatBody layout="sidebar" {...chatBodyProps} />
              </motion.aside>
            ) : (
              <motion.div
                variants={slideSheet}
                initial="hidden"
                animate="visible"
                exit="exit"
                role="dialog"
                aria-modal="true"
                aria-label="AI designer assistant"
                className="fixed inset-x-0 bottom-0 flex max-h-[min(92dvh,720px)] flex-col rounded-t-[1.75rem] glass-panel shadow-[0_-8px_40px_rgba(28,26,23,0.12)]"
                style={{ zIndex: panelZ }}
              >
                <div className="flex shrink-0 justify-center pt-3 pb-1">
                  <span className="h-1 w-8 rounded-full bg-ink/20" aria-hidden />
                </div>
                <ChatBody layout="sheet" {...chatBodyProps} />
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>
    </>
  );
}
