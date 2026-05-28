import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowUp, Mic, Square, X } from 'lucide-react';
import type { Product } from '../data/scenes';
import { buildAIContextLabel } from '../types/ai';
import {
  stripProductsTagForDisplay,
  type AIAssistantChatReturn,
} from '../hooks/useAIAssistantChat';
import AIProductSuggestions from './AIProductSuggestions';
import { cn } from '../lib/cn';

export type AIChatLayout = 'sheet' | 'sidebar' | 'embedded';

export interface AIChatPanelProps extends AIAssistantChatReturn {
  layout: AIChatLayout;
  headerMode?: 'close' | 'back' | 'none';
  onHeaderAction?: () => void;
  onTryInRoom?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  onProductClick?: (product: Product) => void;
}

function TypingDots({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-1 py-1', className)} aria-label="Assistant is typing">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-bronze/70 [animation-delay:0ms]" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-bronze/70 [animation-delay:160ms]" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-bronze/70 [animation-delay:320ms]" />
    </div>
  );
}

function shouldShowTypingDots(opts: {
  isWaitingForStream?: boolean;
  isTyping: boolean;
  isStreaming: boolean;
}): boolean {
  if (opts.isWaitingForStream) return true;
  if (opts.isTyping && !opts.isStreaming) return true;
  return false;
}

/** Minimal chat UI for visualizer sidebar */
function EmbeddedChat({
  messages,
  isTyping,
  isStreaming,
  isWaitingForStream,
  streamingMessageId,
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
  suggestionChips,
  onTryInRoom,
  onAddToCart,
  onProductClick,
}: AIChatPanelProps) {
  const showTypingDots = shouldShowTypingDots({
    isWaitingForStream,
    isTyping,
    isStreaming,
  });
  const showSuggestions =
    messages.length <= 1 &&
    !isTyping &&
    !isStreaming &&
    !messages.some((m) => m.role === 'assistant' && !m.content);
  const canSend = Boolean(inputValue.trim()) && !isTyping && !isStreaming;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 py-5 no-scrollbar">
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const displayText =
              msg.role === 'assistant'
                ? stripProductsTagForDisplay(msg.content)
                : msg.content;
            const products = msg.products ?? [];
            const isUser = msg.role === 'user';
            const isStreamingBubble =
              msg.role === 'assistant' &&
              msg.id === streamingMessageId &&
              isStreaming;

            if (
              msg.role === 'assistant' &&
              !displayText &&
              msg.id === streamingMessageId
            ) {
              return null;
            }

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn('mb-5 max-w-[95%]', isUser ? 'ml-auto' : 'mr-auto')}
              >
                {isUser && msg.imageUrl && (
                  <div className="mb-2 overflow-hidden rounded-xl ring-1 ring-ink/10">
                    <img
                      src={msg.imageUrl}
                      alt=""
                      className="max-h-28 w-full object-cover"
                    />
                  </div>
                )}
                <div
                  className={cn(
                    'text-[13px] leading-[1.65]',
                    isUser
                      ? 'rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-cream'
                      : cn(
                          'text-ink',
                          msg.error && 'rounded-xl bg-red-50 px-3 py-2 text-red-900'
                        )
                  )}
                >
                  <span className="whitespace-pre-wrap">{displayText}</span>
                  {isStreamingBubble && displayText && (
                    <span
                      className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-bronze/60"
                      aria-hidden
                    />
                  )}
                </div>

                {msg.role === 'assistant' &&
                  products.length > 0 &&
                  onTryInRoom &&
                  onAddToCart && (
                    <div className="mt-3">
                      <AIProductSuggestions
                        products={products}
                        onTryInRoom={onTryInRoom}
                        onAddToCart={onAddToCart}
                        onProductClick={onProductClick}
                      />
                    </div>
                  )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {showTypingDots && (
          <div className="mb-4 mr-auto">
            <TypingDots />
          </div>
        )}
        <div ref={messagesEndRef} className="h-1 shrink-0" />
      </div>

      {showSuggestions && (
        <div className="shrink-0 border-t border-ink/[0.05] px-4 py-3">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {suggestionChips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => void sendText(chip)}
                className="shrink-0 rounded-full border border-ink/10 bg-cream px-3 py-1.5 text-[11px] font-medium text-ink-muted transition-colors hover:border-ink/18 hover:text-ink active:scale-[0.98]"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="shrink-0 border-t border-ink/[0.06] bg-cream px-3 py-3 pb-[max(0.65rem,env(safe-area-inset-bottom))]">
        <form
          onSubmit={handleSend}
          className={cn(
            'rounded-2xl border bg-parchment/40 transition-colors',
            isListening ? 'border-bronze/30' : 'border-ink/10 focus-within:border-ink/20'
          )}
        >
          {attachedImageUrl && (
            <div className="flex items-center gap-2 border-b border-ink/[0.06] px-2.5 py-2">
              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-ink/5">
                <img
                  src={attachedImageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-ink">Your room</p>
                <p className="text-[10px] text-ink-faint">Sent with your message</p>
              </div>
              <button
                type="button"
                onClick={() => setAttachedImageUrl(null)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-faint hover:bg-ink/5 hover:text-ink"
                aria-label="Remove room photo"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </div>
          )}

          <div className="flex items-end gap-1 p-1.5 pl-3">
            <input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={
                attachedImageUrl
                  ? 'Ask about this room…'
                  : isListening
                    ? 'Listening…'
                    : 'Message…'
              }
              className="min-h-[40px] flex-1 border-none bg-transparent py-2 text-[13px] text-ink outline-none placeholder:text-ink-faint"
            />
            {voiceSupported && (
              <button
                type="button"
                onClick={handleToggleVoice}
                className={cn(
                  'mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors',
                  isListening
                    ? 'bg-bronze text-cream'
                    : 'text-ink-faint hover:bg-ink/[0.04] hover:text-ink'
                )}
                aria-label={isListening ? 'Stop listening' : 'Voice input'}
              >
                {isListening ? (
                  <Square className="h-4 w-4" fill="currentColor" />
                ) : (
                  <Mic className="h-4 w-4" strokeWidth={1.5} />
                )}
              </button>
            )}
            <button
              type="submit"
              disabled={!canSend}
              className={cn(
                'mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink text-cream transition-all',
                canSend ? 'active:scale-95' : 'opacity-25'
              )}
              aria-label="Send"
            >
              <ArrowUp className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AIChatPanel(props: AIChatPanelProps) {
  const { layout, headerMode = 'close', onHeaderAction } = props;

  if (layout === 'embedded') {
    return <EmbeddedChat {...props} />;
  }

  const {
    context,
    messages,
    isTyping,
    isStreaming,
    isWaitingForStream,
    streamingMessageId,
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
    suggestionChips,
    onTryInRoom,
    onAddToCart,
    onProductClick,
  } = props;

  const contextLabel = buildAIContextLabel(context);
  const showTypingDots = shouldShowTypingDots({
    isWaitingForStream,
    isTyping,
    isStreaming,
  });
  const showSuggestions =
    messages.length <= 1 &&
    !isTyping &&
    !isStreaming &&
    !messages.some((m) => m.role === 'assistant' && !m.content);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {headerMode !== 'none' && (
        <header
          className={cn(
            'flex shrink-0 items-center justify-between border-b border-ink/8',
            layout === 'sheet' ? 'px-4 py-3' : 'px-4 py-3.5 sm:px-5'
          )}
        >
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-faint">
              Assistant
            </p>
            <p className="truncate text-sm font-medium text-ink">{contextLabel}</p>
          </div>
          {onHeaderAction && (
            <button
              type="button"
              onClick={onHeaderAction}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-muted transition-all hover:bg-parchment active:scale-95"
              aria-label={headerMode === 'back' ? 'Back' : 'Close'}
            >
              {headerMode === 'back' ? (
                <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
              ) : (
                <X className="h-4 w-4" strokeWidth={1.75} />
              )}
            </button>
          )}
        </header>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          className={cn(
            'flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain no-scrollbar',
            layout === 'sheet' ? 'px-4 py-4' : 'px-4 py-4 sm:px-5 sm:py-5'
          )}
        >
          <AnimatePresence initial={false}>
            {messages.map((msg) => {
              const displayText =
                msg.role === 'assistant'
                  ? stripProductsTagForDisplay(msg.content)
                  : msg.content;
              const products = msg.products ?? [];
              const isStreamingBubble =
                msg.role === 'assistant' &&
                msg.id === streamingMessageId &&
                isStreaming;

              if (
                msg.role === 'assistant' &&
                !displayText &&
                msg.id === streamingMessageId
              ) {
                return null;
              }

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'flex max-w-[92%] flex-col',
                    msg.role === 'user' ? 'self-end' : 'self-start'
                  )}
                >
                  <div
                    className={cn(
                      'rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                      msg.role === 'user'
                        ? 'bg-ink text-cream'
                        : cn(
                            'bg-parchment/80 text-ink',
                            msg.error && 'border border-red-200/80 bg-red-50 text-red-900'
                          )
                    )}
                  >
                    {msg.role === 'user' && msg.imageUrl && (
                      <img
                        src={msg.imageUrl}
                        alt=""
                        className="mb-2 max-h-32 w-full rounded-xl object-cover"
                      />
                    )}
                    <span className="whitespace-pre-wrap">{displayText}</span>
                    {isStreamingBubble && displayText && (
                      <span
                        className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-bronze/60"
                        aria-hidden
                      />
                    )}
                  </div>

                  {msg.role === 'assistant' &&
                    products.length > 0 &&
                    onTryInRoom &&
                    onAddToCart && (
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
            {showTypingDots && (
              <div className="self-start">
                <TypingDots />
              </div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} className="h-px shrink-0" />
        </div>

        {showSuggestions && (
          <div
            className={cn(
              'flex shrink-0 flex-wrap gap-2 border-t border-ink/6',
              layout === 'sheet' ? 'px-4 py-3' : 'px-4 py-3 sm:px-5'
            )}
          >
            {suggestionChips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => void sendText(chip)}
                className="rounded-full border border-ink/10 px-3 py-1.5 text-xs font-medium text-ink-muted transition-all hover:border-ink/16 hover:text-ink active:scale-[0.98]"
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
            : 'px-4 py-3.5 sm:px-5 sm:py-4'
        )}
      >
        {attachedImageUrl && (
          <div className="mb-2 flex items-center gap-2">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg ring-1 ring-ink/10">
              <img src={attachedImageUrl} alt="" className="h-full w-full object-cover" />
            </div>
            <p className="min-w-0 flex-1 text-xs text-ink-muted">Room attached</p>
            <button
              type="button"
              onClick={() => setAttachedImageUrl(null)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted hover:bg-ink/5"
              aria-label="Remove attachment"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <form
          onSubmit={handleSend}
          className={cn(
            'flex items-center gap-2 rounded-full border py-1.5 pl-4 pr-1.5',
            isListening
              ? 'border-bronze/40 bg-bronze/8'
              : 'border-ink/10 bg-parchment/60 focus-within:border-ink/20'
          )}
        >
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={isListening ? 'Listening…' : 'Message…'}
            className="h-10 min-w-0 flex-1 border-none bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
          />
          {voiceSupported && (
            <button
              type="button"
              onClick={handleToggleVoice}
              className={cn(
                'rounded-full p-2',
                isListening ? 'bg-bronze text-cream' : 'text-ink-muted hover:text-ink'
              )}
              aria-label="Voice"
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
              'flex h-9 w-9 items-center justify-center rounded-full bg-ink text-cream',
              inputValue.trim() && !isTyping && !isStreaming
                ? 'active:scale-95'
                : 'opacity-30'
            )}
            aria-label="Send"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </form>
      </footer>
    </div>
  );
}
