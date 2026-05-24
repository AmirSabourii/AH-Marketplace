import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import CompareSlider from './CompareSlider';
import { cn } from '../lib/cn';

const DEMO_BEFORE = '/assets/room1.png';
const DEMO_AFTER = '/assets/room-sofa.png';

interface HeroVisualizerTeaserProps {
  className?: string;
  onClick?: () => void;
}

export default function HeroVisualizerTeaser({ className, onClick }: HeroVisualizerTeaserProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, rotate: -2, y: 24 }}
      animate={{ opacity: 1, rotate: -1.5, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 24, delay: 0.2 }}
      whileHover={{ scale: 1.02, rotate: 0 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'group relative w-full cursor-pointer overflow-hidden rounded-[1.75rem] border border-ink/10 bg-ink shadow-[0_24px_80px_rgba(28,26,23,0.22)]',
        'ring-1 ring-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bronze/50',
        className
      )}
      aria-label="Open room visualizer — see before and after"
    >
      <div className="aspect-[4/5] w-full sm:aspect-[3/4] lg:aspect-[4/5]">
        <CompareSlider
          originalImage={DEMO_BEFORE}
          generatedImage={DEMO_AFTER}
          className="h-full w-full"
          autoPlay
        />
      </div>

      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/50 via-ink/5 to-transparent"
        aria-hidden
      />

      <span className="pointer-events-none absolute left-4 top-4 rounded-full bg-cream/92 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted shadow-sm backdrop-blur-sm">
        Your room
      </span>

      <span className="pointer-events-none absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-bronze px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-cream shadow-md">
        <Sparkles className="h-3 w-3" strokeWidth={2} />
        AI staged
      </span>

      <span className="pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-cream/92 px-4 py-2 text-xs font-medium text-ink shadow-lg backdrop-blur-sm transition-transform duration-300 group-hover:scale-105">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-bronze opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-bronze" />
        </span>
        Live preview · tap to open
      </span>
    </motion.button>
  );
}
