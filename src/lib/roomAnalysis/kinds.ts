import type { CategoryId } from '../../data/categories';
import { ROOM_ELEMENT_KINDS, type RoomElementKind } from './types';

const KIND_SET = new Set<string>(ROOM_ELEMENT_KINDS);

export function isRoomElementKind(value: string): value is RoomElementKind {
  return KIND_SET.has(value);
}

/** Map detected room elements to shop categories for product suggestions */
export function categoriesForKind(kind: RoomElementKind): CategoryId[] {
  switch (kind) {
    case 'sofa':
    case 'armchair':
      return ['sofa'];
    case 'bed':
      return ['bed'];
    case 'rug':
      return ['rug'];
    case 'coffee_table':
    case 'dining_table':
    case 'chair':
      return ['table'];
    case 'lamp':
      return ['lamp'];
    case 'plant':
    case 'shelf':
    case 'tv':
    case 'curtain':
    case 'other':
      return ['decor'];
    case 'floor':
    case 'ceiling':
    case 'wall':
    case 'window':
    case 'door':
      return ['decor', 'rug'];
    default:
      return ['decor'];
  }
}

/** Architectural surfaces are informational — not furniture swap targets by default */
export function isArchitecturalSurface(kind: RoomElementKind): boolean {
  return kind === 'floor' || kind === 'ceiling' || kind === 'wall' || kind === 'window' || kind === 'door';
}

export function defaultReplaceable(kind: RoomElementKind): boolean {
  if (isArchitecturalSurface(kind)) return false;
  return true;
}
