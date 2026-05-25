import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag } from 'lucide-react';
import { cn } from '../lib/cn';

interface CartIconButtonProps {
  cartCount: number;
  pulseKey?: number;
  onClick?: () => void;
  className?: string;
  iconClassName?: string;
  badgeClassName?: string;
  'aria-label'?: string;
}

export default function CartIconButton({
  cartCount,
  pulseKey = 0,
  onClick,
  className,
  iconClassName,
  badgeClassName,
  'aria-label': ariaLabel = 'Shopping cart',
}: CartIconButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      animate={
        pulseKey > 0
          ? {
              scale: [1, 1.12, 1],
            }
          : { scale: 1 }
      }
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={cn('relative', className)}
    >
      <ShoppingBag className={iconClassName} strokeWidth={1.75} />
      <AnimatePresence mode="popLayout">
        {cartCount > 0 && (
          <motion.span
            key={cartCount}
            initial={{ scale: 0, opacity: 0, y: 4 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 520, damping: 22 }}
            className={cn(
              'absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-bronze px-1 text-[10px] font-semibold text-cream shadow-sm',
              badgeClassName
            )}
          >
            {cartCount}
          </motion.span>
        )}
      </AnimatePresence>
      {pulseKey > 0 && (
        <motion.span
          key={pulseKey}
          initial={{ scale: 0.6, opacity: 0.7 }}
          animate={{ scale: 2.2, opacity: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="pointer-events-none absolute inset-0 rounded-full bg-bronze/35"
          aria-hidden
        />
      )}
    </motion.button>
  );
}
