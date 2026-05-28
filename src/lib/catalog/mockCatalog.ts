import { SCENES } from '../../data/scenes';
import type { CatalogItem } from '../medusa/products';

/** Build marketplace catalog rows from hardcoded scene/product data. */
export function buildMockCatalog(): CatalogItem[] {
  const seen = new Set<string>();
  const items: CatalogItem[] = [];

  for (const scene of SCENES) {
    for (const product of scene.products) {
      if (seen.has(product.id)) continue;
      seen.add(product.id);
      const image = product.image;
      items.push({
        product,
        categoryId: scene.categoryId,
        displayImage: image,
        catalogImage: image,
      });
    }
  }

  return items;
}

export async function fetchMockCatalog(): Promise<CatalogItem[]> {
  return buildMockCatalog();
}
