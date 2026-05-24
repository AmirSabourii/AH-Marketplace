import { useState, useRef, useEffect } from 'react';
import { GripVertical } from 'lucide-react';
import { cn } from '../lib/cn';

interface CompareSliderProps {
  originalImage: string;
  generatedImage: string;
  className?: string;
  /** Slowly sweeps the divider when the user is not dragging */
  autoPlay?: boolean;
}

export default function CompareSlider({
  originalImage,
  generatedImage,
  className,
  autoPlay = false,
}: CompareSliderProps) {
  const [position, setPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!autoPlay || isDragging) return;

    let frame = 0;
    const id = window.setInterval(() => {
      frame += 1;
      const t = frame / 120;
      const wave = 50 + Math.sin(t * Math.PI * 2) * 22;
      setPosition(wave);
    }, 40);

    return () => window.clearInterval(id);
  }, [autoPlay, isDragging]);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setPosition((x / rect.width) * 100);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    handleMove(e.clientX);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      handleMove(e.clientX);
    };

    const handlePointerUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isDragging]);

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full h-full overflow-hidden select-none touch-none', className)}
      onPointerDown={handlePointerDown}
    >
      {/* Original Image (Background) */}
      <img
        src={originalImage}
        alt="Original room"
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />

      {/* Generated Image (Foreground, Clipped) */}
      <div
        className="absolute inset-0 w-full h-full"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <img
          src={generatedImage}
          alt="AI staged room"
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
      </div>

      {/* Slider Handle */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize shadow-[0_0_10px_rgba(0,0,0,0.3)]"
        style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
          <GripVertical className="w-4 h-4 text-ink-muted" strokeWidth={2.5} />
        </div>
      </div>
    </div>
  );
}
