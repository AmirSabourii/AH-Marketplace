import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronUp, Plus, RotateCcw, Sparkles, X } from 'lucide-react';
import {
  type Product,
  getProductDisplayImage,
  getProductVariant,
} from '../data/scenes';
import type { CatalogItem } from '../lib/medusa/products';
import { buildSelectionEntries } from '../lib/visualizer/selectionEntries';
import {
  activeProductStatus,
  getPreviewAction,
  previewActionLabel,
  type PreviewAction,
} from '../lib/visualizer/selectionState';
import AddToCartButton from './AddToCartButton';
import { cn } from '../lib/cn';

type VisualizerStep = 'pick' | 'ready' | 'generating' | 'result';

interface VisualizerProductBarProps {
  catalog: CatalogItem[];
  stagedProducts: Product[];
  placedProducts: Product[];
  activeProduct: Product | null;
  activeProductId: string | null;
  colorSelections: Record<string, string>;
  step: VisualizerStep;
  hasRoomPhoto: boolean;
  hasLivePreview: boolean;
  pendingCount: number;
  pickCount: number;
  canRunPreview: boolean;
  isSilentUpdating?: boolean;
  onColorSelect: (productId: string, variantId: string) => void;
  onActiveProductChange: (productId: string) => void;
  onRemoveProduct: (productId: string) => void;
  onRemovePlacedProduct: (productId: string) => void;
  onPreview: () => void;
  onAddToCart?: (product: Product) => void;
  /** Mobile dock: sits inside the bottom panel, not over the room image */
  layout?: 'overlay' | 'dock';
}

export default function VisualizerProductBar({
  catalog,
  stagedProducts,
  placedProducts,
  activeProduct,
  activeProductId,
  colorSelections,
  step,
  hasRoomPhoto,
  hasLivePreview,
  pendingCount,
  pickCount,
  canRunPreview,
  isSilentUpdating = false,
  onColorSelect,
  onActiveProductChange,
  onRemoveProduct,
  onRemovePlacedProduct,
  onPreview,
  onAddToCart,
  layout = 'overlay',
}: VisualizerProductBarProps) {
  const pickMenuRef = useRef<HTMLDivElement>(null);
  const cartMenuRef = useRef<HTMLDivElement>(null);
  const [pickMenuOpen, setPickMenuOpen] = useState(false);
  const [cartMenuOpen, setCartMenuOpen] = useState(false);
  const [cartSuccessSignal, setCartSuccessSignal] = useState(0);

  const placedIds = useMemo(
    () => new Set(placedProducts.map((p) => p.id)),
    [placedProducts]
  );

  const entries = useMemo(
    () => buildSelectionEntries(catalog, stagedProducts, placedProducts),
    [catalog, stagedProducts, placedProducts]
  );

  const thumbStackEntries = useMemo(() => {
    if (!activeProductId || pickCount <= 1) return [];
    return entries.filter((e) => e.product.id !== activeProductId).slice(-2);
  }, [entries, activeProductId, pickCount]);

  const previewAction: PreviewAction = getPreviewAction({
    pickCount,
    pendingCount,
    hasLivePreview,
  });

  const activeVariant = activeProduct
    ? getProductVariant(activeProduct, colorSelections[activeProduct.id])
    : undefined;
  const thumb = activeProduct
    ? getProductDisplayImage(activeProduct, colorSelections)
    : '';
  const activeInRoom = activeProduct ? placedIds.has(activeProduct.id) : false;
  const statusLine = activeProduct
    ? activeProductStatus(activeInRoom, hasLivePreview)
    : null;

  const primaryLabel = previewActionLabel(
    previewAction,
    pickCount,
    pendingCount
  );

  const handleRemoveActive = () => {
    if (!activeProduct) return;
    if (placedIds.has(activeProduct.id)) {
      onRemovePlacedProduct(activeProduct.id);
    } else {
      onRemoveProduct(activeProduct.id);
    }
  };

  const handleRemoveEntry = useCallback(
    (productId: string, inRoom: boolean) => {
      if (inRoom) {
        onRemovePlacedProduct(productId);
      } else {
        onRemoveProduct(productId);
      }
    },
    [onRemovePlacedProduct, onRemoveProduct]
  );

  const focusProduct = useCallback(
    (productId: string) => {
      onActiveProductChange(productId);
      setPickMenuOpen(false);
    },
    [onActiveProductChange]
  );

  useEffect(() => {
    if (!pickMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (!pickMenuRef.current?.contains(e.target as Node)) {
        setPickMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler, true);
    return () => document.removeEventListener('mousedown', handler, true);
  }, [pickMenuOpen]);

  useEffect(() => {
    if (pickCount === 0) setPickMenuOpen(false);
  }, [pickCount]);

  useEffect(() => {
    if (pickCount <= 1) setCartMenuOpen(false);
  }, [pickCount]);

  useEffect(() => {
    if (!cartMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (!cartMenuRef.current?.contains(e.target as Node)) {
        setCartMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler, true);
    return () => document.removeEventListener('mousedown', handler, true);
  }, [cartMenuOpen]);

  const confirmAddToCart = useCallback(
    (mode: 'one' | 'all') => {
      if (mode === 'one') {
        if (activeProduct) onAddToCart?.(activeProduct);
      } else {
        for (const { product } of entries) {
          onAddToCart?.(product);
        }
      }
      setCartMenuOpen(false);
      setCartSuccessSignal((n) => n + 1);
    },
    [activeProduct, entries, onAddToCart]
  );

  const showPrimary =
    hasRoomPhoto &&
    previewAction !== 'none' &&
    step !== 'generating';
  const primaryIsIconOnly = previewAction === 'regenerate';

  const anyMenuOpen = pickMenuOpen || cartMenuOpen;
  const showThumbStack = pickCount > 1 && !anyMenuOpen;
  const thumbStackStep = 5;
  const thumbStackPeek = showThumbStack ? thumbStackEntries.length * thumbStackStep : 0;

  const isDock = layout === 'dock';

  return (
    <div
      className={cn(
        'relative shrink-0',
        !isDock && (anyMenuOpen ? 'z-[110]' : 'z-30'),
        !isDock && 'lg:absolute lg:inset-x-0 lg:bottom-5 lg:mx-auto lg:max-w-xl lg:px-4'
      )}
    >
      <div
        className={cn(
          'relative overflow-visible',
          isDock ? 'px-0' : 'mx-3 lg:mx-0',
          !isDock && anyMenuOpen && 'z-[100]',
          !isDock && 'mb-[max(0.4rem,env(safe-area-inset-bottom))] lg:mb-0'
        )}
      >
        <motion.div
          layout
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          className={cn(
            'glass relative z-10 rounded-2xl',
            !anyMenuOpen && 'isolate',
            isDock
              ? 'bg-parchment/90 ring-1 ring-ink/10 shadow-[0_2px_12px_rgba(0,0,0,0.06)]'
              : 'bg-cream/70 ring-1 ring-ink/8 shadow-[0_8px_32px_rgba(0,0,0,0.28)]',
            anyMenuOpen ? 'overflow-visible' : 'overflow-hidden'
          )}
        >
        <AnimatePresence mode="wait">
          {pickCount === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2.5 px-3.5 py-2.5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-bronze/12 text-bronze">
                <Plus className="h-4 w-4" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-ink">
                  {isDock ? 'Add furniture' : (
                    <>
                      Tap <span className="text-bronze">+</span> on a product
                    </>
                  )}
                </p>
                {isDock && (
                  <p className="mt-0.5 text-[11px] text-ink-muted">
                    Choose from the catalog above
                  </p>
                )}
              </div>
            </motion.div>
          ) : (
            activeProduct && (
              <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2.5 px-3 py-2.5 sm:gap-3 sm:px-3.5 sm:py-3"
              >
                <div
                  ref={pickMenuRef}
                  className="relative shrink-0"
                  style={{
                    width: 48 + thumbStackPeek,
                    height: 48 + thumbStackPeek,
                  }}
                >
                  <AnimatePresence>
                    {showThumbStack &&
                      thumbStackEntries.map((entry, i) => (
                        <motion.div
                          key={entry.product.id}
                          initial={{ opacity: 0, scale: 0.94 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.94 }}
                          transition={{
                            type: 'spring',
                            stiffness: 380,
                            damping: 28,
                            delay: i * 0.05,
                          }}
                          aria-hidden
                          className="pointer-events-none absolute h-12 w-12 overflow-hidden rounded-2xl bg-parchment ring-[1.5px] ring-ink/18 shadow-[0_3px_10px_rgba(28,26,23,0.12)]"
                          style={{
                            zIndex: i + 1,
                            left: i * thumbStackStep,
                            top: i * thumbStackStep,
                          }}
                        >
                          <img
                            src={entry.imageUrl}
                            alt=""
                            className="h-full w-full object-cover opacity-80 saturate-[0.85]"
                          />
                        </motion.div>
                      ))}
                  </AnimatePresence>

                  <button
                    type="button"
                    onClick={() => {
                      setCartMenuOpen(false);
                      setPickMenuOpen((v) => !v);
                    }}
                    aria-expanded={pickMenuOpen}
                    aria-haspopup="listbox"
                    aria-label={`${pickCount} products, open list`}
                    className="absolute cursor-pointer active:scale-[0.97]"
                    style={{
                      left: thumbStackPeek,
                      top: thumbStackPeek,
                      zIndex: 10,
                    }}
                  >
                    <div
                      className={cn(
                        'relative h-12 w-12 overflow-hidden rounded-2xl bg-cream shadow-[0_4px_14px_rgba(28,26,23,0.14)] transition-shadow',
                        pickMenuOpen ? 'ring-2 ring-ink/20' : 'ring-[1.5px] ring-ink/12'
                      )}
                    >
                      <img
                        src={thumb}
                        alt=""
                        className="h-full w-full object-contain p-2 mix-blend-multiply"
                      />
                    </div>

                    <span
                      className="absolute -right-1 -top-1 z-10 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-ink text-cream ring-2 ring-cream shadow-sm"
                      aria-hidden
                    >
                      <Check className="h-2.5 w-2.5" strokeWidth={2.5} />
                    </span>

                    {pickCount > 1 && (
                      <>
                        <span
                          className={cn(
                            'absolute -bottom-0.5 -left-0.5 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-cream ring-1 ring-ink/12 shadow-sm transition-transform',
                            pickMenuOpen && '-translate-y-px'
                          )}
                          aria-hidden
                        >
                          <ChevronUp
                            className={cn(
                              'h-2.5 w-2.5 text-ink/65 transition-transform',
                              pickMenuOpen && 'rotate-180'
                            )}
                            strokeWidth={2}
                          />
                        </span>
                        <span className="absolute -bottom-0.5 -right-0.5 z-10 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-1 text-[10px] font-bold tabular-nums text-cream ring-2 ring-cream shadow-sm">
                          {pickCount}
                        </span>
                      </>
                    )}
                  </button>

                  <AnimatePresence>
                    {pickMenuOpen && (
                      <motion.div
                        role="listbox"
                        aria-label="Selected products"
                        initial={{ opacity: 0, y: 6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.97 }}
                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                        className="absolute bottom-[calc(100%+0.5rem)] left-0 z-[120] w-[min(17rem,calc(100vw-2.5rem))] overflow-hidden rounded-xl border border-ink/10 bg-cream shadow-[0_12px_40px_rgba(28,26,23,0.22)]"
                      >
                        <div className="flex items-start justify-between gap-2 border-b border-ink/8 bg-bronze/8 px-3 py-2">
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-bronze">
                              Viewing now
                            </p>
                            <p className="mt-0.5 line-clamp-1 text-xs font-semibold text-ink">
                              {activeProduct.name}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleRemoveActive}
                            className="shrink-0 text-[10px] font-medium text-ink-muted underline-offset-2 hover:text-ink hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                        {isSilentUpdating && (
                          <p className="border-b border-ink/8 px-3 py-2 text-[10px] font-medium text-ink-muted">
                            Updating…
                          </p>
                        )}
                        <ul className="max-h-48 overflow-y-auto overscroll-contain p-1 no-scrollbar">
                          {entries.map(({ product, inRoom, imageUrl }) => {
                            const isActive = activeProductId === product.id;
                            return (
                              <li key={product.id}>
                                <div
                                  className={cn(
                                    'flex items-center gap-1.5 rounded-lg p-1 transition-colors',
                                    isActive
                                      ? 'bg-bronze/12 ring-1 ring-bronze/35'
                                      : 'opacity-75 hover:opacity-100'
                                  )}
                                >
                                  <button
                                    type="button"
                                    role="option"
                                    aria-selected={isActive}
                                    onClick={() => focusProduct(product.id)}
                                    className="flex min-w-0 flex-1 items-center gap-2 text-left active:opacity-80"
                                  >
                                    <span
                                      className={cn(
                                        'relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-white/80',
                                        inRoom ? 'ring-2 ring-ink/20' : 'ring-2 ring-dashed ring-bronze/40',
                                        isActive && 'ring-2 ring-bronze'
                                      )}
                                    >
                                      <img
                                        src={imageUrl}
                                        alt=""
                                        className="h-full w-full object-cover"
                                      />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                      <span
                                        className={cn(
                                          'line-clamp-1 text-xs font-semibold',
                                          isActive ? 'text-ink' : 'text-ink/80'
                                        )}
                                      >
                                        {product.name}
                                      </span>
                                      {isActive && (
                                        <span className="text-[10px] font-medium text-bronze">
                                          Selected
                                        </span>
                                      )}
                                    </span>
                                    {isActive && (
                                      <Check
                                        className="h-4 w-4 shrink-0 text-bronze"
                                        strokeWidth={2.5}
                                        aria-hidden
                                      />
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveEntry(product.id, inRoom)}
                                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-ink/8 active:scale-90"
                                    aria-label={`Remove ${product.name}`}
                                  >
                                    <X className="h-3.5 w-3.5" strokeWidth={2} />
                                  </button>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold leading-snug text-ink">
                    {activeProduct.name}
                  </p>
                  {statusLine ? (
                    <p className="mt-0.5 text-[11px] font-medium text-ink-muted">{statusLine}</p>
                  ) : (
                    <p className="mt-1 font-display text-[1.35rem] font-semibold leading-none text-bronze drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)]">
                      {activeProduct.price}
                    </p>
                  )}
                  {statusLine && (
                    <p className="mt-0.5 font-display text-sm font-semibold text-bronze">
                      {activeProduct.price}
                    </p>
                  )}
                  {activeProduct.variants && activeProduct.variants.length > 0 && (
                    <div className="mt-1.5 flex flex-nowrap items-center gap-1.5">
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

                <div className="flex shrink-0 items-center gap-2 border-l border-white/40 pl-2.5">
                  {showPrimary && (
                    <button
                      type="button"
                      onClick={onPreview}
                      disabled={!canRunPreview}
                      aria-label={primaryLabel}
                      className={cn(
                        'flex items-center justify-center rounded-full font-semibold transition-all',
                        primaryIsIconOnly
                          ? 'h-9 w-9 glass-chip text-ink hover:bg-white/40 active:scale-95'
                          : cn(
                              'h-9 gap-1.5 px-3.5 text-xs',
                              canRunPreview
                                ? 'bg-bronze text-cream active:scale-95'
                                : 'cursor-not-allowed bg-white/20 text-ink/30'
                            )
                      )}
                    >
                      {primaryIsIconOnly ? (
                        <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3 shrink-0" strokeWidth={2} />
                          <span className="max-w-[7rem] truncate sm:max-w-none">
                            {primaryLabel}
                          </span>
                        </>
                      )}
                    </button>
                  )}
                  <div ref={cartMenuRef} className="relative">
                    <AddToCartButton
                      variant="pill"
                      successSignal={cartSuccessSignal}
                      onClick={() => {
                        if (pickCount > 1) {
                          setPickMenuOpen(false);
                          setCartMenuOpen((v) => !v);
                          return false;
                        }
                        if (activeProduct) onAddToCart?.(activeProduct);
                      }}
                    />
                    <AnimatePresence>
                      {cartMenuOpen && pickCount > 1 && (
                        <motion.div
                          role="menu"
                          aria-label="Add to cart options"
                          initial={{ opacity: 0, y: 6, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.97 }}
                          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                          className="absolute bottom-[calc(100%+0.5rem)] right-0 z-[120] min-w-[11.5rem] overflow-hidden rounded-xl border border-ink/10 bg-cream p-1 shadow-[0_12px_40px_rgba(28,26,23,0.22)]"
                        >
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => confirmAddToCart('one')}
                            className="flex w-full rounded-lg px-3 py-2.5 text-left text-xs font-semibold text-ink hover:bg-parchment/80 active:bg-parchment"
                          >
                            This item only
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => confirmAddToCart('all')}
                            className="flex w-full rounded-lg px-3 py-2.5 text-left text-xs font-semibold text-ink hover:bg-parchment/80 active:bg-parchment"
                          >
                            All selected
                            <span className="ml-1 tabular-nums text-ink-muted">({pickCount})</span>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )
          )}
        </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
