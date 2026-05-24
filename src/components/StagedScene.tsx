import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getObjectContainRect,
  getObjectCoverRect,
} from '../lib/imageFit';
import { useMediaQuery } from '../hooks/useMediaQuery';
import ProductSpot from './ProductSpot';
import type { CategoryId } from '../data/categories';
import ShareButton from './ShareButton';
import { getProductDisplayImage, type Product } from '../data/scenes';

interface StagedSceneProps {
  imageSrc:        string;
  alt:             string;
  categoryId:      CategoryId;
  sceneId:         string;
  products:        Product[];
  colorSelections: Record<string, string>;
  activeProductId: string | null;
  onProductClick:  (product: Product) => void;
}

export default function StagedScene({
  imageSrc,
  alt,
  categoryId,
  sceneId,
  products,
  colorSelections,
  activeProductId,
  onProductClick,
}: StagedSceneProps) {
  const shareProductId =
    activeProductId && products.some((p) => p.id === activeProductId)
      ? activeProductId
      : null;

  const isDesktop    = useMediaQuery('(min-width: 768px)');
  const containerRef = useRef<HTMLDivElement>(null);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [layout,  setLayout]  = useState({ w: 0, h: 0 });

  const measure = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    setLayout({ w: el.clientWidth, h: el.clientHeight });
  }, []);

  useEffect(() => {
    measure();
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  const fit =
    natural.w && natural.h
      ? isDesktop
        ? getObjectCoverRect(layout.w, layout.h, natural.w, natural.h)
        : getObjectContainRect(layout.w, layout.h, natural.w, natural.h)
      : { left: 0, top: 0, width: layout.w, height: layout.h };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden bg-[#1A1714]"
    >
      {/*
        Scene frame — image + hotspots share one box so anchors use
        percentage coords and never drift on scroll/resize.
      */}
      <div
        className="absolute overflow-hidden"
        style={{
          left:   fit.left,
          top:    fit.top,
          width:  fit.width,
          height: fit.height,
        }}
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={imageSrc}
            src={imageSrc}
            alt={alt}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="block h-full w-full object-cover"
            draggable={false}
            onLoad={(e) => {
              const img = e.currentTarget;
              setNatural({ w: img.naturalWidth, h: img.naturalHeight });
              measure();
            }}
          />
        </AnimatePresence>

        {/* Vignette inside frame */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1A1714]/50 via-transparent to-[#1A1714]/12" />

        {/* Share */}
        <div className="pointer-events-none absolute inset-x-0 top-3 z-30 flex justify-end px-3">
          <ShareButton
            target={{ categoryId, sceneId, productId: shareProductId }}
          />
        </div>

        {/* Hotspots — % position inside frame, stable on scroll */}
        {products.map((product, idx) => (
          <ProductSpot
            key={product.id}
            product={product}
            thumbSrc={getProductDisplayImage(product, colorSelections)}
            anchorX={product.anchorX}
            anchorY={product.anchorY}
            index={idx}
            isActive={activeProductId === product.id}
            onSelect={onProductClick}
          />
        ))}
      </div>
    </div>
  );
}
