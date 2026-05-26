import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Home,
  MousePointerClick,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import {
  type Product,
  getProductDisplayImage,
  getProductVariant,
} from '../data/scenes';
import AddToCartButton from './AddToCartButton';
import { cn } from '../lib/cn';

type VisualizerStep = 'pick' | 'ready' | 'generating' | 'result';

interface VisualizerProductBarProps {
  placedProducts: Product[];
  productsForPreview: Product[];
  activeProduct: Product | null;
  activeProductId: string | null;
  colorSelections: Record<string, string>;
  step: VisualizerStep;
  canPreview: boolean;
  isSilentUpdating?: boolean;
  onColorSelect: (productId: string, variantId: string) => void;
  onActiveProductChange: (productId: string) => void;
  onRemoveProduct: (productId: string) => void;
  onRemovePlacedProduct: (productId: string) => void;
  onPreview: () => void;
  onAddToCart?: (product: Product) => void;
}

export default function VisualizerProductBar({
  placedProducts,
  productsForPreview,
  activeProduct,
  activeProductId,
  colorSelections,
  step,
  canPreview,
  isSilentUpdating = false,
  onColorSelect,
  onActiveProductChange,
  onRemoveProduct,
  onRemovePlacedProduct,
  onPreview,
  onAddToCart,
}: VisualizerProductBarProps) {
  const placedIds = new Set(placedProducts.map((p) => p.id));
  const hasPlaced = placedProducts.length > 0;
  const navigableProducts =
    productsForPreview.length > 0 ? productsForPreview : placedProducts;
  const hasBarContent = Boolean(activeProduct) || hasPlaced;

  const activeIndex = activeProduct
    ? navigableProducts.findIndex((p) => p.id === activeProduct.id)
    : -1;
  const activeVariant = activeProduct
    ? getProductVariant(activeProduct, colorSelections[activeProduct.id])
    : undefined;
  const thumb = activeProduct
    ? getProductDisplayImage(activeProduct, colorSelections)
    : '';
  const hasMultiple = navigableProducts.length > 1;
  const previewCount = productsForPreview.length;

  const previewLabel = previewCount > 1 ? 'Preview all' : 'Preview';
  const previewAriaLabel =
    previewCount > 1
      ? `Preview all ${previewCount} items in your room`
      : 'Preview in your room';

  const goToSibling = (delta: number) => {
    if (!hasMultiple || activeIndex < 0) return;
    const next =
      navigableProducts[
        (activeIndex + delta + navigableProducts.length) % navigableProducts.length
      ];
    onActiveProductChange(next.id);
  };

  const handleRemoveActive = () => {
    if (!activeProduct) return;
    if (placedIds.has(activeProduct.id)) {
      onRemovePlacedProduct(activeProduct.id);
    } else {
      onRemoveProduct(activeProduct.id);
    }
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
          // Cream wash on top of the glass blur so text stays high-contrast
          // against any room photo behind it.
          'bg-cream/70 ring-1 ring-ink/8 shadow-[0_8px_32px_rgba(0,0,0,0.28)]',
          'lg:mx-0 lg:mb-0'
        )}
      >
        <AnimatePresence mode="wait">
          {!hasBarContent ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 px-3.5 py-2.5"
            >
              <MousePointerClick className="h-4 w-4 shrink-0 text-bronze" strokeWidth={2} />
              <p className="min-w-0 flex-1 text-[13px] font-medium text-ink">
                Pick a product to stage · use the top bar to change your room
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col"
            >
              {hasPlaced && (
                <div className="flex items-center gap-2 border-b border-white/40 bg-cream/45 px-3 py-2 sm:px-3.5">
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Home className="h-3.5 w-3.5 text-ink-muted" strokeWidth={2} />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                      In room
                    </span>
                    <span className="rounded-full bg-ink/85 px-1.5 py-[1px] text-[10px] font-bold tabular-nums text-cream">
                      {placedProducts.length}
                    </span>
                  </div>
                  {isSilentUpdating && (
                    <span className="text-[10px] font-semibold text-ink-muted">Updating…</span>
                  )}
                  <LayoutGroup>
                    <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto no-scrollbar">
                      <AnimatePresence mode="popLayout">
                        {placedProducts.map((product) => {
                          const isActive = activeProductId === product.id;
                          const productThumb = getProductDisplayImage(
                            product,
                            colorSelections
                          );
                          return (
                            <motion.div
                              key={product.id}
                              layout
                              initial={{ opacity: 0, scale: 0.85 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.85 }}
                              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                              className="relative shrink-0"
                            >
                              <button
                                type="button"
                                onClick={() => onActiveProductChange(product.id)}
                                className={cn(
                                  'flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-white/70 transition-all active:scale-95',
                                  isActive
                                    ? 'ring-1 ring-ink/25 shadow-[0_0_0_1px_rgba(255,255,255,0.6)]'
                                    : 'ring-1 ring-ink/8 opacity-90'
                                )}
                                aria-label={product.name}
                                aria-pressed={isActive}
                              >
                                <img
                                  src={productThumb}
                                  alt=""
                                  className="h-full w-full object-contain p-1 mix-blend-multiply"
                                />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRemovePlacedProduct(product.id);
                                }}
                                className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-ink text-cream shadow-sm active:scale-90"
                                aria-label={`Remove ${product.name} from room`}
                              >
                                <X className="h-2.5 w-2.5" strokeWidth={2.5} />
                              </button>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </LayoutGroup>
                </div>
              )}

              {activeProduct && (
                <motion.div
                  layout
                  className="flex items-center gap-2.5 px-3 py-2.5 sm:gap-3 sm:px-3.5 sm:py-3"
                >
                  {!hasPlaced && (
                    <div className="relative shrink-0">
                      <div className="glass-chip flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl">
                        <img
                          src={thumb}
                          alt=""
                          className="h-full w-full object-contain p-1.5 mix-blend-multiply"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveActive}
                        className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-ink text-cream"
                        aria-label={`Remove ${activeProduct.name}`}
                      >
                        <X className="h-2.5 w-2.5" strokeWidth={2.5} />
                      </button>
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="min-w-0 flex-1 truncate text-sm font-semibold leading-snug text-ink">
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
                    <p className="mt-1 font-display text-[1.35rem] font-semibold leading-none text-bronze drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)]">
                      {activeProduct.price}
                    </p>
                  </div>

                  {hasMultiple && (
                    <div className="flex shrink-0 items-center gap-0.5 border-l border-white/40 pl-2.5">
                      <button
                        type="button"
                        onClick={() => goToSibling(-1)}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted hover:bg-white/35 hover:text-ink active:scale-95"
                        aria-label="Previous product in room"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>
                      <span className="w-7 text-center text-xs font-semibold tabular-nums text-ink-muted">
                        {activeIndex + 1}/{navigableProducts.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => goToSibling(1)}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted hover:bg-white/35 hover:text-ink active:scale-95"
                        aria-label="Next product in room"
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
                    <AddToCartButton
                      variant="pill"
                      onClick={() => onAddToCart?.(activeProduct)}
                    />
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
