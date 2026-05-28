import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ImagePlus,
  LayoutGrid,
  MoreHorizontal,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react';
import { cn } from '../lib/cn';
import type { VisualizerAiAction } from './VisualizerAiActions';

interface VisualizerMobileMenuProps {
  disabled?: boolean;
  canShare?: boolean;
  shareCopied?: boolean;
  showCompare?: boolean;
  isComparing?: boolean;
  showChangePhoto?: boolean;
  canRearrange?: boolean;
  canCurate?: boolean;
  aiBusy?: boolean;
  aiBusyAction?: VisualizerAiAction | null;
  onShare?: () => void;
  onToggleCompare?: () => void;
  onChangePhoto?: () => void;
  onRearrange?: () => void;
  onCurate?: () => void;
  onAskAi?: () => void;
  triggerClassName?: string;
}

export default function VisualizerMobileMenu({
  disabled = false,
  canShare = false,
  shareCopied = false,
  showCompare = false,
  isComparing = false,
  showChangePhoto = false,
  canRearrange = false,
  canCurate = false,
  aiBusy = false,
  aiBusyAction = null,
  onShare,
  onToggleCompare,
  onChangePhoto,
  onRearrange,
  onCurate,
  onAskAi,
  triggerClassName,
}: VisualizerMobileMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler, true);
    return () => document.removeEventListener('mousedown', handler, true);
  }, [open]);

  const close = useCallback(() => setOpen(false), []);

  const run = (fn?: () => void) => {
    close();
    fn?.();
  };

  const busyLabel =
    aiBusyAction === 'curate'
      ? 'Curating room…'
      : aiBusyAction === 'rearrange'
        ? 'Rearranging…'
        : null;

  const items = [
    showChangePhoto && {
      key: 'photo',
      label: 'Change room photo',
      icon: ImagePlus,
      onClick: () => run(onChangePhoto),
    },
    showCompare && {
      key: 'compare',
      label: isComparing ? 'Hide comparison' : 'Compare before / after',
      icon: SlidersHorizontal,
      onClick: () => run(onToggleCompare),
      active: isComparing,
    },
    canShare && {
      key: 'share',
      label: shareCopied ? 'Link copied' : 'Share look',
      icon: Share2,
      onClick: () => run(onShare),
    },
    onAskAi && {
      key: 'ask',
      label: 'Ask AI',
      icon: Wand2,
      onClick: () => run(onAskAi),
    },
    canRearrange && {
      key: 'rearrange',
      label: 'Rearrange room',
      icon: LayoutGrid,
      onClick: () => run(onRearrange),
      disabled: disabled || aiBusy,
    },
    canCurate && {
      key: 'curate',
      label: 'Curate with AI',
      icon: Sparkles,
      onClick: () => run(onCurate),
      disabled: disabled || aiBusy,
    },
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    icon: typeof ImagePlus;
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
  }>;

  if (items.length === 0) return null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled && !open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-full glass-dark text-cream/90 transition-all active:scale-95',
          open && 'bg-white/15 ring-1 ring-white/20',
          triggerClassName
        )}
      >
        {open ? (
          <X className="h-4 w-4" strokeWidth={1.75} />
        ) : (
          <MoreHorizontal className="h-4 w-4" strokeWidth={1.75} />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            aria-label="Room actions"
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-[calc(100%+0.5rem)] z-[80] w-[min(15.5rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/10 bg-[rgba(20,18,15,0.94)] p-1 shadow-[0_16px_48px_rgba(0,0,0,0.45)] backdrop-blur-xl"
          >
            {busyLabel && (
              <p className="border-b border-white/8 px-3 py-2 text-[11px] font-medium text-bronze">
                {busyLabel}
              </p>
            )}
            {items.map(({ key, label, icon: Icon, onClick, active, disabled: itemDisabled }) => (
              <button
                key={key}
                type="button"
                role="menuitem"
                disabled={itemDisabled}
                onClick={onClick}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition-colors',
                  active ? 'bg-bronze/25 text-cream' : 'text-cream/90 hover:bg-white/10',
                  itemDisabled && 'cursor-not-allowed opacity-40'
                )}
              >
                <Icon className="h-4 w-4 shrink-0 text-cream/70" strokeWidth={1.75} />
                {label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
