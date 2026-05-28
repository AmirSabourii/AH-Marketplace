import { cn } from '../lib/cn';

interface SidebarAiButtonProps {
  onClick: () => void;
  className?: string;
}

/** Animated gradient AI entry — no sparkle icons */
export default function SidebarAiButton({ onClick, className }: SidebarAiButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'ask-ai-btn group relative h-9 shrink-0 overflow-hidden rounded-full px-3.5',
        'text-cream transition-transform duration-200 active:scale-[0.96]',
        className
      )}
      aria-label="Open AI chat"
    >
      <span className="ask-ai-btn-shine pointer-events-none absolute inset-0" aria-hidden />
      <span className="relative text-[11px] font-bold uppercase tracking-[0.14em]">
        AI
      </span>
    </button>
  );
}
