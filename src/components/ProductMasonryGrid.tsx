import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Home, Sparkles } from 'lucide-react';
import { SCENES, type Product } from '../data/scenes';
import type { CategoryId } from '../data/categories';
import CategoryImagePicker from './CategoryImagePicker';
import ShoppingPipeline from './ShoppingPipeline';
import { cn } from '../lib/cn';

interface ProductMasonryGridProps {
  selectedCategory: CategoryId;
  onProductClick: (product: Product) => void;
  onTryInRoom?: (product: Product) => void;
  onCategorySelect?: (id: CategoryId) => void;
  onOpenAI?: () => void;
  onOpenVisualizer?: () => void;
  isSidebar?: boolean;
  hasSavedRoom?: boolean;
  stagedProducts?: Product[];
  activeStagedProductId?: string | null;
}

export default function ProductMasonryGrid({
  selectedCategory,
  onProductClick,
  onTryInRoom,
  onCategorySelect,
  onOpenAI,
  onOpenVisualizer,
  isSidebar = false,
  hasSavedRoom = false,
  stagedProducts,
  activeStagedProductId,
}: ProductMasonryGridProps) {
  const ASPECT_RATIOS = [
    'aspect-[3/4]',
    'aspect-[4/3]',
    'aspect-[4/5]',
    'aspect-square',
    'aspect-[2/3]',
    'aspect-[3/2]',
    'aspect-[5/4]',
    'aspect-[16/9]',
    'aspect-[9/16]',
  ];

  const stagedIds = useMemo(
    () => new Set(stagedProducts?.map((p) => p.id) ?? []),
    [stagedProducts]
  );

  const filteredProducts = useMemo(
    () =>
      SCENES.filter(
        (scene) => selectedCategory === 'all' || scene.categoryId === selectedCategory
      ).flatMap((scene) => scene.products.map((product) => ({ product, scene }))),
    [selectedCategory]
  );

  return (
    <section
      id="products-grid"
      className={cn(
        'mx-auto px-4 py-12',
        isSidebar
          ? 'min-h-full w-full pb-8 pt-4'
          : 'min-h-screen max-w-[1600px] pb-28 pt-6 sm:px-6 sm:pb-32 md:px-8 lg:px-12'
      )}
    >
      {!isSidebar && (
        <ShoppingPipeline
          onOpenAI={onOpenAI}
          onOpenVisualizer={onOpenVisualizer}
          className="mb-8 w-full"
        />
      )}

      {isSidebar && onCategorySelect && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-20 -mx-4 mb-6 bg-cream/95 px-4 pb-4 pt-2 backdrop-blur-sm"
        >
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-ink-muted">
            {hasSavedRoom
              ? 'Tap to stage · tap again to remove'
              : 'Pick products to stage'}
          </p>
          <CategoryImagePicker
            selectedCategory={selectedCategory}
            onSelectCategory={onCategorySelect}
            variant="header"
          />
        </motion.div>
      )}

      {!isSidebar && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 flex flex-wrap items-end justify-between gap-3"
        >
          <motion.div>
            <h2 className="font-display text-3xl font-light capitalize text-ink md:text-4xl">
              {selectedCategory === 'all' ? 'All Collection' : `${selectedCategory} Collection`}
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              Hover to preview in the room visualizer
            </p>
          </motion.div>
          {selectedCategory !== 'all' && onCategorySelect && (
            <button
              type="button"
              onClick={() => onCategorySelect('all')}
              className="rounded-full border border-ink/10 bg-cream px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:border-ink/20 hover:text-ink"
            >
              View all
            </button>
          )}
        </motion.div>
      )}

      <motion.div
        layout
        className={cn(
          'gap-4',
          isSidebar ? 'columns-2' : 'columns-2 md:columns-3 lg:columns-4 sm:gap-6'
        )}
      >
        <AnimatePresence mode="popLayout">
          {filteredProducts.map(({ product, scene }, index) => {
            const heightClass = ASPECT_RATIOS[index % ASPECT_RATIOS.length];
            const isStaged = stagedIds.has(product.id);
            const isActive = activeStagedProductId === product.id;

            return (
              <motion.div
                layout
                key={product.id}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ duration: 0.4, delay: (index % 4) * 0.05 }}
                className="group relative mb-4 flex cursor-pointer flex-col break-inside-avoid"
                onClick={() => onProductClick(product)}
              >
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                  className={cn(
                    'relative w-full overflow-hidden rounded-2xl bg-parchment/60',
                    heightClass,
                    isStaged && 'ring-2 ring-bronze',
                    isActive && isStaged && 'ring-offset-2 ring-offset-cream'
                  )}
                >
                  <img
                    src={scene.image}
                    alt={product.name}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-ink/0 transition-colors duration-300 group-hover:bg-ink/10" />

                  {isSidebar && isStaged && (
                    <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-bronze text-cream shadow-sm">
                      <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </span>
                  )}

                  {onTryInRoom && !isSidebar && (
                    <motion.div
                      initial={false}
                      className="absolute inset-x-0 bottom-0 hidden translate-y-2 justify-center p-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 md:flex"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTryInRoom(product);
                        }}
                        className="flex items-center gap-1.5 rounded-full bg-bronze px-3.5 py-2 text-xs font-semibold text-cream shadow-lg transition-transform active:scale-95"
                      >
                        <Home className="h-3.5 w-3.5" strokeWidth={1.75} />
                        {hasSavedRoom ? 'Preview' : 'Try in room'}
                        <Sparkles className="h-3 w-3 opacity-80" strokeWidth={2} />
                      </button>
                    </motion.div>
                  )}

                  {onTryInRoom && !isSidebar && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTryInRoom(product);
                      }}
                      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-cream/90 text-bronze shadow-sm backdrop-blur-sm transition-all active:scale-95 md:opacity-0 md:group-hover:opacity-100"
                      aria-label={`Try ${product.name} in my room`}
                    >
                      <Home className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </button>
                  )}
                </motion.div>

                <motion.div layout className="mt-2.5 flex flex-col px-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="line-clamp-1 text-sm font-medium text-ink">{product.name}</h3>
                    <span className="shrink-0 font-display text-xs italic text-bronze">
                      {product.price}
                    </span>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}
