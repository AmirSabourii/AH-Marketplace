import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  ImagePlus,
  Share2,
  SlidersHorizontal,
} from 'lucide-react';
import CartIconButton from './CartIconButton';
import VisualizerAiActions from './VisualizerAiActions';
import { cn } from '../lib/cn';
import type { VisualizerChromeState } from './visualizerChrome';

function HeaderDivider() {
  return <span className="mx-0.5 h-5 w-px shrink-0 bg-white/15" aria-hidden />;
}

interface VisualizerHeaderProps {
  cartCount?: number;
  cartPulseKey?: number;
  stagedCount?: number;
  onBackToShop?: () => void;
  onCartClick?: () => void;
  chrome?: VisualizerChromeState;
}

/** Centered within the visualizer panel — not the full viewport */
export default function VisualizerHeader({
  cartCount = 0,
  cartPulseKey = 0,
  stagedCount = 0,
  onBackToShop,
  onCartClick,
  chrome,
}: VisualizerHeaderProps) {
  const {
    canShare = false,
    shareFeedback = 'idle',
    onShare = () => {},
    showCompare = false,
    isComparing = false,
    onToggleCompare = () => {},
    showChangePhoto = false,
    onChangeRoomPhoto = () => {},
    showAiRoomStudio = false,
    aiRoomDisabled = true,
    aiRoomBusy = false,
    aiBusyAction = null,
    canRearrange = false,
    canCurate = false,
    onRearrange = () => {},
    onCurate = () => {},
  } = chrome ?? {};

  return (
    <header
      aria-label="Visualizer controls"
      className="pointer-events-none absolute inset-x-0 top-0 z-[60] flex justify-center px-4 pt-[max(0.75rem,env(safe-area-inset-top))] sm:pt-4"
    >
      <motion.div
        initial={{ y: -20, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="pointer-events-auto inline-flex max-w-[calc(100%-0.5rem)] items-center gap-0.5 rounded-full glass-dark px-1.5 py-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
      >
        <button
          type="button"
          onClick={onBackToShop}
          className="relative flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-cream/90 transition-all duration-200 hover:bg-white/10 active:scale-95"
          aria-label="Back to shop"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          <span className="text-xs font-medium">Shop</span>
          {stagedCount > 0 && (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-bronze px-1.5 text-[10px] font-semibold text-cream">
              {stagedCount}
            </span>
          )}
        </button>

        <HeaderDivider />

        {showChangePhoto && (
          <>
            <button
              type="button"
              onClick={onChangeRoomPhoto}
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-cream/90 transition-all duration-200 hover:bg-white/10 active:scale-95"
              aria-label="Change room"
            >
              <ImagePlus className="h-4 w-4" strokeWidth={1.75} />
              <span className="hidden min-[420px]:inline">Change room</span>
            </button>
            <HeaderDivider />
          </>
        )}

        {showCompare && (
          <>
            <button
              type="button"
              onClick={onToggleCompare}
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-200 active:scale-95',
                isComparing
                  ? 'bg-bronze text-cream shadow-md'
                  : 'text-cream/85 hover:bg-white/10'
              )}
              aria-label="Compare before and after"
              aria-pressed={isComparing}
            >
              <SlidersHorizontal className="h-4 w-4" strokeWidth={1.75} />
            </button>
            <HeaderDivider />
          </>
        )}

        {showAiRoomStudio && (
          <>
            <VisualizerAiActions
              variant="toolbar"
              disabled={aiRoomDisabled}
              busy={aiRoomBusy}
              busyAction={aiBusyAction}
              canRearrange={canRearrange}
              canCurate={canCurate}
              onRearrange={onRearrange}
              onCurate={onCurate}
            />
            <HeaderDivider />
          </>
        )}

        <button
          type="button"
          onClick={onShare}
          disabled={!canShare}
          className={cn(
            'flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-all duration-200 active:scale-95',
            canShare
              ? 'text-cream/90 hover:bg-white/10'
              : 'cursor-not-allowed text-cream/35'
          )}
          aria-label="Share visualization"
        >
          {shareFeedback !== 'idle' ? (
            <Check className="h-4 w-4 text-[#8BC48B]" strokeWidth={2} />
          ) : (
            <Share2 className="h-4 w-4" strokeWidth={1.75} />
          )}
          <span className="hidden sm:inline">
            {shareFeedback === 'copied'
              ? 'Copied'
              : shareFeedback === 'shared'
                ? 'Shared'
                : 'Share'}
          </span>
        </button>

        <HeaderDivider />

        <CartIconButton
          cartCount={cartCount}
          pulseKey={cartPulseKey}
          onClick={onCartClick}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cream/12 text-cream transition-all duration-200 hover:bg-cream/20 active:scale-95"
          iconClassName="h-4 w-4"
        />
      </motion.div>
    </header>
  );
}
