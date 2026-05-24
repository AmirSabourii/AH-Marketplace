import { useEffect, useRef } from 'react';
import type { CategoryId } from '../data/categories';
import { getScenesByCategory } from '../data/scenes';
import type { Product } from '../data/scenes';
import SceneCarousel from './SceneCarousel';

interface CategorySectionProps {
  categoryId: CategoryId;
  highlightProductId: string | null;
  colorSelections: Record<string, string>;
  customRoomBySceneId: Record<string, string>;
  scrollToSceneId?: string | null;
  onScrollToSceneApplied?: () => void;
  onProductClick: (product: Product) => void;
  onInView: (categoryId: CategoryId) => void;
  sectionRef?: (el: HTMLElement | null) => void;
}

export default function CategorySection({
  categoryId,
  highlightProductId,
  colorSelections,
  customRoomBySceneId,
  scrollToSceneId,
  onScrollToSceneApplied,
  onProductClick,
  onInView,
  sectionRef,
}: CategorySectionProps) {
  const localRef = useRef<HTMLElement>(null);
  const scenes = getScenesByCategory(categoryId);

  useEffect(() => {
    const el = localRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onInView(categoryId);
      },
      { threshold: 0.52 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [categoryId, onInView]);

  const setRef = (node: HTMLElement | null) => {
    localRef.current = node;
    sectionRef?.(node);
  };

  return (
    <section
      ref={setRef}
      data-category={categoryId}
      className="relative h-[100dvh] w-full shrink-0 snap-start snap-always overflow-hidden bg-neutral-950"
      aria-label={`${categoryId} category`}
    >
      <SceneCarousel
        categoryId={categoryId}
        scenes={scenes}
        highlightProductId={highlightProductId}
        colorSelections={colorSelections}
        customRoomBySceneId={customRoomBySceneId}
        scrollToSceneId={scrollToSceneId}
        onScrollToSceneApplied={onScrollToSceneApplied}
        onProductClick={onProductClick}
      />
    </section>
  );
}
