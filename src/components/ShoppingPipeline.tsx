import { motion } from 'framer-motion';
import { cn } from '../lib/cn';

interface ShoppingPipelineProps {
  onOpenAI?: () => void;
  onOpenVisualizer?: () => void;
  className?: string;
}

export default function ShoppingPipeline({
  onOpenAI,
  onOpenVisualizer,
  className,
}: ShoppingPipelineProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-24px' }}
      transition={{ duration: 0.3 }}
      className={cn(
        'flex flex-col items-center gap-1.5 border-y border-ink/5 py-4 text-center',
        className
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-faint">
        How it works
      </p>

      <p className="text-sm text-ink-muted">
        <button
          type="button"
          onClick={onOpenAI}
          className="text-ink transition-colors hover:text-bronze"
        >
          Discover
        </button>
        <span className="text-ink-faint"> with AI</span>
        <span className="mx-2 text-ink/15" aria-hidden>
          →
        </span>
        <button
          type="button"
          onClick={onOpenVisualizer}
          className="text-ink transition-colors hover:text-bronze"
        >
          Room visualizer
        </button>
        <span className="mx-2 text-ink/15" aria-hidden>
          →
        </span>
        <span>Purchase</span>
      </p>
    </motion.div>
  );
}
