import type { Product } from '../../data/scenes';
import type { CatalogItem } from '../medusa/products';

export type SelectionEntry = {
  product: Product;
  /** Composited in the staged room image */
  kind: 'placed' | 'staged';
  imageUrl: string;
};

export function buildSelectionEntries(
  catalog: CatalogItem[],
  stagedProducts: Product[],
  placedProducts: Product[]
): SelectionEntry[] {
  const imageById = new Map(catalog.map((item) => [item.product.id, item.displayImage]));
  const seen = new Set<string>();
  const out: SelectionEntry[] = [];

  for (const product of placedProducts) {
    if (seen.has(product.id)) continue;
    seen.add(product.id);
    out.push({
      product,
      kind: 'placed',
      imageUrl: imageById.get(product.id) ?? product.image,
    });
  }

  for (const product of stagedProducts) {
    if (seen.has(product.id)) continue;
    seen.add(product.id);
    out.push({
      product,
      kind: 'staged',
      imageUrl: imageById.get(product.id) ?? product.image,
    });
  }

  return out;
}
