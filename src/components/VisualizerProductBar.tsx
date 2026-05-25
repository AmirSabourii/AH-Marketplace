import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  MousePointerClick,
  RotateCcw,
  ShoppingBag,
  Sparkles,
  X,
} from 'lucide-react';
import {
  type Product,
  getProductDisplayImage,
  getProductVariant,
} from '../data/scenes';
import { cn } from '../lib/cn';

type VisualizerStep = 'pick' | 'ready' | 'generating' | 'result';

interface VisualizerProductBarProps {
  products: Product[];
  activeProduct: Product | null;
  colorSelections: Record<string, string>;
  step: VisualizerStep;
  canPreview: boolean;
  onColorSelect: (productId: string, variantId: string) => void;
  onActiveProductChange: (productId: string) => void;
  onRemoveProduct: (productId: string) => void;
  onPreview: () => void;
  onAddToCart?: (product: Product) => void;
}

export default function VisualizerProductBar({
  products,
  activeProduct,
  colorSelections,
  step,
  canPreview,
  onColorSelect,
  onActiveProductChange,
  onRemoveProduct,
  onPreview,
  onAddToCart,
}: VisualizerProductBarProps) {
  const hasProducts = products.length > 0;
  const activeIndex = activeProduct
    ? products.findIndex((p) => p.id === activeProduct.id)
    : -1;
  const activeVariant = activeProduct
    ? getProductVariant(activeProduct, colorSelections[activeProduct.id])
    : undefined;
  const thumb = activeProduct
    ? getProductDisplayImage(activeProduct, colorSelections)
    : '';
  const hasMultiple = products.length > 1;

  const previewLabel = hasMultiple ? 'Preview all' : 'Preview';
  const previewAriaLabel = hasMultiple
    ? `Preview all ${products.length} items in your room`
    : 'Preview in your room';

  const goToSibling = (delta: number) => {
    if (!hasMultiple || activeIndex < 0) return;
    const next = products[(activeIndex + delta + products.length) % products.length];
    onActiveProductChange(next.id);
  };

  return (
    <div
      className={cn(
        'relative z-30 shrink-0',
        'lg:absolute lg:inset-x-0 lg:bottom-5 lg:mx-auto lg:max-w-xl lg:px-4'
      )}
    >
      <motion.div
        layout
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        className={cn(
          'glass mx-3 mb-[max(0.4rem,env(safe-area-inset-bottom))] isolate overflow-hidden rounded-2xl',
          'shadow-[0_8px_32px_rgba(0,0,0,0.2)]',
          'lg:mx-0 lg:mb-0'
        )}
      >
        <AnimatePresence mode="wait">
          {!hasProducts ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 px-3.5 py-2.5"
            >
              <MousePointerClick className="h-3.5 w-3.5 shrink-0 text-bronze" strokeWidth={1.75} />
              <p className="min-w-0 flex-1 text-xs text-ink-muted">
                Pick a product to stage · use the top bar to change your room
              </p>
            </motion.div>
          ) : (
            activeProduct && (
              <motion.div
                key={activeProduct.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2.5 px-3 py-2.5 sm:gap-3 sm:px-3.5 sm:py-3"
              >
                <div className="relative shrink-0">
                  <div className="glass-chip flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl">
                    <img
                      src={thumb}
                      alt=""
                      className="h-full w-full object-contain p-1.5 mix-blend-multiply"
                    />
                  </div>
                  {hasMultiple && (
                    <button
                      type="button"
                      onClick={() => onRemoveProduct(activeProduct.id)}
                      className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-ink text-cream"
                      aria-label={`Remove ${activeProduct.name}`}
                    >
                      <X className="h-2.5 w-2.5" strokeWidth={2.5} />
                    </button>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-xs leading-snug text-ink-muted">
                      {activeProduct.name}
                    </p>
                    {activeProduct.variants && activeProduct.variants.length > 0 && (
                      <div className="flex shrink-0 flex-nowrap items-center gap-1.5">
                        {activeProduct.variants.map((variant) => {
                          const selected =
                            variant.id ===
                            (activeVariant?.id ?? activeProduct.variants?.[0]?.id);
                          return (
                            <button
                              key={variant.id}
                              type="button"
                              onClick={() => onColorSelect(activeProduct.id, variant.id)}
                              className={cn(
                                'h-[18px] w-[18px] shrink-0 rounded-full border transition-transform',
                                selected
                                  ? 'scale-110 border-ink/30 ring-1 ring-bronze/25'
                                  : 'border-ink/12'
                              )}
                              style={{ backgroundColor: variant.swatch }}
                              title={variant.name}
                              aria-label={variant.name}
                              aria-pressed={selected}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <p className="mt-0.5 font-display text-[1.35rem] font-medium leading-none text-bronze">
                    {activeProduct.price}
                  </p>
                </div>

                {hasMultiple && (
                  <div className="flex shrink-0 items-center gap-0.5 border-l border-white/40 pl-2.5">
                    <button
                      type="button"
                      onClick={() => goToSibling(-1)}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted hover:bg-white/35 hover:text-ink active:scale-95"
                      aria-label="Previous staged product"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                    <span className="w-7 text-center text-[10px] font-medium tabular-nums text-ink-faint">
                      {activeIndex + 1}/{products.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => goToSibling(1)}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted hover:bg-white/35 hover:text-ink active:scale-95"
                      aria-label="Next staged product"
                    >
                      <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  </div>
                )}

                <div className="flex shrink-0 items-center gap-2 border-l border-white/40 pl-2.5">
                  {step === 'result' ? (
                    <button
                      type="button"
                      onClick={onPreview}
                      className="flex h-9 w-9 items-center justify-center rounded-full glass-chip text-ink hover:bg-white/40 active:scale-95"
                      aria-label="Regenerate"
                    >
                      <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onPreview}
                      disabled={!canPreview}
                      aria-label={previewAriaLabel}
                      className={cn(
                        'flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition-all',
                        canPreview
                          ? 'bg-bronze text-cream active:scale-95'
                          : 'cursor-not-allowed bg-white/20 text-ink/30'
                      )}
                    >
                      <Sparkles className="h-3 w-3" strokeWidth={2} />
                      <span className="hidden min-[380px]:inline">{previewLabel}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onAddToCart?.(activeProduct)}
                    className="flex h-9 items-center gap-1.5 rounded-full bg-ink px-3.5 text-xs font-medium text-cream active:scale-95"
                  >
                    <ShoppingBag className="h-3 w-3" strokeWidth={1.75} />
                    <span className="hidden min-[380px]:inline">Add</span>
                  </button>
                </div>
              </motion.div>
            )
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
