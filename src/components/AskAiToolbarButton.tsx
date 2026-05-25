import { MessageCircle } from 'lucide-react';
import { cn } from '../lib/cn';

interface AskAiToolbarButtonProps {
  onClick: () => void;
  className?: string;
  /** Dark glass toolbar (visualizer) vs light shop chrome */
  variant?: 'dark' | 'light';
}

export default function AskAiToolbarButton({
  onClick,
  className,
  variant = 'dark',
}: AskAiToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'ask-ai-btn group relative flex h-9 shrink-0 items-center gap-1.5 overflow-hidden rounded-full px-3 transition-transform duration-200 active:scale-95',
        variant === 'dark' && 'text-cream shadow-[0_4px_20px_rgba(184,114,58,0.35)]',
        variant === 'light' && 'text-cream shadow-[0_4px_16px_rgba(184,114,58,0.28)]',
        className
      )}
      aria-label="Ask AI"
    >
      <span className="ask-ai-btn-shine pointer-events-none absolute inset-0" aria-hidden />
      <MessageCircle
        className="relative h-3.5 w-3.5 shrink-0 opacity-95"
        strokeWidth={1.75}
      />
      <span className="relative text-[10px] font-bold uppercase tracking-[0.12em]">
        ASK AI
      </span>
    </button>
  );
}
