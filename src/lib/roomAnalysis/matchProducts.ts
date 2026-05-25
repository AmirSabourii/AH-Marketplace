import type { CategoryId } from '../../data/categories';
import type { CatalogItem } from '../medusa/products';
import type { Product } from '../../data/scenes';
import type { DetectedRoomElement } from './types';

/** Pick catalog products that fit a detected room element (for staging on click) */
export function getProductsForElement(
  element: DetectedRoomElement,
  catalog: CatalogItem[]
): Product[] {
  const categories = element.suggestedCategoryIds.filter((c) => c !== 'all');
  const seen = new Set<string>();
  const out: Product[] = [];

  for (const categoryId of categories) {
    for (const item of catalog) {
      if (item.categoryId !== categoryId) continue;
      if (!seen.has(item.product.id)) {
        seen.add(item.product.id);
        out.push(item.product);
      }
    }
  }

  return out;
}

export function pickBestProductForElement(
  element: DetectedRoomElement,
  stagedProductIds: Set<string>,
  catalog: CatalogItem[]
): Product | null {
  const candidates = getProductsForElement(element, catalog);
  if (candidates.length === 0) return null;

  const unstaged = candidates.find((p) => !stagedProductIds.has(p.id));
  return unstaged ?? candidates[0];
}

export function categoryLabelForElement(element: DetectedRoomElement): string {
  const id = element.suggestedCategoryIds[0];
  const labels: Record<CategoryId, string> = {
    all: 'All',
    sofa: 'Sofa',
    bed: 'Bed',
    rug: 'Rug',
    table: 'Table',
    lamp: 'Lamp',
    decor: 'Decor',
  };
  return labels[id] ?? 'Shop';
}
