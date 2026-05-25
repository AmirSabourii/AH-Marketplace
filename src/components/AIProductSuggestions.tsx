import { motion } from 'framer-motion';
import { Home, ShoppingBag, Sparkles } from 'lucide-react';
import type { Product } from '../data/scenes';
import { cn } from '../lib/cn';

interface AIProductSuggestionsProps {
  products: Product[];
  onTryInRoom: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onProductClick?: (product: Product) => void;
  className?: string;
}

export default function AIProductSuggestions({
  products,
  onTryInRoom,
  onAddToCart,
  onProductClick,
  className,
}: AIProductSuggestionsProps) {
  if (products.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn('mt-3 w-full', className)}
    >
      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
        <Sparkles className="h-3 w-3 text-bronze" strokeWidth={2} />
        Suggested for you
      </p>

      <div className="-mx-1 flex gap-2.5 overflow-x-auto overscroll-x-contain px-1 pb-1 no-scrollbar">
        {products.map((product, index) => (
          <motion.article
            key={product.id}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.06, duration: 0.28 }}
            className="flex w-[min(72vw,220px)] shrink-0 flex-col overflow-hidden rounded-2xl border border-ink/8 bg-cream/95 shadow-[0_6px_24px_rgba(28,26,23,0.08)]"
          >
            <button
              type="button"
              onClick={() => onProductClick?.(product)}
              className="group relative aspect-[4/3] w-full overflow-hidden bg-parchment/50"
            >
              <img
                src={product.image}
                alt={product.name}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/25 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            </button>

            <div className="flex flex-1 flex-col gap-2 p-3">
              <button
                type="button"
                onClick={() => onProductClick?.(product)}
                className="text-left"
              >
                <h4 className="line-clamp-2 text-sm font-medium leading-snug text-ink">
                  {product.name}
                </h4>
                <p className="mt-0.5 font-display text-sm font-medium italic text-bronze">
                  {product.price}
                </p>
              </button>

              <div className="mt-auto flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => onTryInRoom(product)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-full bg-bronze px-3 py-2 text-xs font-semibold text-cream shadow-sm transition-transform active:scale-[0.98]"
                >
                  <Home className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Try in my room
                </button>
                <button
                  type="button"
                  onClick={() => onAddToCart(product)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-full border border-ink/12 bg-parchment/80 px-3 py-2 text-xs font-semibold text-ink transition-colors hover:bg-parchment active:scale-[0.98]"
                >
                  <ShoppingBag className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Add to cart
                </button>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </motion.div>
  );
}
