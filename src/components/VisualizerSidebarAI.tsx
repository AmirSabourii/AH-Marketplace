import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import type { Product } from '../data/scenes';
import type { AIContext } from '../types/ai';
import { useAIAssistantChat } from '../hooks/useAIAssistantChat';
import AIChatPanel from './AIChatPanel';
import { cn } from '../lib/cn';

interface VisualizerSidebarAIProps {
  context: AIContext;
  active: boolean;
  initialQuery?: string;
  onClearInitialQuery?: () => void;
  onBack: () => void;
  onTryInRoom?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  onProductClick?: (product: Product) => void;
  className?: string;
}

export default function VisualizerSidebarAI({
  context,
  active,
  initialQuery,
  onClearInitialQuery,
  onBack,
  onTryInRoom,
  onAddToCart,
  onProductClick,
  className,
}: VisualizerSidebarAIProps) {
  const chat = useAIAssistantChat({
    context,
    active,
    initialQuery,
    onClearInitialQuery,
  });

  const hasRoom = Boolean(context.roomImageUrl);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
      className={cn(
        'flex h-full min-h-0 flex-col overflow-hidden bg-cream',
        className
      )}
    >
      <header className="flex shrink-0 items-center gap-3 border-b border-ink/[0.06] px-3 py-3">
        <button
          type="button"
          onClick={() => {
            chat.stop();
            onBack();
          }}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-ink/[0.05] hover:text-ink active:scale-95"
          aria-label="Back to products"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-medium tracking-tight text-ink">Assistant</h2>
          <p className="truncate text-[11px] text-ink-faint">
            {hasRoom ? 'Your room is attached' : 'Style & layout help'}
          </p>
        </div>
        {(chat.isWaitingForStream || chat.isStreaming) && (
          <span
            className="flex shrink-0 items-center gap-0.5"
            aria-label={chat.isWaitingForStream ? 'Waiting for reply' : 'Reply streaming'}
          >
            <span className="h-1 w-1 animate-pulse rounded-full bg-bronze [animation-delay:0ms]" />
            <span className="h-1 w-1 animate-pulse rounded-full bg-bronze [animation-delay:140ms]" />
            <span className="h-1 w-1 animate-pulse rounded-full bg-bronze [animation-delay:280ms]" />
          </span>
        )}
      </header>

      <AIChatPanel
        layout="embedded"
        headerMode="none"
        {...chat}
        onTryInRoom={onTryInRoom}
        onAddToCart={onAddToCart}
        onProductClick={onProductClick}
      />
    </motion.div>
  );
}
