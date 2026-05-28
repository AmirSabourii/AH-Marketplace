import { useEffect, useState } from 'react';

/** Minimum share of viewport reserved for catalog + product dock */
const MIN_PRODUCTS_FRAC = 0.44;
/** Back button row inside room block */
const TOP_CHROME_PX = 44;

export interface MobileRoomImageBounds {
  naturalWidth: number;
  naturalHeight: number;
  /** Height of the image at full viewport width */
  fittedHeight: number;
  /** Total room block height (chrome + image) */
  blockHeight: number;
}

/**
 * Room panel height follows the uploaded image aspect ratio; catalog uses the rest.
 */
export function useMobileRoomImageBounds(
  imageUrl: string | null,
  enabled: boolean
): MobileRoomImageBounds | null {
  const [bounds, setBounds] = useState<MobileRoomImageBounds | null>(null);
  const [viewport, setViewport] = useState(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 0,
    h: typeof window !== 'undefined' ? window.innerHeight : 0,
  }));

  useEffect(() => {
    if (!enabled) return;
    const onResize = () =>
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !imageUrl || viewport.w <= 0 || viewport.h <= 0) {
      setBounds(null);
      return;
    }

    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      const nw = img.naturalWidth || 1;
      const nh = img.naturalHeight || 1;
      const fitted = (nh / nw) * viewport.w;
      const maxImageH =
        viewport.h * (1 - MIN_PRODUCTS_FRAC) - TOP_CHROME_PX - 8;
      const displayH = Math.min(fitted, Math.max(120, maxImageH));
      setBounds({
        naturalWidth: nw,
        naturalHeight: nh,
        fittedHeight: displayH,
        blockHeight: TOP_CHROME_PX + displayH,
      });
    };
    img.onerror = () => {
      if (!cancelled) setBounds(null);
    };
    img.src = imageUrl;

    return () => {
      cancelled = true;
    };
  }, [imageUrl, enabled, viewport.w, viewport.h]);

  return bounds;
}
