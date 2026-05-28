import { useMemo } from 'react';
import { getMasonryLayout, masonryAspectRatioStyle } from '../lib/masonryImageAspect';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Home, Plus, Sparkles } from 'lucide-react';
import type { Product } from '../data/scenes';
import type { CategoryId } from '../data/categories';
import type { CatalogItem } from '../lib/medusa/products';
import type { AIContext } from '../types/ai';
import { useFilteredCatalog } from '../hooks/useCatalogProducts';
import CategoryImagePicker from './CategoryImagePicker';
import ShoppingPipeline from './ShoppingPipeline';
import VisualizerSidebarAI from './VisualizerSidebarAI';
import SidebarAiButton from './SidebarAiButton';
import { cn } from '../lib/cn';

interface ProductMasonryGridProps {
  catalog: CatalogItem[];
  catalogLoading?: boolean;
  catalogError?: string | null;
  onRetryCatalog?: () => void;
  selectedCategory: CategoryId;
  onProductClick: (product: Product) => void;
  onTryInRoom?: (product: Product) => void;
  onCategorySelect?: (id: CategoryId) => void;
  onOpenAI?: () => void;
  onOpenVisualizer?: () => void;
  isSidebar?: boolean;
  hasSavedRoom?: boolean;
  stagedProducts?: Product[];
  placedProducts?: Product[];
  activeStagedProductId?: string | null;
  sidebarAiOpen?: boolean;
  aiContext?: AIContext;
  aiInitialQuery?: string;
  onClearAiInitialQuery?: () => void;
  onOpenSidebarAI?: () => void;
  onCloseSidebarAI?: () => void;
  onAddToCart?: (product: Product) => void;
  onProductClickFromAi?: (product: Product) => void;
}

export default function ProductMasonryGrid({
  catalog,
  catalogLoading = false,
  catalogError = null,
  onRetryCatalog,
  selectedCategory,
  onProductClick,
  onTryInRoom,
  onCategorySelect,
  onOpenAI,
  onOpenVisualizer,
  isSidebar = false,
  hasSavedRoom = false,
  stagedProducts = [],
  placedProducts = [],
  activeStagedProductId,
  sidebarAiOpen = false,
  aiContext,
  aiInitialQuery,
  onClearAiInitialQuery,
  onOpenSidebarAI,
  onCloseSidebarAI,
  onAddToCart,
  onProductClickFromAi,
}: ProductMasonryGridProps) {
  const handleAiProductClick = onProductClickFromAi ?? onProductClick;

  const stagedIds = useMemo(
    () => new Set(stagedProducts?.map((p) => p.id) ?? []),
    [stagedProducts]
  );
  const placedIds = useMemo(
    () => new Set(placedProducts?.map((p) => p.id) ?? []),
    [placedProducts]
  );

  const filteredItems = useFilteredCatalog(catalog, selectedCategory);

  return (
    <section
      id="products-grid"
      className={cn(
        'mx-auto px-4 py-12',
        isSidebar
          ? 'flex h-screen min-h-0 w-full flex-col overflow-hidden py-0 pt-0'
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

      {isSidebar && aiContext && onCloseSidebarAI && onOpenSidebarAI && (
        <AnimatePresence mode="wait">
          {sidebarAiOpen ? (
            <VisualizerSidebarAI
              key="sidebar-ai"
              className="min-h-0 flex-1"
              context={aiContext}
              active={sidebarAiOpen}
              initialQuery={aiInitialQuery}
              onClearInitialQuery={onClearAiInitialQuery}
              onBack={onCloseSidebarAI}
              onTryInRoom={onTryInRoom}
              onAddToCart={onAddToCart}
              onProductClick={handleAiProductClick}
            />
          ) : (
            <motion.div
              key="sidebar-shop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex min-h-0 flex-1 flex-col overflow-hidden"
            >
              {onCategorySelect && (
                <div className="sticky top-0 z-20 shrink-0 border-b border-ink/6 bg-cream/95 px-4 py-3 backdrop-blur-sm">
                  <div className="flex min-w-0 items-center gap-2">
                    <CategoryImagePicker
                      selectedCategory={selectedCategory}
                      onSelectCategory={onCategorySelect}
                      variant="header"
                      className="min-w-0 flex-1"
                    />
                    <SidebarAiButton onClick={onOpenSidebarAI} />
                  </div>
                </div>
              )}

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-8 pt-4 no-scrollbar">
                {catalogLoading && (
                  <p className="py-12 text-center text-sm text-ink-muted">Loading products…</p>
                )}
                {catalogError && !catalogLoading && (
                  <div className="rounded-2xl border border-ink/10 bg-parchment/40 px-6 py-10 text-center">
                    <p className="text-sm text-ink-muted">{catalogError}</p>
                    {onRetryCatalog && (
                      <button
                        type="button"
                        onClick={onRetryCatalog}
                        className="mt-4 rounded-full border border-ink/15 px-4 py-2 text-sm font-medium text-ink hover:border-ink/25"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                )}
                <div className="columns-2 gap-4">
                  <AnimatePresence mode="sync">
                    {!catalogLoading &&
                      !catalogError &&
                      filteredItems.map(({ product, displayImage }, index) => {
                        const layout = getMasonryLayout(index, true);
                        const isSelected =
                          placedIds.has(product.id) || stagedIds.has(product.id);
                        const isActive = activeStagedProductId === product.id;
                        return (
                          <motion.div
                            key={product.id}
                            initial={{ opacity: 0, scale: 0.95, y: 12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.35, delay: (index % 4) * 0.04 }}
                            className="group relative mb-4 flex cursor-pointer flex-col break-inside-avoid"
                            onClick={() => onProductClick(product)}
                          >
                            <div
                              style={masonryAspectRatioStyle(layout.aspectRatio)}
                              className={cn(
                                'relative w-full overflow-hidden rounded-2xl bg-parchment/60',
                                isSelected && 'ring-2 ring-bronze/35',
                                isActive && isSelected && 'ring-ink/30'
                              )}
                            >
                              <img
                                src={displayImage}
                                alt={product.name}
                                className="absolute inset-0 m-auto h-full w-full object-contain object-center p-4 mix-blend-multiply sm:p-5"
                                loading="lazy"
                              />
                              <span
                                className={cn(
                                  'absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full shadow-sm backdrop-blur-sm',
                                  isSelected
                                    ? 'bg-bronze text-cream'
                                    : 'bg-cream/95 text-ink-muted ring-1 ring-ink/10'
                                )}
                                aria-hidden
                              >
                                {isSelected ? (
                                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                                ) : (
                                  <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                                )}
                              </span>
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-1 px-0.5">
                              <p className="line-clamp-1 text-[11px] font-medium text-ink">
                                {product.name}
                              </p>
                              <span className="shrink-0 font-display text-[10px] italic text-bronze">
                                {product.price}
                              </span>
                            </div>
                          </motion.div>
                        );
                      })}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {isSidebar && !aiContext && onCategorySelect && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-20 -mx-4 mb-6 bg-cream/95 px-4 pb-4 pt-2 backdrop-blur-sm"
        >
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

      {(!isSidebar || !aiContext) && catalogLoading && (
        <p className="py-12 text-center text-sm text-ink-muted">Loading products…</p>
      )}

      {(!isSidebar || !aiContext) && catalogError && !catalogLoading && (
        <div className="rounded-2xl border border-ink/10 bg-parchment/40 px-6 py-10 text-center">
          <p className="text-sm text-ink-muted">{catalogError}</p>
          {onRetryCatalog && (
            <button
              type="button"
              onClick={onRetryCatalog}
              className="mt-4 rounded-full border border-ink/15 px-4 py-2 text-sm font-medium text-ink hover:border-ink/25"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {(!isSidebar || !aiContext) && (
      <motion.div
        layout={!isSidebar}
        className={cn(
          'gap-4 sm:gap-6',
          isSidebar
            ? 'columns-2'
            : 'grid grid-flow-dense auto-rows-auto grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
        )}
      >
        <AnimatePresence mode={isSidebar ? 'sync' : 'popLayout'}>
          {!catalogLoading &&
            !catalogError &&
            filteredItems.map(({ product, displayImage }, index) => {
            const layout = getMasonryLayout(index, isSidebar);
            const isSelected = placedIds.has(product.id) || stagedIds.has(product.id);
            const isActive = activeStagedProductId === product.id;

            return (
              <motion.div
                layout={!isSidebar}
                key={product.id}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ duration: 0.4, delay: (index % 4) * 0.05 }}
                className={cn(
                  'group relative flex min-w-0 cursor-pointer flex-col',
                  isSidebar ? 'mb-4 break-inside-avoid' : layout.colSpan === 2 && 'col-span-2'
                )}
                onClick={() => onProductClick(product)}
              >
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                  style={masonryAspectRatioStyle(layout.aspectRatio)}
                  className={cn(
                    'relative w-full overflow-hidden rounded-2xl bg-parchment/60',
                    isSelected && 'ring-2 ring-bronze/35',
                    isActive && isSelected && 'ring-ink/30'
                  )}
                >
                  <img
                    src={displayImage}
                    alt={product.name}
                    className="absolute inset-0 m-auto h-full w-full object-contain object-center p-4 mix-blend-multiply transition-transform duration-700 group-hover:scale-[1.03] sm:p-5"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-ink/0 transition-colors duration-300 group-hover:bg-ink/10" />

                  {isSidebar && (
                    <span
                      className={cn(
                        'absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full shadow-sm backdrop-blur-sm transition-colors',
                        isSelected
                          ? 'bg-bronze text-cream'
                          : 'bg-cream/95 text-ink-muted ring-1 ring-ink/10'
                      )}
                      aria-hidden
                    >
                      {isSelected ? (
                        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                      ) : (
                        <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                      )}
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

                </motion.div>

                <motion.div layout className="mt-2.5 flex flex-col px-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="line-clamp-1 text-sm font-medium text-ink">{product.name}</h3>
                    <span className="shrink-0 font-display text-sm font-medium italic text-bronze sm:text-base">
                      {product.price}
                    </span>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
      )}
    </section>
  );
}
