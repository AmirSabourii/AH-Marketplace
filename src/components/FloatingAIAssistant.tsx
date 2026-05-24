import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Mic, ArrowUp, X } from 'lucide-react';
import { cn } from '../lib/cn';
import type { Product } from '../data/scenes';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface FloatingAIAssistantProps {
  visible: boolean;
  isExpanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  contextProduct?: Product | null;
  initialQuery?: string;
  onClearInitialQuery?: () => void;
  onChatActiveChange?: (active: boolean) => void;
}

export default function FloatingAIAssistant({
  visible,
  isExpanded,
  onExpandedChange,
  contextProduct,
  initialQuery,
  onClearInitialQuery,
  onChatActiveChange,
}: FloatingAIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatActive = messages.length > 0 || isTyping;

  useEffect(() => {
    onChatActiveChange?.(chatActive);
    return () => onChatActiveChange?.(false);
  }, [chatActive, onChatActiveChange]);

  useEffect(() => {
    if (!visible && !isExpanded) {
      const timer = setTimeout(() => setMessages([]), 300);
      return () => clearTimeout(timer);
    }
  }, [visible, isExpanded]);

  useEffect(() => {
    if (isExpanded) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isExpanded]);

  useEffect(() => {
    if (initialQuery && messages.length === 0) {
      setMessages([{ id: Date.now().toString(), role: 'user', content: initialQuery }]);
      setIsTyping(true);
      onClearInitialQuery?.();

      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content:
              'I can definitely help you find that! Let me search through our curated collection...',
          },
        ]);
        setIsTyping(false);
      }, 1500);
    }
  }, [initialQuery, messages.length, onClearInitialQuery]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isExpanded && contextProduct && messages.length === 0) {
      setMessages([
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: `I see you're looking at the ${contextProduct.name}. How can I help you style it?`,
        },
      ]);
    }
  }, [isExpanded, contextProduct, messages.length]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim()) return;

    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setInputValue('');
    setIsTyping(true);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content:
            "That's a great choice! I'd recommend pairing it with warm, neutral tones to bring out its texture. Would you like to see some matching rugs or decor?",
        },
      ]);
      setIsTyping(false);
    }, 1500);
  };

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 flex w-full max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-col items-center justify-end sm:max-w-[440px]">
      {chatActive && (
        <div className="pointer-events-auto relative mb-4 flex max-h-[50vh] w-full flex-col gap-3 overflow-y-auto px-1 no-scrollbar">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  'relative max-w-[85%] rounded-3xl p-4 text-sm leading-relaxed shadow-sm',
                  msg.role === 'user'
                    ? 'self-end rounded-br-sm bg-ink text-cream'
                    : 'glass-strong self-start rounded-bl-sm text-ink'
                )}
              >
                {msg.role === 'assistant' && (
                  <div className="absolute -left-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-bronze shadow-sm">
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
                className="glass-strong relative max-w-[85%] self-start rounded-3xl rounded-bl-sm p-4 shadow-sm"
              >
                <div className="absolute -left-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-bronze shadow-sm">
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
          <div ref={messagesEndRef} className="h-1" />
        </div>
      )}

      <div
        className={cn(
          'pointer-events-auto flex min-h-[56px] items-center overflow-hidden glass-strong shadow-[0_8px_32px_rgba(28,26,23,0.12)]',
          isExpanded ? 'w-full rounded-[2rem]' : 'w-auto rounded-full'
        )}
      >
        {isExpanded ? (
          <form onSubmit={handleSend} className="flex w-full items-center gap-2 py-2 pl-4 pr-2">
            <button
              type="button"
              onClick={() => onExpandedChange(false)}
              className="-ml-2 rounded-full p-2 text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
            <input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Explain what you want to find in the home..."
              className="h-10 min-w-0 flex-1 border-none bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted/50 sm:text-base"
            />
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                className="hidden rounded-full p-2 text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink sm:flex"
              >
                <Mic className="h-5 w-5" />
              </button>
              {inputValue.trim() && (
                <button
                  type="submit"
                  className="rounded-full bg-bronze p-2 text-cream shadow-sm transition-all hover:bg-bronze/90 active:scale-95"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              )}
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => onExpandedChange(true)}
            className="flex h-full w-full items-center gap-2.5 px-5 py-3.5 transition-colors hover:bg-ink/5"
          >
            <Sparkles className="h-5 w-5 text-bronze" />
            <span className="whitespace-nowrap pr-1 text-sm font-medium text-ink">Ask AI Designer</span>
          </button>
        )}
      </div>
    </div>
  );
}
