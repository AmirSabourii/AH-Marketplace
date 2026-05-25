import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Minus, Plus, Trash2, ArrowRight, Home, Sparkles } from 'lucide-react';
import { cn } from '../lib/cn';
import { slidePanel, slideSheet } from '../lib/motion';
import { useMediaQuery } from '../hooks/useMediaQuery';
import {
  getCartCount,
  getCartItemImage,
  getCartItemVariantName,
  getCartSubtotal,
  type CartItem,
} from '../lib/cart';

interface CartDrawerProps {
  open: boolean;
  items: CartItem[];
  colorSelections: Record<string, string>;
  highlightItemId?: string | null;
  onClose: () => void;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onCheckout?: () => void;
  onVisualizeInRoom?: () => void;
}

function CartBody({
  items,
  colorSelections,
  highlightItemId,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  onVisualizeInRoom,
  layout,
}: Omit<CartDrawerProps, 'open'> & { layout: 'sheet' | 'sidebar' }) {
  const isEmpty = items.length === 0;
  const itemCount = getCartCount(items);
  const subtotal = getCartSubtotal(items);

  return (
    <>
      <header
        className={cn(
          'flex shrink-0 items-center justify-between border-b border-ink/8',
          layout === 'sheet' ? 'px-4 py-3' : 'px-5 py-4'
        )}
      >
        <div className="flex items-center gap-2 text-ink-muted">
          <ShoppingBag className="h-3.5 w-3.5 text-bronze" strokeWidth={1.75} />
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.22em]">
              Shopping cart
            </p>
            {!isEmpty && (
              <p className="mt-0.5 text-xs text-ink-faint">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-all duration-200 hover:bg-parchment active:scale-95"
          aria-label="Close cart"
        >
          <X className="h-4.5 w-4.5" strokeWidth={1.5} />
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain no-scrollbar">
        {isEmpty ? (
          <div
            className={cn(
              'flex flex-1 flex-col items-center justify-center text-center',
              layout === 'sheet' ? 'px-6 py-10' : 'px-8 py-12'
            )}
          >
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-parchment shadow-[0_4px_16px_rgba(28,26,23,0.06)]">
              <ShoppingBag className="h-7 w-7 text-ink/25" strokeWidth={1.5} />
            </div>
            <h2 className="text-lg font-semibold text-ink">Your cart is empty</h2>
            <p className="mt-2 max-w-[240px] text-sm leading-relaxed text-ink-muted">
              Add pieces you love — they&apos;ll show up here ready for checkout.
            </p>
          </div>
        ) : (
          <ul
            className={cn(
              'divide-y divide-ink/6',
              layout === 'sheet' ? 'px-4 py-2' : 'px-5 py-3'
            )}
          >
            {items.map((item, index) => {
              const image = getCartItemImage(item, colorSelections);
              const variantName = getCartItemVariantName(item);
              const isHighlight = highlightItemId === item.id;

              return (
                <motion.li
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 16, scale: 0.97 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    backgroundColor: isHighlight
                      ? ['rgba(184,114,58,0.14)', 'rgba(184,114,58,0)']
                      : 'rgba(0,0,0,0)',
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 340,
                    damping: 30,
                    delay: isHighlight ? 0 : index * 0.04,
                    backgroundColor: { duration: 1.2, ease: 'easeOut' },
                  }}
                  className="flex gap-3 rounded-2xl py-4 first:pt-2 last:pb-2"
                >
                  <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-2xl bg-parchment/80 shadow-[0_2px_10px_rgba(28,26,23,0.06)]">
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-bronze-soft/25 via-transparent to-transparent" />
                    <img
                      src={image}
                      alt={item.product.name}
                      className="relative h-full w-full object-contain p-2"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-medium text-ink">
                          {item.product.name}
                        </h3>
                        {variantName && (
                          <p className="mt-0.5 font-display text-xs italic text-bronze">
                            {variantName}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 font-display text-sm italic text-ink">
                        {item.product.price}
                      </span>
                    </div>

                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-ink-muted">
                      {item.product.description}
                    </p>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1 rounded-full border border-ink/10 bg-cream/60 p-0.5">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateQuantity(item.id, item.quantity - 1)
                          }
                          className="flex h-7 w-7 items-center justify-center rounded-full text-ink-muted transition-all duration-200 hover:bg-parchment hover:text-ink active:scale-95"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                        <span className="min-w-[1.25rem] text-center text-xs font-medium text-ink">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateQuantity(item.id, item.quantity + 1)
                          }
                          className="flex h-7 w-7 items-center justify-center rounded-full text-ink-muted transition-all duration-200 hover:bg-parchment hover:text-ink active:scale-95"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.id)}
                        className="flex items-center gap-1 rounded-full px-2 py-1 text-xs text-ink-faint transition-all duration-200 hover:bg-parchment hover:text-ink-muted active:scale-95"
                        aria-label={`Remove ${item.product.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                        Remove
                      </button>
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </ul>
        )}
      </div>

      {!isEmpty && (
        <footer
          className={cn(
            'shrink-0 space-y-3 border-t border-ink/8',
            layout === 'sheet'
              ? 'p-4 pb-[max(1rem,env(safe-area-inset-bottom))]'
              : 'p-5'
          )}
        >
          <div className="flex items-center justify-between px-1">
            <span className="text-sm text-ink-muted">Subtotal</span>
            <span className="font-display text-lg font-medium italic text-ink">
              {subtotal}
            </span>
          </div>

          {onVisualizeInRoom && (
            <button
              type="button"
              onClick={onVisualizeInRoom}
              className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-full border border-bronze/30 bg-bronze/8 text-sm font-semibold text-bronze transition-all duration-200 hover:bg-bronze/12 active:scale-[0.99]"
            >
              <Home className="h-4 w-4" strokeWidth={1.75} />
              Visualize cart in my room
              <Sparkles className="h-3.5 w-3.5 opacity-80" strokeWidth={2} />
            </button>
          )}

          <button
            type="button"
            onClick={onCheckout}
            className="group flex w-full min-h-[52px] items-center justify-center gap-2 rounded-full bg-ink text-sm font-medium text-cream shadow-[0_4px_18px_rgba(28,26,23,0.16)] transition-all duration-200 active:scale-[0.99] hover:bg-ink/88 hover:shadow-[0_6px_24px_rgba(28,26,23,0.20)]"
          >
            Checkout
            <ArrowRight
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
              strokeWidth={1.75}
            />
          </button>
        </footer>
      )}
    </>
  );
}

export default function CartDrawer({
  open,
  items,
  colorSelections,
  highlightItemId = null,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  onVisualizeInRoom,
}: CartDrawerProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className={cn(
              'fixed inset-0 z-[60]',
              isDesktop ? 'bg-ink/8' : 'bg-ink/30 backdrop-blur-sm'
            )}
          />

          {isDesktop ? (
            <motion.aside
              variants={slidePanel}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed top-0 right-0 bottom-0 z-[70] flex w-full max-w-[420px] flex-col glass-panel-solid"
            >
              <CartBody
                items={items}
                colorSelections={colorSelections}
                highlightItemId={highlightItemId}
                onClose={onClose}
                onUpdateQuantity={onUpdateQuantity}
                onRemoveItem={onRemoveItem}
                onCheckout={onCheckout}
                onVisualizeInRoom={onVisualizeInRoom}
                layout="sidebar"
              />
            </motion.aside>
          ) : (
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Shopping cart"
              variants={slideSheet}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed inset-x-0 bottom-0 z-[70] flex max-h-[min(88dvh,640px)] flex-col rounded-t-[1.75rem] glass-panel shadow-[0_-8px_40px_rgba(28,26,23,0.10)]"
            >
              <div className="flex shrink-0 justify-center pt-3 pb-1">
                <span className="h-1 w-8 rounded-full bg-ink/20" aria-hidden />
              </div>
              <CartBody
                items={items}
                colorSelections={colorSelections}
                highlightItemId={highlightItemId}
                onClose={onClose}
                onUpdateQuantity={onUpdateQuantity}
                onRemoveItem={onRemoveItem}
                onCheckout={onCheckout}
                onVisualizeInRoom={onVisualizeInRoom}
                layout="sheet"
              />
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}
