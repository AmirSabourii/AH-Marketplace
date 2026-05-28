import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LayoutGrid, Sparkles, Wand2 } from 'lucide-react';
import { cn } from '../lib/cn';

// ─── Types ─────────────────────────────────────────────────────────────────

export type VisualizerAiAction = 'rearrange' | 'curate';

interface VisualizerAiActionsProps {
  variant?: 'toolbar';
  disabled?: boolean;
  busy?: boolean;
  busyAction?: VisualizerAiAction | null;
  canRearrange?: boolean;
  canCurate?: boolean;
  onRearrange?: () => void;
  onCurate?: () => void;
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function VisualizerAiActions({
  disabled = false,
  busy = false,
  busyAction = null,
  canRearrange = false,
  canCurate = false,
  onRearrange,
  onCurate,
}: VisualizerAiActionsProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler, true);
    return () => document.removeEventListener('mousedown', handler, true);
  }, [open]);

  const handleRearrange = useCallback(() => {
    setOpen(false);
    onRearrange?.();
  }, [onRearrange]);

  const handleCurate = useCallback(() => {
    setOpen(false);
    onCurate?.();
  }, [onCurate]);

  const isRearranging = busy && busyAction === 'rearrange';
  const isCurating = busy && busyAction === 'curate';

  // Label shown on the trigger button while busy
  const busyLabel = isCurating
    ? 'Curating…'
    : isRearranging
      ? 'Rearranging…'
      : null;

  return (
    <div ref={rootRef} className="relative">
      {/* ── Trigger button ──────────────────────────────────────────────── */}
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="AI room actions"
        disabled={disabled}
        onClick={() => !busy && setOpen((v) => !v)}
        className={cn(
          'relative flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-all duration-200 active:scale-95',
          // Base look — dark glass to match toolbar
          'glass-dark text-cream/90',
          // Active / open highlight
          open && !busy && 'bg-white/15 ring-1 ring-white/20',
          // Bronze glow when curating (premium feel)
          isCurating && 'ring-1 ring-bronze/60 bg-bronze/20',
          // Disabled
          disabled && 'cursor-not-allowed opacity-40',
        )}
      >
        {/* Icon — static wand even while busy. The image-level 3D cube
            overlay is the canonical loading indicator; the button itself
            stays calm and just shows a label like "Curating…". */}
        <Wand2 className="h-4 w-4 shrink-0" strokeWidth={1.75} />

        {/* Label */}
        <span className="hidden min-[360px]:inline">
          {busyLabel ?? 'AI'}
        </span>

        {/* Small gold dot — makes button feel premium when idle */}
        {!busy && (
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-bronze" aria-hidden />
        )}
      </button>

      {/* ── Dropdown menu ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -6 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            role="menu"
            aria-label="AI room actions"
            className="absolute right-0 top-[calc(100%+0.5rem)] z-[80] w-[168px] overflow-hidden rounded-xl border border-white/10 bg-[rgba(20,18,15,0.92)] p-1 shadow-[0_16px_48px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
          >
            <button
              type="button"
              role="menuitem"
              aria-label="Rearrange — same furniture, smarter layout"
              disabled={!canRearrange || disabled}
              onClick={handleRearrange}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors duration-150',
                canRearrange && !disabled
                  ? 'hover:bg-white/10 active:bg-white/14'
                  : 'cursor-not-allowed opacity-40',
              )}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10">
                <LayoutGrid className="h-3.5 w-3.5 text-cream/85" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium leading-none text-cream">
                  Rearrange
                </span>
                <span className="mt-1 block text-[10px] leading-none text-cream/45">
                  Smart layout
                </span>
              </span>
            </button>

            <button
              type="button"
              role="menuitem"
              aria-label="Curate — shop products staged in your room"
              disabled={!canCurate || disabled}
              onClick={handleCurate}
              className={cn(
                'group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors duration-150',
                canCurate && !disabled
                  ? 'hover:bg-white/10 active:bg-white/14'
                  : 'cursor-not-allowed opacity-40',
              )}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-r from-bronze/10 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              />
              <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-bronze/20 ring-1 ring-bronze/25">
                <Sparkles className="h-3.5 w-3.5 text-bronze" strokeWidth={1.75} />
              </span>
              <span className="relative min-w-0 flex-1">
                <span className="block text-[13px] font-medium leading-none text-cream">
                  Curate
                </span>
                <span className="mt-1 block text-[10px] leading-none text-bronze/70">
                  Shop picks
                </span>
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
