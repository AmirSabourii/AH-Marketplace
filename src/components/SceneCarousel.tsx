import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import type { CategoryId } from '../data/categories';
import { getSceneDisplayImage, type Product, type Scene } from '../data/scenes';
import StagedScene from './StagedScene';

interface SceneCarouselProps {
  categoryId:              CategoryId;
  scenes:                  Scene[];
  highlightProductId:      string | null;
  colorSelections:         Record<string, string>;
  customRoomBySceneId:     Record<string, string>;
  scrollToSceneId?:        string | null;
  onScrollToSceneApplied?: () => void;
  onProductClick:          (product: Product) => void;
}

export default function SceneCarousel({
  categoryId,
  scenes,
  highlightProductId,
  colorSelections,
  customRoomBySceneId,
  scrollToSceneId,
  onScrollToSceneApplied,
  onProductClick,
}: SceneCarouselProps) {
  const scrollRef   = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const activeScene = scenes[activeIndex] ?? scenes[0];

  const scrollToIndex = useCallback((idx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(idx, scenes.length - 1));
    const slide   = el.children[clamped] as HTMLElement | undefined;
    slide?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
  }, [scenes.length]);

  useEffect(() => {
    if (!scrollToSceneId) return;
    const idx = scenes.findIndex((s) => s.id === scrollToSceneId);
    if (idx >= 0) scrollToIndex(idx);
    onScrollToSceneApplied?.();
  }, [scrollToSceneId, scenes, scrollToIndex, onScrollToSceneApplied]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root || scenes.length <= 1) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const idx = Number(visible.target.getAttribute('data-scene-index'));
        if (!Number.isNaN(idx)) setActiveIndex(idx);
      },
      { root, threshold: 0.55 }
    );

    Array.from(root.children).forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, [scenes.length]);

  const paginate = (dir: number) => scrollToIndex(activeIndex + dir);

  if (!activeScene) return null;

  return (
    <div className="relative h-full w-full">
      {/* Horizontal snap scroll */}
      <div
        ref={scrollRef}
        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain no-scrollbar touch-pan-x"
        aria-label="Room scenes"
      >
        {scenes.map((scene, idx) => (
          <div
            key={scene.id}
            data-scene-index={idx}
            className="relative h-full w-full shrink-0 snap-start snap-always"
          >
            <StagedScene
              imageSrc={getSceneDisplayImage(scene, colorSelections, customRoomBySceneId)}
              alt={scene.title}
              categoryId={categoryId}
              sceneId={scene.id}
              products={scene.products}
              colorSelections={colorSelections}
              activeProductId={highlightProductId}
              onProductClick={onProductClick}
            />
          </div>
        ))}
      </div>

      {/* Scene title chip — top center */}
      <div className="pointer-events-none absolute inset-x-0 top-[max(4.5rem,env(safe-area-inset-top))] z-30 flex justify-center px-3">
        <p className="glass-chip max-w-[min(100%,22rem)] truncate rounded-full px-4 py-2 text-center text-[11px] font-medium tracking-wide text-cream/95 sm:text-xs">
          {activeScene.title}
        </p>
      </div>

      {/* Pagination — bottom center */}
      {scenes.length > 1 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-6">
          <div className="pointer-events-auto flex items-center gap-1.5 glass-strong rounded-full px-2 py-1.5 sm:gap-2 sm:px-2.5 sm:py-2">

            {/* Prev */}
            <button
              type="button"
              onClick={() => paginate(-1)}
              disabled={activeIndex === 0}
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink transition-all duration-200 hover:bg-parchment/60 disabled:opacity-30 sm:h-8 sm:w-8"
              aria-label="Previous scene"
            >
              <ChevronLeft className="h-4.5 w-4.5" strokeWidth={1.75} />
            </button>

            {/* Dot indicators */}
            <div className="flex items-center gap-1.5 px-0.5">
              {scenes.map((scene, idx) => (
                <motion.button
                  key={scene.id}
                  type="button"
                  onClick={() => scrollToIndex(idx)}
                  animate={{
                    width: idx === activeIndex ? 20 : 6,
                    backgroundColor:
                      idx === activeIndex
                        ? 'rgb(184, 114, 58)'   /* bronze */
                        : 'rgba(28, 26, 23, 0.28)',
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                  className="h-1.5 rounded-full"
                  aria-label={scene.title}
                  aria-current={idx === activeIndex ? 'true' : undefined}
                />
              ))}
            </div>

            {/* Next */}
            <button
              type="button"
              onClick={() => paginate(1)}
              disabled={activeIndex >= scenes.length - 1}
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink transition-all duration-200 hover:bg-parchment/60 disabled:opacity-30 sm:h-8 sm:w-8"
              aria-label="Next scene"
            >
              <ChevronRight className="h-4.5 w-4.5" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
