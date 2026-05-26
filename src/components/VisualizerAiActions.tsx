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
            aria-label="AI room actions menu"
            // Position below the button; right-aligned so it doesn't clip
            className="absolute right-0 top-[calc(100%+0.5rem)] z-[80] min-w-[220px] overflow-hidden rounded-2xl border border-white/10 bg-[rgba(20,18,15,0.88)] shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
          >
            {/* Header label */}
            <div className="border-b border-white/8 px-4 pb-2 pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cream/55">
                AI Room Studio
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-cream/45">
                Pick how you want the AI to restyle your room.
              </p>
            </div>

            {/* ── Option 1: Rearrange ─────────────────────────────────── */}
            <button
              type="button"
              role="menuitem"
              disabled={!canRearrange || disabled}
              onClick={handleRearrange}
              className={cn(
                'group flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors duration-150',
                canRearrange && !disabled
                  ? 'hover:bg-white/8 active:bg-white/12'
                  : 'cursor-not-allowed opacity-40',
              )}
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <LayoutGrid className="h-4 w-4 text-cream/80" strokeWidth={1.75} />
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-cream">
                  Rearrange the Room
                </span>
                <span className="text-[12px] leading-snug text-cream/75">
                  Keeps everything in your photo and moves the furniture into a smarter layout.
                </span>
              </span>
            </button>

            {/* Divider */}
            <div className="mx-4 h-px bg-white/8" />

            {/* ── Option 2: AI Curate (premium) ───────────────────────── */}
            <button
              type="button"
              role="menuitem"
              disabled={!canCurate || disabled}
              onClick={handleCurate}
              className={cn(
                'group relative flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors duration-150',
                canCurate && !disabled
                  ? 'hover:bg-white/8 active:bg-white/12'
                  : 'cursor-not-allowed opacity-40',
              )}
            >
              {/* Subtle bronze glow behind the curate option */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-none bg-gradient-to-r from-bronze/8 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              />

              <span className="relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-bronze/30 to-bronze/10 shadow-[0_0_12px_rgba(184,114,58,0.25)]">
                <Sparkles className="h-4 w-4 text-bronze" strokeWidth={1.75} />
              </span>

              <span className="relative flex flex-col gap-1">
                <span className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-cream">Curate with AI</span>
                  <span className="rounded-full bg-gradient-to-r from-bronze to-[#D4944A] px-1.5 py-px text-[9px] font-bold uppercase tracking-wider text-cream shadow-[0_2px_8px_rgba(184,114,58,0.4)]">
                    AI
                  </span>
                </span>
                <span className="text-[12px] leading-snug text-cream/75">
                  Picks the best products from our shop and stages them in your room.
                </span>
              </span>
            </button>

            {/* Bottom pad */}
            <div className="pb-1" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
