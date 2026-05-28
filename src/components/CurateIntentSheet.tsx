import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { cn } from '../lib/cn';
import { easeIn, easeOut, slideSheet } from '../lib/motion';
import {
  appendCurateWishSuggestion,
  CURATE_WISH_MAX,
  CURATE_WISH_SUGGESTIONS,
  EMPTY_CURATE_INTENT,
  loadSavedCurateIntent,
  saveCurateIntent,
  type CurateIntent,
} from '../lib/gemini/curateIntent';

interface CurateIntentSheetProps {
  open: boolean;
  variant: 'mobile' | 'desktop';
  busy?: boolean;
  onClose: () => void;
  onConfirm: (intent: CurateIntent) => void;
}

export default function CurateIntentSheet({
  open,
  variant,
  busy = false,
  onClose,
  onConfirm,
}: CurateIntentSheetProps) {
  const titleId = useId();
  const wishId = useId();
  const wishRef = useRef<HTMLTextAreaElement>(null);
  const [wish, setWish] = useState('');

  useEffect(() => {
    if (!open) return;
    setWish(loadSavedCurateIntent().wish);
    const t = window.setTimeout(() => wishRef.current?.focus(), 120);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, busy, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const setWishClamped = useCallback((value: string) => {
    setWish(value.slice(0, CURATE_WISH_MAX));
  }, []);

  const addSuggestion = useCallback((snippet: string) => {
    setWish((prev) => appendCurateWishSuggestion(prev, snippet));
    requestAnimationFrame(() => {
      const el = wishRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    const next: CurateIntent = {
      wish: wish.trim().slice(0, CURATE_WISH_MAX),
    };
    saveCurateIntent(next);
    onConfirm(next);
  }, [wish, onConfirm]);

  const handleSkip = useCallback(() => {
    saveCurateIntent(EMPTY_CURATE_INTENT);
    onConfirm(EMPTY_CURATE_INTENT);
  }, [onConfirm]);

  const panelMotion =
    variant === 'mobile'
      ? slideSheet
      : {
          hidden: { opacity: 0, scale: 0.97, y: 10 },
          visible: {
            opacity: 1,
            scale: 1,
            y: 0,
            transition: { duration: 0.22, ease: easeOut },
          },
          exit: {
            opacity: 0,
            scale: 0.97,
            y: 10,
            transition: { duration: 0.18, ease: easeIn },
          },
        };

  const wishLen = wish.length;

  const panel = (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      variants={panelMotion}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={cn(
        'glass-strong flex flex-col text-ink shadow-[0_20px_60px_rgba(28,26,23,0.12)]',
        variant === 'mobile'
          ? 'max-h-[min(58vh,420px)] w-full rounded-t-[1.35rem] pb-[max(0.85rem,env(safe-area-inset-bottom))]'
          : 'w-full max-w-[400px] rounded-[1.35rem]',
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        aria-hidden
        className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-ink/10 lg:hidden"
      />

      <header className="flex shrink-0 items-start gap-3 px-5 pb-1 pt-3.5">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-bronze-soft text-bronze shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
          <Sparkles className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1 pr-1">
          <h2
            id={titleId}
            className="font-display text-[1.35rem] font-medium leading-[1.15] tracking-tight text-ink"
          >
            Your vision
          </h2>
          <p className="mt-1 text-[13px] leading-snug text-ink-muted">
            Share anything — family, style, or a piece you&apos;re hunting for.
            We&apos;ll read your room too.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-parchment hover:text-ink disabled:opacity-40"
          aria-label="Close"
        >
          <X className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-2 pt-3">
        <label htmlFor={wishId} className="sr-only">
          Describe your ideal room
        </label>
        <div className="relative">
          <textarea
            ref={wishRef}
            id={wishId}
            rows={variant === 'mobile' ? 4 : 5}
            disabled={busy}
            value={wish}
            maxLength={CURATE_WISH_MAX}
            placeholder="e.g. I have two sons and need a bunk bed here. Modern but warm — nothing too dark."
            onChange={(e) => setWishClamped(e.target.value)}
            className={cn(
              'w-full resize-none rounded-2xl border border-ink/8 bg-cream/90 px-4 py-3.5',
              'text-[15px] leading-relaxed text-ink placeholder:text-ink-faint/80',
              'outline-none transition-[border-color,box-shadow] duration-200',
              'focus:border-bronze/35 focus:shadow-[0_0_0_3px_rgba(184,114,58,0.12)]',
              'disabled:opacity-50',
            )}
          />
          <span
            className="pointer-events-none absolute bottom-2.5 right-3 text-[10px] tabular-nums text-ink-faint/70"
            aria-live="polite"
          >
            {wishLen}/{CURATE_WISH_MAX}
          </span>
        </div>

        <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.16em] text-ink-faint">
          Quick ideas
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Suggestions">
          {CURATE_WISH_SUGGESTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              disabled={busy}
              onClick={() => addSuggestion(s.insert)}
              className={cn(
                'rounded-full border border-ink/8 bg-parchment/80 px-3 py-1.5',
                'text-[12px] font-medium text-ink-muted transition-all duration-150',
                'hover:border-bronze/25 hover:bg-bronze-soft/50 hover:text-ink',
                'active:scale-[0.98]',
                busy && 'pointer-events-none opacity-50',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <footer className="shrink-0 space-y-2 border-t border-ink/6 px-5 py-4">
        <button
          type="button"
          disabled={busy}
          onClick={handleConfirm}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-bronze py-3.5 text-[14px] font-semibold text-cream shadow-[0_4px_22px_rgba(184,114,58,0.28)] transition-all hover:bg-bronze/92 active:scale-[0.99] disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4" strokeWidth={1.75} />
          Curate my room
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={handleSkip}
          className="w-full py-1 text-center text-[13px] font-medium text-ink-faint transition-colors hover:text-ink-muted disabled:opacity-40"
        >
          Skip — let AI decide
        </button>
      </footer>
    </motion.div>
  );

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className={cn(
            'fixed inset-0 z-[85] flex',
            variant === 'mobile'
              ? 'items-end justify-center'
              : 'items-center justify-center p-4',
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            aria-label="Dismiss"
            disabled={busy}
            className="absolute inset-0 bg-ink/20 backdrop-blur-[3px]"
            onClick={() => !busy && onClose()}
          />
          <div
            className={cn(
              'relative z-10 w-full',
              variant === 'desktop' ? 'max-w-[400px]' : 'max-w-lg',
            )}
          >
            {panel}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
