import { useMemo } from 'react';
import { Home, ListChecks, X } from 'lucide-react';
import type { Product } from '../data/scenes';
import type { CatalogItem } from '../lib/medusa/products';
import { buildSelectionEntries } from '../lib/visualizer/selectionEntries';
import { cn } from '../lib/cn';

export type { SelectionEntry } from '../lib/visualizer/selectionEntries';

interface VisualizerSelectionStripProps {
  catalog: CatalogItem[];
  stagedProducts: Product[];
  placedProducts: Product[];
  activeProductId: string | null;
  onFocusProduct: (productId: string) => void;
  onRemoveStaged: (productId: string) => void;
  onRemovePlaced: (productId: string) => void;
}

export default function VisualizerSelectionStrip({
  catalog,
  stagedProducts,
  placedProducts,
  activeProductId,
  onFocusProduct,
  onRemoveStaged,
  onRemovePlaced,
}: VisualizerSelectionStripProps) {
  const entries = useMemo(
    () => buildSelectionEntries(catalog, stagedProducts, placedProducts),
    [catalog, stagedProducts, placedProducts]
  );

  if (entries.length === 0) return null;

  return (
    <div className="space-y-2 md:mb-4 md:space-y-2.5">
      <div className="flex items-center gap-2 md:justify-between">
        <p className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
          Your picks
          <span className="ml-1.5 tabular-nums text-ink">{entries.length}</span>
        </p>
        <span className="hidden rounded-full bg-ink/8 px-2 py-0.5 text-[10px] font-bold tabular-nums text-ink md:inline">
          {entries.length}
        </span>
      </div>

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 no-scrollbar md:mx-0 md:gap-2 md:px-0">
        {entries.map(({ product, kind, imageUrl }) => {
          const isActive = activeProductId === product.id;
          return (
            <div
              key={product.id}
              className={cn(
                'relative shrink-0',
                isActive && 'z-[1]'
              )}
            >
              <button
                type="button"
                onClick={() => onFocusProduct(product.id)}
                className={cn(
                  'flex w-[3.75rem] flex-col items-center gap-0.5 rounded-lg border bg-parchment/50 p-1 transition-all active:scale-[0.97] md:w-[4.5rem] md:gap-1 md:rounded-xl md:p-1.5',
                  isActive
                    ? 'border-ink/25 bg-cream shadow-[0_2px_10px_rgba(28,26,23,0.08)]'
                    : 'border-ink/10 hover:border-ink/18'
                )}
                aria-label={`${product.name}, ${kind === 'placed' ? 'in room' : 'queued for preview'}`}
                aria-pressed={isActive}
              >
                <span className="relative block h-10 w-full overflow-hidden rounded-md bg-cream/80 md:h-12 md:rounded-lg">
                  <img
                    src={imageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <span
                    className={cn(
                      'absolute bottom-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full shadow-sm',
                      kind === 'placed' ? 'bg-ink text-cream' : 'bg-bronze text-cream'
                    )}
                  >
                    {kind === 'placed' ? (
                      <Home className="h-2.5 w-2.5" strokeWidth={2} />
                    ) : (
                      <ListChecks className="h-2.5 w-2.5" strokeWidth={2} />
                    )}
                  </span>
                </span>
                <span className="line-clamp-1 hidden w-full px-0.5 text-center text-[9px] font-medium leading-tight text-ink md:block">
                  {product.name}
                </span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (kind === 'placed') {
                    onRemovePlaced(product.id);
                  } else {
                    onRemoveStaged(product.id);
                  }
                }}
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-cream shadow-sm transition-transform active:scale-90"
                aria-label={`Remove ${product.name}`}
              >
                <X className="h-3 w-3" strokeWidth={2.5} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="hidden flex-wrap gap-x-3 gap-y-1 text-[10px] text-ink-muted md:flex">
        <span className="inline-flex items-center gap-1">
          <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-bronze text-cream">
            <ListChecks className="h-2 w-2" strokeWidth={2.5} />
          </span>
          Queued — included in Preview
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-ink text-cream">
            <Home className="h-2 w-2" strokeWidth={2} />
          </span>
          In room — already staged
        </span>
      </div>
      <p className="hidden text-[10px] leading-snug text-ink-faint md:block">
        Tap a product below to add or remove · tap a chip above to focus details
      </p>
    </div>
  );
}
