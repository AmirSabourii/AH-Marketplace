import { motion } from 'framer-motion';
import { cn } from '../lib/cn';
import type { Product } from '../data/scenes';

interface ProductSpotProps {
  product:  Product;
  thumbSrc: string;
  /** Normalized anchor 0–1 within the scene frame */
  anchorX:  number;
  anchorY:  number;
  index:    number;
  isActive: boolean;
  onSelect: (product: Product) => void;
}

/*
  Anchor model (stable — does not shift on scroll or click):
  - (left, top) = product point on the staged image
  - Dot sits exactly on that pixel
  - Chip stacks upward from the dot; size changes never move the anchor
*/
export default function ProductSpot({
  product,
  thumbSrc,
  anchorX,
  anchorY,
  index,
  isActive,
  onSelect,
}: ProductSpotProps) {
  return (
    /* Position wrapper — % coords move with the scene frame on scroll/resize */
    <div
      className="absolute z-20 -translate-x-1/2 touch-manipulation"
      style={{ left: `${anchorX * 100}%`, top: `${anchorY * 100}%` }}
    >
      <motion.button
        type="button"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          delay: 0.12 + index * 0.06,
          type: 'spring',
          stiffness: 420,
          damping: 26,
        }}
        onClick={() => onSelect(product)}
        className="group relative flex flex-col items-center"
        aria-label={`View ${product.name}`}
        aria-current={isActive ? 'true' : undefined}
      >
        {/* Chip — always present, same footprint; only styles change when active */}
        <span
          className={cn(
            'relative mb-1.5 flex items-center gap-2 rounded-xl p-1 pr-2.5 transition-all duration-200 sm:gap-2.5 sm:rounded-2xl sm:p-1.5 sm:pr-3',
            isActive
              ? 'glass-strong shadow-[0_8px_28px_rgba(28,26,23,0.14)] ring-1 ring-bronze/40'
              : 'glass-chip group-hover:scale-[1.03] active:scale-[1.03]'
          )}
        >
          <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg ring-1 ring-white/60 sm:h-11 sm:w-11 sm:rounded-xl">
            <img
              src={thumbSrc}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
            {isActive && (
              <span className="absolute inset-0 rounded-lg ring-2 ring-bronze/50 ring-inset sm:rounded-xl" />
            )}
          </span>
          <span className="hidden min-w-0 flex-col items-start text-left min-[380px]:flex">
            <span
              className={cn(
                'max-w-[7rem] truncate text-[11px] font-semibold tracking-tight sm:max-w-[9rem] sm:text-xs',
                isActive ? 'text-ink' : 'text-ink'
              )}
            >
              {product.name}
            </span>
            <span className="font-display text-[10px] font-light italic text-bronze sm:text-[11px]">
              {product.price}
            </span>
          </span>
          {/* Pointer tail — bottom of chip points at anchor dot */}
          <span
            className={cn(
              'absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border border-white/70',
              isActive ? 'bg-parchment' : 'bg-white/80'
            )}
            aria-hidden
          />
        </span>

        {/* Anchor dot — fixed at (left, top) on the scene */}
        <span
          className={cn(
            'h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-cream/80 transition-colors duration-200',
            isActive ? 'bg-bronze' : 'bg-cream/90 group-hover:bg-bronze/70'
          )}
          aria-hidden
        />
      </motion.button>
    </div>
  );
}
