import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getObjectCoverRect } from '../lib/imageFit';
import type { DetectedRoomElement, RoomSceneAnalysis } from '../lib/roomAnalysis/types';
import RoomElementSpot from './RoomElementSpot';

interface RoomSceneFrameProps {
  imageSrc: string;
  alt: string;
  analysis: RoomSceneAnalysis | null;
  activeElementId: string | null;
  showHotspots: boolean;
  onElementSelect: (element: DetectedRoomElement) => void;
  className?: string;
}

export default function RoomSceneFrame({
  imageSrc,
  alt,
  analysis,
  activeElementId,
  showHotspots,
  onElementSelect,
  className,
}: RoomSceneFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [layout, setLayout] = useState({ w: 0, h: 0 });

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
      ? getObjectCoverRect(layout.w, layout.h, natural.w, natural.h)
      : { left: 0, top: 0, width: layout.w, height: layout.h };

  const elements = showHotspots && analysis ? analysis.elements : [];

  return (
    <div ref={containerRef} className={className ?? 'absolute inset-0'}>
      <div
        className="absolute overflow-hidden"
        style={{
          left: fit.left,
          top: fit.top,
          width: fit.width,
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
            transition={{ duration: 0.35 }}
            className="block h-full w-full object-cover"
            draggable={false}
            onLoad={(e) => {
              const img = e.currentTarget;
              setNatural({ w: img.naturalWidth, h: img.naturalHeight });
              measure();
            }}
          />
        </AnimatePresence>

        {elements.map((element, idx) => (
          <RoomElementSpot
            key={element.id}
            element={element}
            index={idx}
            isActive={activeElementId === element.id}
            onSelect={onElementSelect}
          />
        ))}
      </div>
    </div>
  );
}
