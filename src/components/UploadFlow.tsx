import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, ScanLine, Check, Home } from 'lucide-react';
import { slideSheet } from '../lib/motion';

type Step = 'pick' | 'scan' | 'done';

interface UploadFlowProps {
  open:         boolean;
  onClose:      () => void;
  onComplete?:  (imageUrl: string) => void;
  title?:       string;
  subtitle?:    string;
  quickApply?:  boolean;
}

export default function UploadFlow({
  open,
  onClose,
  onComplete,
  title      = 'Your room',
  subtitle,
  quickApply = false,
}: UploadFlowProps) {
  const [step,    setStep]    = useState<Step>('pick');
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);

  const reset = () => {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }
    setStep('pick');
    setPreview(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  useEffect(() => {
    if (!open) reset();
  }, [open]);

  const finishWithPreview = (url: string) => {
    if (onComplete) {
      onComplete(url);
      handleClose();
      return;
    }
    setStep('done');
  };

  const handleFile = (file: File) => {
    const url = URL.createObjectURL(file);
    previewRef.current = url;
    setPreview(url);

    if (quickApply && onComplete) {
      setStep('scan');
      window.setTimeout(() => finishWithPreview(url), 900);
      return;
    }

    setStep('scan');
    window.setTimeout(() => {
      if (onComplete) {
        finishWithPreview(url);
      } else {
        setStep('done');
      }
    }, quickApply ? 900 : 2200);
  };

  const hint =
    subtitle ??
    (quickApply
      ? 'This room will appear behind the product you are viewing.'
      : 'JPG or PNG · any room angle works');

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-ink/30 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Sheet */}
          <motion.div
            role="dialog"
            aria-modal="true"
            variants={slideSheet}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-x-0 bottom-0 z-[70] mx-auto flex max-h-[min(92dvh,560px)] w-full max-w-lg flex-col rounded-t-[1.75rem] glass-strong px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 sm:left-1/2 sm:max-w-md sm:-translate-x-1/2"
          >
            {/* Drag handle */}
            <div className="mb-3 flex shrink-0 justify-center">
              <span className="h-1 w-8 rounded-full bg-ink/20" aria-hidden />
            </div>

            {/* Header */}
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {quickApply && (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-bronze-soft text-bronze">
                    <Home className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                )}
                <h3 className="text-base font-semibold text-ink">{title}</h3>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-all duration-200 hover:bg-parchment active:scale-95"
                aria-label="Close"
              >
                <X className="h-4.5 w-4.5" strokeWidth={1.5} />
              </button>
            </div>

            {/* Hidden file input */}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = '';
              }}
            />

            {/* Step content */}
            <div className="min-h-0 flex-1 overflow-y-auto">

              {/* Pick step */}
              {step === 'pick' && (
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="flex w-full min-h-[200px] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-ink/16 bg-cream/60 py-10 transition-all duration-200 active:border-bronze/50 active:bg-parchment/60 hover:border-ink/28 hover:bg-parchment/60"
                >
                  <span className="flex h-13 w-13 items-center justify-center rounded-2xl bg-ink text-cream">
                    <Upload className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <div className="text-center">
                    <p className="font-medium text-ink">Upload a photo of your room</p>
                    <p className="mt-1.5 text-sm text-ink-muted">{hint}</p>
                  </div>
                </button>
              )}

              {/* Scan / done step */}
              {(step === 'scan' || step === 'done') && preview && (
                <div className="relative overflow-hidden rounded-2xl">
                  <img
                    src={preview}
                    alt="Your upload"
                    className="aspect-[4/3] w-full object-cover"
                  />
                  {/* Warm overlay tint */}
                  <div className="absolute inset-0 bg-ink/18" />

                  {/* Scan line — warm amber */}
                  {step === 'scan' && (
                    <motion.div
                      className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-bronze to-transparent"
                      style={{ boxShadow: '0 0 16px rgba(184, 114, 58, 0.6)' }}
                      animate={{ top: ['0%', '100%', '0%'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    />
                  )}

                  {/* Status overlay */}
                  <div className="absolute bottom-3 left-3 right-3 glass rounded-xl px-3 py-2.5 sm:bottom-4 sm:left-4 sm:right-4 sm:px-4 sm:py-3">
                    {step === 'scan' ? (
                      <p className="flex items-center gap-2 text-sm font-medium text-ink">
                        <ScanLine className="h-4 w-4 animate-pulse text-bronze" strokeWidth={1.75} />
                        {quickApply ? 'Placing product in your room…' : 'Scanning your space…'}
                      </p>
                    ) : (
                      <p className="flex items-center gap-2 text-sm font-medium text-ink">
                        <Check className="h-4 w-4 text-[#5A9B5A]" strokeWidth={2} />
                        {quickApply
                          ? 'Your room is ready'
                          : 'Ready — shoppable spots coming soon'}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Done CTA (no onComplete case) */}
            {step === 'done' && !onComplete && (
              <button
                type="button"
                onClick={handleClose}
                className="mt-4 min-h-[48px] w-full shrink-0 rounded-full bg-ink py-3 text-sm font-medium text-cream shadow-[0_4px_18px_rgba(28,26,23,0.16)] transition-all duration-200 active:scale-[0.99] hover:bg-ink/88"
              >
                Continue browsing
              </button>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
