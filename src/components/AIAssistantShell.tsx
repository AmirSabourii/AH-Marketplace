import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Mic, ArrowUp, X, MessageCircle } from 'lucide-react';
import { cn } from '../lib/cn';
import { slidePanel, slideSheet } from '../lib/motion';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { PANEL_Z } from '../lib/panelLayers';
import { buildAIContextLabel, type AIContext } from '../types/ai';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface AIAssistantShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: AIContext;
  initialQuery?: string;
  onClearInitialQuery?: () => void;
  /** Show the collapsed FAB — false when another bottom overlay owns the space */
  showCollapsed: boolean;
  placement: 'shop' | 'visualizer';
  onChatActiveChange?: (active: boolean) => void;
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

function mockReply(ctx: AIContext, userText: string): string {
  const snippet = userText.length > 48 ? `${userText.slice(0, 48)}…` : userText;
  if (ctx.surface === 'product' && ctx.product) {
    return `For the ${ctx.product.name}: "${snippet}" — I'd lean toward neutral textures and a low profile so the room stays airy. Want me to suggest a rug or accent chair?`;
  }
  if (ctx.surface === 'visualizer') {
    return `Looking at your room setup: "${snippet}" — we can adjust staging or swap a piece before the next render. Tell me if you want warmer tones or more minimal.`;
  }
  return `Got it — "${snippet}". I'll narrow our collection to pieces that match that vibe. Browse the grid or open Room visualizer when you're ready to see them in your space.`;
}

interface ChatBodyProps {
  context: AIContext;
  layout: 'sheet' | 'sidebar';
  messages: Message[];
  isTyping: boolean;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: (e?: React.FormEvent) => void;
  onSuggestion: (text: string) => void;
  onClose: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

function ChatBody({
  context,
  layout,
  messages,
  isTyping,
  inputValue,
  onInputChange,
  onSend,
  onSuggestion,
  onClose,
  inputRef,
  messagesEndRef,
}: ChatBodyProps) {
  const chips = useMemo(() => getSuggestionChips(context), [context]);
  const contextLabel = buildAIContextLabel(context);
  const showSuggestions = messages.length <= 1 && !isTyping;

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
              AI designer
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
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={cn(
                  'relative max-w-[92%] rounded-3xl p-3.5 text-sm leading-relaxed shadow-sm',
                  msg.role === 'user'
                    ? 'self-end rounded-br-md bg-ink text-cream'
                    : 'glass-strong self-start rounded-bl-md text-ink'
                )}
              >
                {msg.role === 'assistant' && (
                  <div className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-bronze shadow-sm">
                    <Sparkles className="h-3 w-3 text-cream" />
                  </div>
                )}
                {msg.content}
              </motion.div>
            ))}
            {isTyping && (
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
        <form
          onSubmit={onSend}
          className="flex items-center gap-2 rounded-full border border-ink/10 bg-parchment/60 py-1.5 pl-4 pr-1.5 focus-within:border-bronze/25 focus-within:bg-parchment"
        >
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="Ask about style, fit, or pairing…"
            className="h-10 min-w-0 flex-1 border-none bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
          />
          <button
            type="button"
            className="hidden rounded-full p-2 text-ink-muted hover:bg-ink/5 hover:text-ink sm:flex"
            aria-label="Voice input"
          >
            <Mic className="h-5 w-5" />
          </button>
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bronze text-cream shadow-sm transition-all',
              inputValue.trim() ? 'hover:bg-bronze/90 active:scale-95' : 'opacity-40'
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

/** Compact header / toolbar trigger */
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
}: AIAssistantShellProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const contextKeyRef = useRef<string>('');

  /** True only after the user sends a message (welcome alone should not dim the hero). */
  const chatActive =
    messages.some((m) => m.role === 'user') || isTyping;
  const panelZ = placement === 'visualizer' && !isDesktop ? PANEL_Z.aiVisualizerExpanded : PANEL_Z.aiPanel;
  const backdropZ = placement === 'visualizer' && !isDesktop ? PANEL_Z.aiVisualizerExpanded - 1 : PANEL_Z.aiBackdrop;

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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, open]);

  const contextKey = `${context.surface}:${context.product?.id ?? ''}:${context.stagedProducts?.length ?? 0}`;

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

  const pushAssistantReply = useCallback(
    (userText: string) => {
      setIsTyping(true);
      window.setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            content: mockReply(context, userText),
          },
        ]);
        setIsTyping(false);
      }, 900);
    },
    [context]
  );

  useEffect(() => {
    if (!initialQuery?.trim()) return;

    const query = initialQuery.trim();
    onClearInitialQuery?.();

    setMessages((prev) => {
      const already = prev.some((m) => m.role === 'user' && m.content === query);
      if (already) return prev;
      return [...prev, { id: `u-${Date.now()}`, role: 'user', content: query }];
    });
    pushAssistantReply(query);
  }, [initialQuery, onClearInitialQuery, pushAssistantReply]);

  const sendText = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      setMessages((prev) => [
        ...prev,
        { id: `u-${Date.now()}`, role: 'user', content: trimmed },
      ]);
      setInputValue('');
      pushAssistantReply(trimmed);
    },
    [pushAssistantReply]
  );

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    sendText(inputValue);
  };

  const handleClose = () => onOpenChange(false);

  const chatBodyProps = {
    context,
    messages,
    isTyping,
    inputValue,
    onInputChange: setInputValue,
    onSend: handleSend,
    onSuggestion: sendText,
    onClose: handleClose,
    inputRef,
    messagesEndRef,
  };

  return (
    <>
      {/* Collapsed FAB — never stacks above open modals */}
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
                <span className="flex h-2 w-2 rounded-full bg-bronze" aria-label="Conversation in progress" />
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded panel */}
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
