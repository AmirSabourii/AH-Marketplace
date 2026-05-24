import { motion } from 'framer-motion';
import { CATEGORIES, type CategoryId } from '../data/categories';
import { cn } from '../lib/cn';

interface CategoryImagePickerProps {
  selectedCategory: CategoryId;
  onSelectCategory: (id: CategoryId) => void;
  variant?: 'hero' | 'header';
  className?: string;
}

const allCategory = CATEGORIES.find((c) => c.id === 'all')!;
const imageCategories = CATEGORIES.filter((c) => c.id !== 'all' && c.image);
const pickerCategories = [allCategory, ...imageCategories];

export default function CategoryImagePicker({
  selectedCategory,
  onSelectCategory,
  variant = 'hero',
  className,
}: CategoryImagePickerProps) {
  const isHeader = variant === 'header';

  if (isHeader) {
    return (
      <nav
        aria-label="Categories"
        className={cn(
          'flex min-w-0 flex-1 items-center gap-1 overflow-x-auto overscroll-x-contain no-scrollbar',
          className
        )}
      >
        {pickerCategories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={cn(
                'shrink-0 rounded-full px-2.5 py-1.5 text-[11px] font-medium transition-all duration-200 sm:px-3.5 sm:text-[13px]',
                isSelected
                  ? 'bg-ink text-cream shadow-[0_2px_10px_rgba(28,26,23,0.16)]'
                  : 'text-ink-muted hover:bg-cream/80 hover:text-ink'
              )}
            >
              {cat.label}
            </button>
          );
        })}
      </nav>
    );
  }

  return (
    <div
      className={cn(
        'mx-auto grid w-full grid-cols-4 gap-2 sm:grid-cols-7 sm:gap-2.5',
        className
      )}
      role="list"
      aria-label="Shop by category"
    >
      {pickerCategories.map((cat, index) => {
        const isSelected = selectedCategory === cat.id;
        const Icon = cat.icon;

        return (
          <motion.button
            key={cat.id}
            type="button"
            role="listitem"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: index * 0.05 }}
            onClick={() => onSelectCategory(cat.id)}
            className={cn(
              'group flex w-full flex-col items-center gap-1.5 rounded-xl p-1.5 transition-all duration-200 sm:gap-2 sm:p-2',
              isSelected
                ? 'bg-cream shadow-[0_4px_20px_rgba(28,26,23,0.08)] ring-1 ring-bronze/25'
                : 'bg-parchment/40 hover:bg-cream/60'
            )}
          >
            <div className="relative flex h-[56px] w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-parchment/80 to-cream/40 sm:h-[64px]">
              {cat.image ? (
                <img
                  src={cat.image}
                  alt=""
                  className="h-[118%] w-[118%] max-w-none object-contain opacity-90 mix-blend-multiply transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <Icon
                  className={cn(
                    'h-7 w-7 transition-colors sm:h-8 sm:w-8',
                    isSelected ? 'text-bronze' : 'text-ink-muted/50 group-hover:text-ink-muted'
                  )}
                  strokeWidth={1.5}
                />
              )}
            </div>
            <span
              className={cn(
                'text-[10px] font-semibold tracking-wide sm:text-[11px]',
                isSelected ? 'text-bronze' : 'text-ink-muted group-hover:text-ink'
              )}
            >
              {cat.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
