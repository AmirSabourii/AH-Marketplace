import {
  categoriesForKind,
  defaultReplaceable,
  isArchitecturalSurface,
  isRoomElementKind,
} from './kinds';
import {
  clampBox,
  reconcileAnchor,
} from './anchorRefinement';
import type {
  DetectedRoomElement,
  GeminiRoomAnalysisRaw,
  GeminiRoomElementRaw,
  RoomSceneAnalysis,
} from './types';

const MIN_CONFIDENCE = 0.32;
const MAX_ELEMENTS = 20;
const MIN_BOX_SIZE = 0.018;

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0.5;
  return Math.min(1, Math.max(0, n));
}

function boxFromRaw(
  raw: GeminiRoomElementRaw
): ReturnType<typeof clampBox> | null {
  if (Array.isArray(raw.box_2d) && raw.box_2d.length === 4) {
    const [ymin, xmin, ymax, xmax] = raw.box_2d;

    // Convert 0-1000 scale to 0-1 normalized
    const x = xmin / 1000;
    const y = ymin / 1000;
    const w = (xmax - xmin) / 1000;
    const h = (ymax - ymin) / 1000;

    if (w < MIN_BOX_SIZE || h < MIN_BOX_SIZE) return null;
    return clampBox({
      x: clamp01(x),
      y: clamp01(y),
      width: w,
      height: h,
    });
  }

  return null;
}

function iou(a: DetectedRoomElement, b: DetectedRoomElement): number {
  const ax2 = a.box.x + a.box.width;
  const ay2 = a.box.y + a.box.height;
  const bx2 = b.box.x + b.box.width;
  const by2 = b.box.y + b.box.height;
  const ix = Math.max(0, Math.min(ax2, bx2) - Math.max(a.box.x, b.box.x));
  const iy = Math.max(0, Math.min(ay2, by2) - Math.max(a.box.y, b.box.y));
  const inter = ix * iy;
  const union = a.box.width * a.box.height + b.box.width * b.box.height - inter;
  return union > 0 ? inter / union : 0;
}

function anchorDistance(a: DetectedRoomElement, b: DetectedRoomElement): number {
  return Math.hypot(a.anchor.x - b.anchor.x, a.anchor.y - b.anchor.y);
}

function isDuplicate(candidate: DetectedRoomElement, kept: DetectedRoomElement[]): boolean {
  return kept.some((k) => {
    if (iou(k, candidate) > 0.42) return true;
    if (k.kind === candidate.kind && anchorDistance(k, candidate) < 0.07) return true;
    return false;
  });
}

function dedupeElements(elements: DetectedRoomElement[]): DetectedRoomElement[] {
  const sorted = [...elements].sort((a, b) => b.confidence - a.confidence);
  const kept: DetectedRoomElement[] = [];

  for (const candidate of sorted) {
    if (!isDuplicate(candidate, kept)) kept.push(candidate);
  }

  return kept;
}

function rawToElement(raw: GeminiRoomElementRaw, index: number): DetectedRoomElement | null {
  const kind = isRoomElementKind(raw.kind) ? raw.kind : 'other';
  const confidence = clamp01(raw.confidence);
  if (confidence < MIN_CONFIDENCE) return null;

  const box = boxFromRaw(raw);
  if (!box) return null;

  // We completely rely on the box and standard geometric anchor placement now
  const modelAnchor = {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  };
  const anchor = reconcileAnchor(kind, box, modelAnchor);

  const replaceable =
    typeof raw.replaceable === 'boolean'
      ? raw.replaceable
      : defaultReplaceable(kind);

  const label =
    typeof raw.label === 'string' && raw.label.trim()
      ? raw.label.trim().slice(0, 80)
      : kind.replace(/_/g, ' ');

  return {
    id: `el-${index}-${kind}`,
    kind,
    label,
    confidence,
    replaceable,
    anchor,
    box,
    suggestedCategoryIds: categoriesForKind(kind),
  };
}

function finalizeElements(elements: DetectedRoomElement[]): DetectedRoomElement[] {
  return dedupeElements(elements)
    .filter((e) => e.replaceable && !isArchitecturalSurface(e.kind))
    .slice(0, MAX_ELEMENTS);
}

export function normalizeRoomAnalysis(
  raw: GeminiRoomAnalysisRaw,
  imageWidth: number,
  imageHeight: number
): RoomSceneAnalysis {
  const elements: DetectedRoomElement[] = [];

  for (let i = 0; i < (raw.elements?.length ?? 0); i++) {
    const el = rawToElement(raw.elements[i], i);
    if (el) elements.push(el);
  }

  return {
    imageWidth,
    imageHeight,
    elements: finalizeElements(elements),
    analyzedAt: Date.now(),
  };
}

export { parseGeminiAnalysisJson } from './parseJson';
