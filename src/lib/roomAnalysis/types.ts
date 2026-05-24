import type { CategoryId } from '../../data/categories';

/** Detectable room element kinds — must match Gemini schema enum */
export const ROOM_ELEMENT_KINDS = [
  'floor',
  'ceiling',
  'wall',
  'window',
  'door',
  'sofa',
  'armchair',
  'coffee_table',
  'dining_table',
  'chair',
  'bed',
  'rug',
  'lamp',
  'curtain',
  'shelf',
  'tv',
  'plant',
  'other',
] as const;

export type RoomElementKind = (typeof ROOM_ELEMENT_KINDS)[number];

/** Normalized 0–1 relative to intrinsic image dimensions */
export interface NormalizedBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectedRoomElement {
  id: string;
  kind: RoomElementKind;
  label: string;
  confidence: number;
  replaceable: boolean;
  anchor: { x: number; y: number };
  box: NormalizedBox;
  suggestedCategoryIds: CategoryId[];
}

export interface RoomSceneAnalysis {
  imageWidth: number;
  imageHeight: number;
  elements: DetectedRoomElement[];
  analyzedAt: number;
}

/** Raw shape from Gemini structured output */
export interface GeminiRoomElementRaw {
  kind: string;
  label: string;
  confidence: number;
  replaceable: boolean;
  box_2d: [number, number, number, number];
}

export interface GeminiRoomAnalysisRaw {
  elements: GeminiRoomElementRaw[];
}
