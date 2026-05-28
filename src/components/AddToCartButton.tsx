import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ShoppingBag } from 'lucide-react';
import { cn } from '../lib/cn';

type AddToCartVariant = 'pill' | 'icon' | 'full';

interface AddToCartButtonProps {
  /** Return false to skip the success animation (e.g. when opening a menu). */
  onClick: () => void | false;
  variant?: AddToCartVariant;
  className?: string;
  label?: string;
  disabled?: boolean;
  /** Increment to play the success animation after an external confirm step. */
  successSignal?: number;
}

export default function AddToCartButton({
  onClick,
  variant = 'pill',
  className,
  label = 'Add',
  disabled = false,
  successSignal = 0,
}: AddToCartButtonProps) {
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    if (!successSignal) return;
    setJustAdded(true);
    const t = window.setTimeout(() => setJustAdded(false), 1400);
    return () => window.clearTimeout(t);
  }, [successSignal]);

  const handleClick = useCallback(() => {
    if (disabled || justAdded) return;
    if (onClick() === false) return;
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1400);
  }, [disabled, justAdded, onClick]);

  const isIcon = variant === 'icon';
  const isFull = variant === 'full';

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      whileTap={{ scale: disabled ? 1 : 0.94 }}
      animate={
        justAdded
          ? {
              scale: [1, 1.06, 1],
            }
          : { scale: 1 }
      }
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'relative overflow-hidden transition-colors',
        isIcon && 'flex h-9 w-9 items-center justify-center rounded-full',
        isFull &&
          'flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold',
        variant === 'pill' &&
          'flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-medium',
        justAdded
          ? 'bg-[#5a9a5a] text-cream'
          : isFull
            ? 'bg-ink text-cream'
            : isIcon
              ? 'bg-ink text-cream'
              : 'bg-ink text-cream',
        disabled && 'cursor-not-allowed opacity-40',
        className
      )}
      aria-label={justAdded ? 'Added to cart' : 'Add to cart'}
    >
      <AnimatePresence mode="wait" initial={false}>
        {justAdded ? (
          <motion.span
            key="check"
            initial={{ opacity: 0, scale: 0.5, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 480, damping: 24 }}
            className="flex items-center justify-center gap-1.5"
          >
            <Check className={cn(isIcon ? 'h-4 w-4' : 'h-3.5 w-3.5')} strokeWidth={2.5} />
            {!isIcon && <span>{isFull ? 'Added' : label}</span>}
          </motion.span>
        ) : (
          <motion.span
            key="bag"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center justify-center gap-1.5"
          >
            <ShoppingBag
              className={cn(isIcon ? 'h-4 w-4' : isFull ? 'h-4 w-4' : 'h-3 w-3')}
              strokeWidth={1.75}
            />
            {!isIcon && <span>{isFull ? 'Add to cart' : label}</span>}
          </motion.span>
        )}
      </AnimatePresence>
      {justAdded && (
        <motion.span
          initial={{ opacity: 0.5, scale: 0.8 }}
          animate={{ opacity: 0, scale: 1.8 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="pointer-events-none absolute inset-0 rounded-full bg-cream/25"
          aria-hidden
        />
      )}
    </motion.button>
  );
}
