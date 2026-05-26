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
        'mx-auto flex w-full snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto overscroll-x-contain px-4 pb-1 no-scrollbar max-md:-mx-4 max-md:scroll-px-6 max-md:px-6',
        'md:mx-auto md:grid md:grid-cols-7 md:gap-3.5 md:overflow-visible md:px-0 md:snap-none lg:gap-4',
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
              'group flex w-[6.75rem] shrink-0 snap-center flex-col items-center justify-between gap-2 overflow-hidden rounded-2xl border bg-cream p-2.5 transition-all duration-200 sm:w-[7.5rem] sm:gap-2.5 sm:rounded-2xl sm:p-3 md:w-full md:min-w-0 md:max-w-[9.5rem] md:justify-self-center',
              isSelected
                ? 'border-bronze/50 shadow-[0_6px_22px_rgba(28,26,23,0.14)] ring-1 ring-bronze/20'
                : 'border-ink/10 shadow-[0_3px_14px_rgba(28,26,23,0.08)] hover:border-ink/18'
            )}
          >
            <div className="relative flex h-[7.75rem] w-full items-center justify-center overflow-hidden rounded-xl bg-cream sm:h-[9.25rem] md:h-[10.75rem]">
              {cat.image ? (
                <div className="flex h-full w-full items-center justify-center transition-transform duration-300 group-hover:scale-[1.06]">
                  <img
                    src={cat.image}
                    alt=""
                    className="h-[118%] w-[118%] max-h-none max-w-none object-contain object-center"
                    loading="lazy"
                  />
                </div>
              ) : (
                <Icon
                  className={cn(
                    'h-14 w-14 transition-colors sm:h-16 sm:w-16 md:h-[4.5rem] md:w-[4.5rem]',
                    isSelected ? 'text-bronze' : 'text-ink group-hover:text-ink'
                  )}
                  strokeWidth={1.85}
                />
              )}
            </div>
            <span
              className={cn(
                'w-full pb-0.5 text-center text-sm font-semibold leading-tight tracking-wide sm:text-[15px]',
                isSelected ? 'text-bronze' : 'text-ink'
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
