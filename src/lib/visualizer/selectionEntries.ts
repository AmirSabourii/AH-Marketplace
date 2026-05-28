import type { Product } from '../../data/scenes';
import type { CatalogItem } from '../medusa/products';

export type SelectionEntry = {
  product: Product;
  /** Already composited in the latest room render */
  inRoom: boolean;
  imageUrl: string;
};

export function buildSelectionEntries(
  catalog: CatalogItem[],
  stagedProducts: Product[],
  placedProducts: Product[]
): SelectionEntry[] {
  const imageById = new Map(
    catalog.map((item) => [item.product.id, item.catalogImage || item.displayImage])
  );
  const placedIds = new Set(placedProducts.map((p) => p.id));
  const seen = new Set<string>();
  const out: SelectionEntry[] = [];

  for (const product of placedProducts) {
    if (seen.has(product.id)) continue;
    seen.add(product.id);
    out.push({
      product,
      inRoom: true,
      imageUrl: imageById.get(product.id) ?? product.image,
    });
  }

  for (const product of stagedProducts) {
    if (seen.has(product.id)) continue;
    seen.add(product.id);
    out.push({
      product,
      inRoom: placedIds.has(product.id),
      imageUrl: imageById.get(product.id) ?? product.image,
    });
  }

  return out;
}
