import { motion } from 'framer-motion';
import { cn } from '../lib/cn';
import type { DetectedRoomElement } from '../lib/roomAnalysis/types';

interface RoomElementSpotProps {
  element: DetectedRoomElement;
  index: number;
  isActive: boolean;
  onSelect: (element: DetectedRoomElement) => void;
}

export default function RoomElementSpot({
  element,
  index,
  isActive,
  onSelect,
}: RoomElementSpotProps) {
  const { x, y } = element.anchor;

  return (
    <div
      className="absolute z-20 -translate-x-1/2 touch-manipulation"
      style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
    >
      <motion.button
        type="button"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          delay: 0.06 + index * 0.035,
          type: 'spring',
          stiffness: 480,
          damping: 28,
        }}
        onClick={() => onSelect(element)}
        className="group relative flex flex-col items-center"
        aria-label={`Customize ${element.label}`}
        aria-current={isActive ? 'true' : undefined}
      >
        {isActive && (
          <motion.span
            layoutId="room-spot-label"
            className="glass-spot-label mb-1.5 max-w-[10rem] truncate px-2.5 py-1 text-[10px] font-medium tracking-wide text-cream/95"
          >
            {element.label}
          </motion.span>
        )}

        <span
          className={cn(
            'glass-spot relative flex h-6 w-6 items-center justify-center rounded-full transition-all duration-300 sm:h-7 sm:w-7',
            isActive && 'glass-spot-active scale-110'
          )}
          aria-hidden
        >
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full transition-colors duration-300',
              isActive ? 'bg-cream' : 'bg-cream/85 group-hover:bg-cream'
            )}
          />
          {!isActive && (
            <span
              className="absolute inset-0 rounded-full border border-cream/25 animate-ping opacity-40"
              style={{ animationDuration: '2.5s' }}
              aria-hidden
            />
          )}
        </span>
      </motion.button>
    </div>
  );
}
