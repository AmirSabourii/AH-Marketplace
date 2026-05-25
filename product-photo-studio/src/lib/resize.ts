import { loadImage } from './imageUtils';

export interface ResizeOptions {
  /** Square output side in pixels */
  size: number;
  /** Product occupies this fraction of canvas (0–1) */
  productFill: number;
  background: string;
  format: 'jpeg' | 'png';
  jpegQuality: number;
}

const DEFAULT_OPTIONS: ResizeOptions = {
  size: 2048,
  productFill: 0.9,
  background: '#FFFFFF',
  format: 'jpeg',
  jpegQuality: 0.95,
};

/**
 * Centers the generated product on a pure white square canvas at target resolution.
 */
export async function resizeToCatalogSquare(
  dataUrl: string,
  partial?: Partial<ResizeOptions>
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...partial };
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = opts.size;
  canvas.height = opts.size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  ctx.fillStyle = opts.background;
  ctx.fillRect(0, 0, opts.size, opts.size);

  const scale = Math.min(
    (opts.size * opts.productFill) / img.width,
    (opts.size * opts.productFill) / img.height
  );
  const w = img.width * scale;
  const h = img.height * scale;
  const x = (opts.size - w) / 2;
  const y = (opts.size - h) / 2;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, x, y, w, h);

  if (opts.format === 'png') {
    return canvas.toDataURL('image/png');
  }
  return canvas.toDataURL('image/jpeg', opts.jpegQuality);
}

export interface StagedResizeOptions {
  /** Longest side in pixels */
  maxSize: number;
  format: 'jpeg' | 'png';
  jpegQuality: number;
}

/**
 * Upscales staged lifestyle output while preserving aspect ratio (no white square crop).
 */
export async function resizeStagedOutput(
  dataUrl: string,
  partial?: Partial<StagedResizeOptions>
): Promise<string> {
  const opts: StagedResizeOptions = {
    maxSize: 2048,
    format: 'jpeg',
    jpegQuality: 0.95,
    ...partial,
  };

  const img = await loadImage(dataUrl);
  const scale = opts.maxSize / Math.max(img.width, img.height);
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);

  if (opts.format === 'png') {
    return canvas.toDataURL('image/png');
  }
  return canvas.toDataURL('image/jpeg', opts.jpegQuality);
}
