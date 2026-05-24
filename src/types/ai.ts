import type { CategoryId } from '../data/categories';
import type { Product } from '../data/scenes';

export type AISurface = 'home' | 'product' | 'visualizer';

export type AIVisualizerStep = 'pick' | 'ready' | 'generating' | 'result';

export interface AIContext {
  surface: AISurface;
  product?: Product | null;
  categoryId?: CategoryId;
  stagedProducts?: Product[];
  visualizerStep?: AIVisualizerStep;
}

export function buildAIContextLabel(ctx: AIContext): string {
  switch (ctx.surface) {
    case 'product':
      return ctx.product?.name ?? 'This piece';
    case 'visualizer':
      if (ctx.stagedProducts?.length) {
        return `Room · ${ctx.stagedProducts.length} staged`;
      }
      return 'Room visualizer';
    default:
      return 'Home';
  }
}
