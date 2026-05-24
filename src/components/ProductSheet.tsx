import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Home, Sparkles, MessageCircle, ChevronRight } from 'lucide-react';
import { cn } from '../lib/cn';
import {
  getProductDisplayImage,
  getProductVariant,
  type Product,
} from '../data/scenes';
import { slidePanel, slideSheet } from '../lib/motion';
import { useMediaQuery } from '../hooks/useMediaQuery';

interface ProductSheetProps {
  product: Product | null;
  colorSelections: Record<string, string>;
  onColorSelect: (productId: string, variantId: string) => void;
  onTryInRoom: (product: Product) => void;
  onOpenAI?: () => void;
  onClose: () => void;
  onAddToCart?: () => void;
}

function ColorSwatches({
  product,
  selectedVariantId,
  onSelect,
  variant = 'default',
}: {
  product: Product;
  selectedVariantId: string | undefined;
  onSelect: (variantId: string) => void;
  variant?: 'default' | 'compact';
}) {
  const variants = product.variants;
  if (!variants?.length) return null;

  const activeId = selectedVariantId ?? variants[0].id;
  const activeVariant = variants.find((v) => v.id === activeId);

  if (variant === 'compact') {
    return (
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-ink-faint">
            Finish
          </p>
          {activeVariant && (
            <p className="text-xs font-medium text-bronze">{activeVariant.name}</p>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          {variants.map((v) => {
            const isSelected = v.id === activeId;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => onSelect(v.id)}
                className={cn(
                  'relative h-9 w-9 rounded-full border-2 transition-all duration-200',
                  isSelected
                    ? 'border-ink scale-110 shadow-[0_2px_12px_rgba(28,26,23,0.12)]'
                    : 'border-ink/10 hover:scale-105 hover:border-ink/25'
                )}
                style={{ backgroundColor: v.swatch }}
                aria-label={v.name}
                aria-pressed={isSelected}
              >
                {isSelected && (
                  <span className="absolute inset-[3px] rounded-full ring-1 ring-white/80" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-ink-faint">
        Finish
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {variants.map((v) => {
          const isSelected = v.id === activeId;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => onSelect(v.id)}
              className={cn(
                'flex items-center gap-2 rounded-full border px-2 py-1.5 transition-all duration-200',
                isSelected
                  ? 'border-ink/30 bg-parchment shadow-[0_2px_8px_rgba(28,26,23,0.08)]'
                  : 'border-ink/10 bg-cream/60 hover:border-ink/20 hover:bg-parchment/60'
              )}
              aria-label={v.name}
              aria-pressed={isSelected}
            >
              <span
                className={cn(
                  'h-6 w-6 shrink-0 rounded-full border-2',
                  isSelected ? 'border-ink/30 ring-2 ring-ink/10 ring-offset-1' : 'border-ink/10'
                )}
                style={{ backgroundColor: v.swatch }}
              />
              <span
                className={cn(
                  'pr-0.5 text-xs font-medium',
                  isSelected ? 'text-ink' : 'text-ink-muted'
                )}
              >
                {v.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ProductSidebarDetail({
  product,
  displayImage,
  selectedVariantId,
  onColorSelect,
  onTryInRoom,
  onOpenAI,
  onAddToCart,
  onClose,
}: {
  product: Product;
  displayImage: string;
  selectedVariantId: string | undefined;
  onColorSelect: (variantId: string) => void;
  onTryInRoom: () => void;
  onOpenAI?: () => void;
  onAddToCart?: () => void;
  onClose: () => void;
}) {
  const activeVariant = getProductVariant(product, selectedVariantId);

  return (
    <div className="flex h-full min-h-0 flex-col bg-cream">
      {/* Hero image */}
      <div className="relative shrink-0 overflow-hidden bg-[#EDE9E1]">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(240,228,212,0.9)_0%,transparent_65%)]"
          aria-hidden
        />
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full glass-chip text-ink-muted transition-all hover:text-ink active:scale-95"
          aria-label="Close product detail"
        >
          <X className="h-4 w-4" strokeWidth={1.75} />
        </button>

        <motion.img
          key={displayImage}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          src={displayImage}
          alt={product.name}
          className="relative mx-auto block h-[min(38vh,300px)] w-full max-w-[340px] object-contain p-8 pb-10 mix-blend-multiply"
        />

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-cream to-transparent"
          aria-hidden
        />
      </div>

      {/* Content — overlaps hero slightly */}
      <div className="relative z-10 -mt-5 flex min-h-0 flex-1 flex-col rounded-t-[1.75rem] bg-cream shadow-[0_-4px_24px_rgba(28,26,23,0.04)]">
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain no-scrollbar px-6 pt-6 pb-4">
          <div className="mb-5 flex items-start justify-between gap-4 border-b border-ink/6 pb-5">
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-[1.65rem] font-medium leading-[1.15] tracking-tight text-ink">
                {product.name}
              </h2>
              {activeVariant && (
                <p className="mt-1.5 text-sm text-ink-muted">{activeVariant.name}</p>
              )}
            </div>
            <p className="shrink-0 font-display text-xl font-medium italic text-bronze">
              {product.price}
            </p>
          </div>

          <ColorSwatches
            product={product}
            selectedVariantId={selectedVariantId}
            onSelect={onColorSelect}
            variant="compact"
          />

          <p className="mt-5 text-[13px] leading-[1.65] text-ink-muted">{product.description}</p>

          {onOpenAI && (
            <button
              type="button"
              onClick={onOpenAI}
              className="group mt-5 flex w-full items-center gap-3 rounded-xl border border-ink/6 bg-parchment/50 px-3.5 py-3 text-left transition-all hover:border-ink/12 hover:bg-parchment active:scale-[0.99]"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cream shadow-sm">
                <MessageCircle className="h-4 w-4 text-bronze" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-ink">Ask AI</span>
                <span className="block text-xs text-ink-faint">Fit, style & pairing advice</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
            </button>
          )}
        </div>

        {/* Sticky actions */}
        <footer className="shrink-0 border-t border-ink/6 bg-cream/95 px-6 py-4 backdrop-blur-md">
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={onTryInRoom}
              className="group flex w-full items-center justify-center gap-2 rounded-full bg-bronze py-3.5 text-sm font-semibold text-cream shadow-[0_4px_20px_rgba(184,114,58,0.28)] transition-all hover:bg-bronze/92 active:scale-[0.99]"
            >
              <Home className="h-4 w-4" strokeWidth={1.75} />
              Room visualizer
              <Sparkles className="h-3.5 w-3.5 opacity-75" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={onAddToCart}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-ink/10 py-3 text-sm font-medium text-ink-muted transition-all hover:border-ink/18 hover:bg-parchment/80 hover:text-ink active:scale-[0.99]"
            >
              <ShoppingBag className="h-4 w-4" strokeWidth={1.75} />
              Add to cart
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function ProductSheetDetail({
  product,
  displayImage,
  selectedVariantId,
  onColorSelect,
  onTryInRoom,
  onOpenAI,
  onAddToCart,
  onClose,
}: {
  product: Product;
  displayImage: string;
  selectedVariantId: string | undefined;
  onColorSelect: (variantId: string) => void;
  onTryInRoom: () => void;
  onOpenAI?: () => void;
  onAddToCart?: () => void;
  onClose: () => void;
}) {
  const activeVariant = getProductVariant(product, selectedVariantId);

  return (
    <>
      <header className="flex shrink-0 items-center justify-between border-b border-ink/8 px-4 py-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-ink-faint">
          Product
        </p>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-all hover:bg-parchment active:scale-95"
          aria-label="Close"
        >
          <X className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain no-scrollbar">
        <div className="relative mx-4 mt-3 overflow-hidden rounded-2xl bg-parchment/60">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-bronze-soft/25 via-transparent to-transparent" />
          <motion.img
            key={displayImage}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            src={displayImage}
            alt={product.name}
            className="relative aspect-[4/3] w-full object-contain p-3 mix-blend-multiply"
          />
        </div>

        <div className="space-y-4 px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold tracking-tight text-ink">{product.name}</h2>
              {activeVariant && (
                <p className="mt-1 font-display text-sm italic text-bronze">{activeVariant.name}</p>
              )}
            </div>
            <span className="shrink-0 font-display text-sm italic text-ink">{product.price}</span>
          </div>

          <ColorSwatches
            product={product}
            selectedVariantId={selectedVariantId}
            onSelect={onColorSelect}
          />

          <p className="text-sm leading-relaxed text-ink-muted">{product.description}</p>

          {onOpenAI && (
            <button
              type="button"
              onClick={onOpenAI}
              className="group flex w-full items-center gap-3 rounded-xl border border-ink/8 bg-parchment/50 p-3.5 text-left transition-all active:scale-[0.99] hover:border-ink/14"
            >
              <Sparkles className="h-4 w-4 shrink-0 text-bronze" strokeWidth={1.75} />
              <span className="flex-1 text-sm font-medium text-ink">Ask AI about this piece</span>
              <ChevronRight className="h-4 w-4 text-ink-faint" />
            </button>
          )}
        </div>
      </div>

      <footer className="shrink-0 space-y-2 border-t border-ink/8 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={onTryInRoom}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-bronze py-3.5 text-sm font-semibold text-cream shadow-[0_4px_18px_rgba(184,114,58,0.28)] active:scale-[0.99]"
        >
          <Home className="h-4 w-4" strokeWidth={1.75} />
          Room visualizer
        </button>
        <button
          type="button"
          onClick={onAddToCart}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-ink/12 py-3 text-sm font-medium text-ink-muted active:scale-[0.99]"
        >
          <ShoppingBag className="h-4 w-4" strokeWidth={1.75} />
          Add to cart
        </button>
      </footer>
    </>
  );
}

export default function ProductSheet({
  product,
  colorSelections,
  onColorSelect,
  onTryInRoom,
  onOpenAI,
  onClose,
  onAddToCart,
}: ProductSheetProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const selectedVariantId = product ? colorSelections[product.id] : undefined;
  const displayImage = product ? getProductDisplayImage(product, colorSelections) : '';

  const handleColorSelect = (variantId: string) => {
    if (!product) return;
    onColorSelect(product.id, variantId);
  };

  return (
    <AnimatePresence>
      {product && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className={cn(
              'fixed inset-0 z-40',
              isDesktop ? 'bg-ink/6' : 'bg-ink/30 backdrop-blur-sm'
            )}
          />

          {isDesktop ? (
            <motion.aside
              variants={slidePanel}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed top-0 right-0 bottom-0 z-50 flex w-full max-w-[400px] flex-col overflow-hidden shadow-[-12px_0_48px_rgba(28,26,23,0.08)]"
              role="dialog"
              aria-modal="true"
              aria-label={`${product.name} details`}
            >
              <ProductSidebarDetail
                product={product}
                displayImage={displayImage}
                selectedVariantId={selectedVariantId}
                onColorSelect={handleColorSelect}
                onTryInRoom={() => onTryInRoom(product)}
                onOpenAI={onOpenAI}
                onClose={onClose}
                onAddToCart={onAddToCart}
              />
            </motion.aside>
          ) : (
            <motion.div
              role="dialog"
              aria-modal="true"
              variants={slideSheet}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed inset-x-0 bottom-0 z-50 flex max-h-[min(92dvh,700px)] flex-col rounded-t-[1.75rem] glass-panel shadow-[0_-8px_40px_rgba(28,26,23,0.10)]"
            >
              <div className="flex shrink-0 justify-center pt-3 pb-1">
                <span className="h-1 w-8 rounded-full bg-ink/20" aria-hidden />
              </div>
              <ProductSheetDetail
                product={product}
                displayImage={displayImage}
                selectedVariantId={selectedVariantId}
                onColorSelect={handleColorSelect}
                onTryInRoom={() => onTryInRoom(product)}
                onOpenAI={onOpenAI}
                onClose={onClose}
                onAddToCart={onAddToCart}
              />
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}
