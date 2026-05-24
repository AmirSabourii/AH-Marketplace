import { BedDouble, Lamp, LayoutGrid, Sofa, Table2, Wallpaper } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type CategoryId = 'all' | 'sofa' | 'bed' | 'rug' | 'table' | 'lamp' | 'decor';

export interface Category {
  id: CategoryId;
  label: string;
  icon: LucideIcon;
  enabled: boolean;
  image?: string;
}

export const CATEGORIES: Category[] = [
  { id: 'all', label: 'All', icon: LayoutGrid, enabled: true },
  { id: 'sofa', label: 'Sofa', icon: Sofa, enabled: true, image: '/assets/cat-images/blueprint-sofa.png' },
  { id: 'bed', label: 'Bed', icon: BedDouble, enabled: true, image: '/assets/cat-images/blueprint-bed.png' },
  { id: 'rug', label: 'Rug', icon: LayoutGrid, enabled: true, image: '/assets/cat-images/blueprint-rug.png' },
  { id: 'table', label: 'Table', icon: Table2, enabled: true, image: '/assets/cat-images/blueprint-table.png' },
  { id: 'lamp', label: 'Lamp', icon: Lamp, enabled: true, image: '/assets/cat-images/blueprint-light.png' },
  { id: 'decor', label: 'Decor', icon: Wallpaper, enabled: true, image: '/assets/cat-images/blueprint-decor.png' },
];

export const ENABLED_CATEGORIES = CATEGORIES.filter((c) => c.enabled);
