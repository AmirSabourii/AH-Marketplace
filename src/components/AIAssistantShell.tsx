import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Sparkles } from 'lucide-react';
import { cn } from '../lib/cn';
import { slidePanel, slideSheet } from '../lib/motion';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useAIAssistantChat } from '../hooks/useAIAssistantChat';
import { PANEL_Z } from '../lib/panelLayers';
import type { AIContext } from '../types/ai';
import type { Product } from '../data/scenes';
import AIChatPanel from './AIChatPanel';

export interface AIAssistantShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: AIContext;
  initialQuery?: string;
  onClearInitialQuery?: () => void;
  showCollapsed: boolean;
  placement: 'shop' | 'visualizer';
  onChatActiveChange?: (active: boolean) => void;
  onTryInRoom?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  onProductClick?: (product: Product) => void;
}

export function AIAssistantTrigger({
  onClick,
  variant = 'light',
  className,
  label = 'AI',
}: {
  onClick: () => void;
  variant?: 'light' | 'dark';
  className?: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-all active:scale-95',
        variant === 'dark'
          ? 'glass-dark text-cream/90 hover:bg-white/10'
          : 'bg-ink/5 text-ink hover:bg-ink/10',
        className
      )}
      aria-label="Open AI designer"
    >
      <MessageCircle className="h-4 w-4 text-bronze" strokeWidth={1.75} />
      <span className="hidden min-[380px]:inline">{label}</span>
    </button>
  );
}

export default function AIAssistantShell({
  open,
  onOpenChange,
  context,
  initialQuery,
  onClearInitialQuery,
  showCollapsed,
  placement,
  onChatActiveChange,
  onTryInRoom,
  onAddToCart,
  onProductClick,
}: AIAssistantShellProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const chat = useAIAssistantChat({
    context,
    active: open,
    initialQuery,
    onClearInitialQuery,
  });

  const panelZ =
    placement === 'visualizer' && !isDesktop
      ? PANEL_Z.aiVisualizerExpanded
      : PANEL_Z.aiPanel;
  const backdropZ =
    placement === 'visualizer' && !isDesktop
      ? PANEL_Z.aiVisualizerExpanded - 1
      : PANEL_Z.aiBackdrop;

  useEffect(() => {
    const notifyHero = placement === 'shop' && chat.chatActive;
    onChatActiveChange?.(notifyHero);
    return () => onChatActiveChange?.(false);
  }, [chat.chatActive, onChatActiveChange, placement]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const handleClose = () => {
    chat.stop();
    onOpenChange(false);
  };

  return (
    <>
      <AnimatePresence>
        {showCollapsed && !open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className={cn(
              'pointer-events-none fixed z-[var(--ai-fab-z)] flex justify-center',
              placement === 'shop'
                ? 'inset-x-0 bottom-[max(1.25rem,env(safe-area-inset-bottom))]'
                : 'right-4 bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-auto w-auto max-w-none'
            )}
            style={{ '--ai-fab-z': PANEL_Z.aiCollapsed } as React.CSSProperties}
          >
            <button
              type="button"
              onClick={() => onOpenChange(true)}
              className={cn(
                'pointer-events-auto flex items-center gap-2.5 rounded-full glass-strong py-3 pl-4 pr-5 shadow-[0_8px_32px_rgba(28,26,23,0.14)] transition-colors hover:bg-parchment/90 active:scale-[0.98]',
                chat.chatActive && 'ring-2 ring-bronze/25'
              )}
            >
              <Sparkles className="h-5 w-5 text-bronze" strokeWidth={1.75} />
              <span className="text-sm font-medium text-ink">Ask AI Designer</span>
              {chat.chatActive && (
                <span
                  className="flex h-2 w-2 rounded-full bg-bronze"
                  aria-label="Conversation in progress"
                />
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className={cn(
                'fixed inset-0',
                isDesktop ? 'bg-ink/10' : 'bg-ink/35 backdrop-blur-sm'
              )}
              style={{ zIndex: backdropZ }}
              aria-hidden
            />

            {isDesktop ? (
              <motion.aside
                variants={slidePanel}
                initial="hidden"
                animate="visible"
                exit="exit"
                role="dialog"
                aria-modal="true"
                aria-label="AI designer assistant"
                className="fixed top-0 right-0 bottom-0 flex w-full max-w-[400px] flex-col overflow-hidden glass-panel-solid shadow-[-12px_0_48px_rgba(28,26,23,0.10)]"
                style={{ zIndex: panelZ }}
              >
                <AIChatPanel
                  layout="sidebar"
                  headerMode="close"
                  onHeaderAction={handleClose}
                  {...chat}
                  onTryInRoom={onTryInRoom}
                  onAddToCart={onAddToCart}
                  onProductClick={onProductClick}
                />
              </motion.aside>
            ) : (
              <motion.div
                variants={slideSheet}
                initial="hidden"
                animate="visible"
                exit="exit"
                role="dialog"
                aria-modal="true"
                aria-label="AI designer assistant"
                className="fixed inset-x-0 bottom-0 flex max-h-[min(92dvh,720px)] flex-col rounded-t-[1.75rem] glass-panel shadow-[0_-8px_40px_rgba(28,26,23,0.12)]"
                style={{ zIndex: panelZ }}
              >
                <div className="flex shrink-0 justify-center pt-3 pb-1">
                  <span className="h-1 w-8 rounded-full bg-ink/20" aria-hidden />
                </div>
                <AIChatPanel
                  layout="sheet"
                  headerMode="close"
                  onHeaderAction={handleClose}
                  {...chat}
                  onTryInRoom={onTryInRoom}
                  onAddToCart={onAddToCart}
                  onProductClick={onProductClick}
                />
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>
    </>
  );
}
