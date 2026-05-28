import type { Product } from '../../data/scenes';

export type PreviewAction = 'none' | 'see' | 'update' | 'regenerate';

export function countPendingPreview(
  stagedProducts: Product[],
  placedIds: Set<string>
): number {
  return stagedProducts.filter((p) => !placedIds.has(p.id)).length;
}

/** What the primary room action should do (one CTA, no jargon). */
export function getPreviewAction(opts: {
  pickCount: number;
  pendingCount: number;
  hasLivePreview: boolean;
}): PreviewAction {
  const { pickCount, pendingCount, hasLivePreview } = opts;
  if (pickCount === 0) return 'none';
  if (pendingCount > 0) return hasLivePreview ? 'update' : 'see';
  if (hasLivePreview) return 'regenerate';
  return 'see';
}

export function previewActionLabel(
  action: PreviewAction,
  count: number,
  pendingCount?: number
): string {
  const n = pendingCount && pendingCount > 0 ? pendingCount : count;
  switch (action) {
    case 'see':
      return n > 1 ? `See in room · ${n}` : 'See in room';
    case 'update':
      return n > 1 ? `Update room · ${n}` : 'Update room';
    case 'regenerate':
      return 'Refresh room';
    default:
      return '';
  }
}

/** Short status for the active product line (optional). */
export function activeProductStatus(inRoom: boolean, hasLivePreview: boolean): string | null {
  if (!hasLivePreview) return null;
  return inRoom ? 'In your room' : null;
}
