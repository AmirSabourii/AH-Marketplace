import { motion, AnimatePresence } from 'framer-motion';
import { Home, ShoppingBag, Sparkles, User } from 'lucide-react';
import CategoryImagePicker from './CategoryImagePicker';
import { type CategoryId } from '../data/categories';
import { cn } from '../lib/cn';

interface AppHeaderProps {
  cartCount?: number;
  onCartClick?: () => void;
  onUserClick?: () => void;
  onMyRoomClick?: () => void;
  selectedCategory: CategoryId;
  onCategorySelect: (id: CategoryId) => void;
  showCategories?: boolean;
  onLogoClick?: () => void;
  tryInRoomActive?: boolean;
  hasSavedRoom?: boolean;
  stagedCount?: number;
}

export default function AppHeader({
  cartCount = 0,
  onCartClick,
  onUserClick,
  onMyRoomClick,
  selectedCategory,
  onCategorySelect,
  showCategories = false,
  onLogoClick,
  tryInRoomActive = false,
  hasSavedRoom = false,
  stagedCount = 0,
}: AppHeaderProps) {
  if (tryInRoomActive) {
    return null;
  }

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-4 sm:pt-4">
      <motion.div
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.1 }}
        className={cn(
          'pointer-events-auto flex w-full items-center gap-1.5 glass-strong rounded-full shadow-[0_8px_32px_rgba(28,26,23,0.08)] transition-[max-width,padding] duration-300 ease-out sm:gap-2.5',
          showCategories
            ? 'max-w-4xl px-2 py-2 sm:px-3 sm:py-2.5'
            : 'max-w-[min(100%,24rem)] px-2 py-2 sm:max-w-[30rem] sm:px-3 sm:py-2'
        )}
      >
        <button
          type="button"
          onClick={onLogoClick}
          className="shrink-0 px-1 transition-opacity active:opacity-70"
          aria-label="Go to home"
        >
          <span className="font-display text-sm font-medium italic tracking-tight text-ink sm:text-base">
            T<span className="text-bronze not-italic">H</span>
          </span>
        </button>

        <AnimatePresence mode="wait">
          {showCategories ? (
            <motion.div
              key="categories"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="min-w-0 flex-1 overflow-hidden"
            >
              <CategoryImagePicker
                selectedCategory={selectedCategory}
                onSelectCategory={onCategorySelect}
                variant="header"
              />
            </motion.div>
          ) : (
            <motion.div key="spacer" className="min-w-0 flex-1" aria-hidden />
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={onMyRoomClick}
          className={cn(
            'relative flex shrink-0 items-center justify-center rounded-full transition-all duration-200 active:scale-95',
            'bg-bronze text-cream shadow-[0_2px_12px_rgba(184,114,58,0.30)] hover:bg-bronze/90',
            'h-9 w-9 sm:h-auto sm:w-auto sm:gap-1.5 sm:px-3 sm:py-2'
          )}
          aria-label="Open room visualizer"
        >
          <Home className="h-[16px] w-[16px] sm:h-3.5 sm:w-3.5" strokeWidth={1.75} />
          <span className="hidden text-xs font-semibold sm:inline">Room visualizer</span>
          {(hasSavedRoom || stagedCount > 0) && (
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-cream ring-2 ring-bronze" />
          )}
        </button>

        <motion.button
          type="button"
          onClick={onUserClick}
          className={cn(
            'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
            'bg-ink/5 text-ink transition-all duration-200 hover:bg-ink/10 active:scale-95'
          )}
          aria-label="User profile"
        >
          <User className="h-[16px] w-[16px]" strokeWidth={1.75} />
        </motion.button>

        <button
          type="button"
          onClick={onCartClick}
          className={cn(
            'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
            'bg-ink text-cream transition-all duration-200 hover:bg-ink/86 active:scale-95'
          )}
          aria-label="Shopping cart"
        >
          <ShoppingBag className="h-[16px] w-[16px]" strokeWidth={1.75} />
          <AnimatePresence>
            {cartCount > 0 && (
              <motion.span
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-bronze px-1 text-[10px] font-semibold text-cream shadow-sm"
              >
                {cartCount}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </motion.div>
    </header>
  );
}
