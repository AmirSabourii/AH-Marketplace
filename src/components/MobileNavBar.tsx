import { motion } from 'framer-motion';
import { Home, LayoutGrid, ShoppingBag, Sparkles } from 'lucide-react';
import { cn } from '../lib/cn';

interface MobileNavBarProps {
  cartCount: number;
  tryInRoomActive: boolean;
  hasSavedRoom: boolean;
  stagedCount: number;
  onShopClick: () => void;
  onMyRoomClick: () => void;
  onCartClick: () => void;
}

export default function MobileNavBar({
  cartCount,
  tryInRoomActive,
  hasSavedRoom,
  stagedCount,
  onShopClick,
  onMyRoomClick,
  onCartClick,
}: MobileNavBarProps) {
  return (
    <nav
      aria-label="Main navigation"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28, delay: 0.2 }}
        className="pointer-events-auto flex w-full max-w-md items-center gap-1 rounded-full glass-strong p-1.5 shadow-[0_8px_32px_rgba(28,26,23,0.12)]"
      >
        <button
          type="button"
          onClick={onShopClick}
          className={cn(
            'flex flex-1 flex-col items-center gap-0.5 rounded-full py-2 text-[10px] font-medium transition-all duration-200 active:scale-95',
            !tryInRoomActive ? 'text-ink' : 'text-ink-muted hover:text-ink'
          )}
          aria-label="Browse shop"
          aria-current={!tryInRoomActive ? 'page' : undefined}
        >
          <LayoutGrid className="h-[18px] w-[18px]" strokeWidth={1.75} />
          Shop
        </button>

        <button
          type="button"
          onClick={onMyRoomClick}
          className={cn(
            'relative flex flex-[1.35] flex-col items-center gap-0.5 rounded-full py-2.5 text-[10px] font-semibold transition-all duration-200 active:scale-95',
            tryInRoomActive
              ? 'bg-ink text-cream shadow-[0_4px_16px_rgba(28,26,23,0.20)]'
              : 'bg-bronze text-cream shadow-[0_4px_16px_rgba(184,114,58,0.35)] hover:bg-bronze/90'
          )}
          aria-label="Open room visualizer"
          aria-current={tryInRoomActive ? 'page' : undefined}
        >
          <span className="relative flex h-[18px] w-[18px] items-center justify-center">
            <Home className="h-[18px] w-[18px]" strokeWidth={1.75} />
            {(hasSavedRoom || stagedCount > 0) && (
              <span className="absolute -right-1.5 -top-1.5 flex h-2 w-2 rounded-full bg-cream ring-2 ring-bronze" />
            )}
          </span>
          <span className="flex items-center gap-1">
            Visualizer
            {!tryInRoomActive && <Sparkles className="h-2.5 w-2.5 opacity-80" strokeWidth={2} />}
          </span>
          {stagedCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-cream px-1 text-[9px] font-bold text-ink">
              {stagedCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={onCartClick}
          className="relative flex flex-1 flex-col items-center gap-0.5 rounded-full py-2 text-[10px] font-medium text-ink-muted transition-all duration-200 hover:text-ink active:scale-95"
          aria-label="Shopping cart"
        >
          <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={1.75} />
          Cart
          {cartCount > 0 && (
            <span className="absolute right-3 top-1 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-bronze px-1 text-[9px] font-semibold text-cream">
              {cartCount}
            </span>
          )}
        </button>
      </motion.div>
    </nav>
  );
}
