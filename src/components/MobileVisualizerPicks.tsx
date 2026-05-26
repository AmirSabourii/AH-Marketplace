import { useMemo } from 'react';
import { ChevronRight, Home, ListChecks, X } from 'lucide-react';
import type { CatalogItem } from '../lib/medusa/products';
import type { Product } from '../data/scenes';
import { buildSelectionEntries } from '../lib/visualizer/selectionEntries';
import { cn } from '../lib/cn';

interface MobileVisualizerPicksProps {
  catalog: CatalogItem[];
  stagedProducts: Product[];
  placedProducts: Product[];
  activeProductId: string | null;
  onFocusProduct: (productId: string) => void;
  onOpenDetails: () => void;
  onRemoveStaged: (productId: string) => void;
  onRemovePlaced: (productId: string) => void;
}

export default function MobileVisualizerPicks({
  catalog,
  stagedProducts,
  placedProducts,
  activeProductId,
  onFocusProduct,
  onOpenDetails,
  onRemoveStaged,
  onRemovePlaced,
}: MobileVisualizerPicksProps) {
  const entries = useMemo(
    () => buildSelectionEntries(catalog, stagedProducts, placedProducts),
    [catalog, stagedProducts, placedProducts]
  );

  const queuedCount = entries.filter((e) => e.kind === 'staged').length;
  const inRoomCount = entries.filter((e) => e.kind === 'placed').length;

  if (entries.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
        <p className="text-sm font-medium text-ink">Nothing selected yet</p>
        <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
          Switch to Shop and tap + on products to queue them for preview.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 px-4 pb-2 pt-1">
        <p className="text-xs text-ink-muted">
          {queuedCount > 0 && (
            <span>
              <span className="font-semibold text-bronze">{queuedCount}</span> queued for preview
            </span>
          )}
          {queuedCount > 0 && inRoomCount > 0 && ' · '}
          {inRoomCount > 0 && (
            <span>
              <span className="font-semibold text-ink">{inRoomCount}</span> already in room
            </span>
          )}
        </p>
      </div>

      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-4 pb-2 no-scrollbar">
        {entries.map(({ product, kind, imageUrl }) => {
          const isActive = activeProductId === product.id;
          return (
            <li key={product.id}>
              <div
                className={cn(
                  'flex items-center gap-3 rounded-2xl border bg-cream p-2.5 transition-colors',
                  isActive ? 'border-ink/22 shadow-sm' : 'border-ink/8'
                )}
              >
                <button
                  type="button"
                  onClick={() => onFocusProduct(product.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left active:opacity-80"
                  aria-pressed={isActive}
                >
                  <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-parchment/70">
                    <img
                      src={imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    <span
                      className={cn(
                        'absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full shadow-sm',
                        kind === 'placed' ? 'bg-ink text-cream' : 'bg-bronze text-cream'
                      )}
                    >
                      {kind === 'placed' ? (
                        <Home className="h-3 w-3" strokeWidth={2} />
                      ) : (
                        <ListChecks className="h-3 w-3" strokeWidth={2} />
                      )}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-sm font-semibold leading-snug text-ink">
                      {product.name}
                    </span>
                    <span
                      className={cn(
                        'mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                        kind === 'placed'
                          ? 'bg-ink/10 text-ink'
                          : 'bg-bronze/15 text-bronze'
                      )}
                    >
                      {kind === 'placed' ? 'In room' : 'Queued'}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint" strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    kind === 'placed' ? onRemovePlaced(product.id) : onRemoveStaged(product.id)
                  }
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-parchment text-ink-muted transition-colors active:bg-ink/10 active:text-ink"
                  aria-label={`Remove ${product.name}`}
                >
                  <X className="h-4 w-4" strokeWidth={2.25} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="shrink-0 border-t border-ink/6 px-4 py-2.5">
        <button
          type="button"
          onClick={onOpenDetails}
          className="w-full rounded-xl bg-parchment py-2.5 text-xs font-semibold text-ink transition-colors active:bg-parchment/80"
        >
          Open details for selected item
        </button>
      </div>
    </div>
  );
}
