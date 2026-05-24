import { isArchitecturalSurface } from './kinds';
import type { NormalizedBox, RoomElementKind } from './types';

const MAX_BOX_AREA = 0.75;
const MIN_BOX_DIM = 0.02;

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}

export function clampBox(box: NormalizedBox): NormalizedBox {
  let { x, y, width, height } = box;
  width = Math.max(MIN_BOX_DIM, clamp01(width));
  height = Math.max(MIN_BOX_DIM, clamp01(height));
  x = clamp01(x);
  y = clamp01(y);

  if (x + width > 1) x = Math.max(0, 1 - width);
  if (y + height > 1) y = Math.max(0, 1 - height);

  const area = width * height;
  if (area > MAX_BOX_AREA) {
    const scale = Math.sqrt(MAX_BOX_AREA / area);
    const cx = x + width / 2;
    const cy = y + height / 2;
    width *= scale;
    height *= scale;
    x = clamp01(cx - width / 2);
    y = clamp01(cy - height / 2);
  }

  return { x, y, width, height };
}

/** Default bbox when model only returns anchor coordinates */
export function defaultBoxAroundAnchor(
  kind: RoomElementKind,
  anchorX: number,
  anchorY: number
): NormalizedBox {
  const ax = clamp01(anchorX);
  const ay = clamp01(anchorY);

  let width = 0.14;
  let height = 0.12;

  switch (kind) {
    case 'sofa':
    case 'bed':
      width = 0.28;
      height = 0.18;
      break;
    case 'rug':
      width = 0.22;
      height = 0.14;
      break;
    case 'coffee_table':
    case 'dining_table':
      width = 0.16;
      height = 0.12;
      break;
    case 'lamp':
    case 'plant':
      width = 0.08;
      height = 0.14;
      break;
    default:
      break;
  }

  return clampBox({
    x: ax - width / 2,
    y: ay - height / 2,
    width,
    height,
  });
}

/**
 * Pin dot on the visible product — geometric center with slight bias for seating.
 * Ignores model anchor (often inaccurate); bbox drives placement.
 */
export function computeAnchorFromBox(
  kind: RoomElementKind,
  box: NormalizedBox
): { x: number; y: number } {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  if (isArchitecturalSurface(kind)) {
    return { x: cx, y: cy };
  }

  switch (kind) {
    case 'sofa':
    case 'armchair':
    case 'bed':
    case 'chair':
      // Seating: anchor near the seat cushion/base, not the middle of the backrest
      return { x: cx, y: box.y + box.height * 0.65 };
    case 'coffee_table':
    case 'dining_table':
      // Tables: anchor on the tabletop surface
      return { x: cx, y: box.y + box.height * 0.45 };
    case 'rug':
      return { x: cx, y: box.y + box.height * 0.5 };
    case 'tv':
    case 'lamp':
    case 'other':
    case 'decor' as RoomElementKind:
      return { x: cx, y: box.y + box.height * 0.5 };
    default:
      return { x: cx, y: cy };
  }
}

export function reconcileAnchor(
  kind: RoomElementKind,
  box: NormalizedBox,
  _modelAnchor: { x: number; y: number }
): { x: number; y: number } {
  return computeAnchorFromBox(kind, box);
}
