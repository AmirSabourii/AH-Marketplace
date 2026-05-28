import { SCENES, findProductInScene, type Product } from '../../data/scenes';
import type { CategoryId } from '../../data/categories';
import type { AIContext } from '../../types/ai';
import type { CatalogItem } from '../medusa/products';
import { getCatalogSource } from '../catalog/config';

export interface CatalogEntry {
  id: string;
  name: string;
  price: string;
  category: CategoryId;
  description: string;
}

function catalogItemsToEntries(items: CatalogItem[]): CatalogEntry[] {
  return items.map((item) => ({
    id: item.product.id,
    name: item.product.name,
    price: item.product.price,
    category: item.categoryId,
    description: item.product.description,
  }));
}

export function getFullCatalogFromScenes(): CatalogEntry[] {
  const seen = new Set<string>();
  const entries: CatalogEntry[] = [];

  for (const scene of SCENES) {
    for (const product of scene.products) {
      if (seen.has(product.id)) continue;
      seen.add(product.id);
      entries.push({
        id: product.id,
        name: product.name,
        price: product.price,
        category: scene.categoryId,
        description: product.description,
      });
    }
  }

  return entries;
}

export function getFullCatalog(ctx?: AIContext): CatalogEntry[] {
  if (ctx?.catalog?.length) {
    return catalogItemsToEntries(ctx.catalog);
  }
  if (getCatalogSource() === 'mock') {
    return getFullCatalogFromScenes();
  }
  return [];
}

export function formatCatalogForPrompt(entries: CatalogEntry[]): string {
  return entries
    .map(
      (e) =>
        `- id: ${e.id} | category: ${e.category} | ${e.name} | ${e.price} | ${e.description}`
    )
    .join('\n');
}

export function resolveProductsByIds(
  ids: string[],
  catalog?: CatalogItem[]
): Product[] {
  const out: Product[] = [];
  const seen = new Set<string>();

  for (const id of ids) {
    if (seen.has(id)) continue;

    const fromCatalog = catalog?.find((item) => item.product.id === id);
    if (fromCatalog) {
      seen.add(id);
      out.push(fromCatalog.product);
      continue;
    }

    const found = findProductInScene(id);
    if (found) {
      seen.add(id);
      out.push(found.product);
    }
  }

  return out;
}

export function getContextCatalogSummary(ctx: AIContext): string {
  const entries = getFullCatalog(ctx);
  const count = entries.length;

  if (count === 0 && getCatalogSource() !== 'mock') {
    return 'Store catalog is loading or unavailable. Ask the user to refresh if product IDs are needed.';
  }

  let header = `Full store catalog (${count} items):\n${formatCatalogForPrompt(entries)}`;

  if (ctx.product) {
    header += `\n\nUser is currently focused on: ${ctx.product.name} (id: ${ctx.product.id}, ${ctx.product.price}).`;
  }

  if (ctx.stagedProducts?.length) {
    const staged = ctx.stagedProducts.map((p) => `${p.name} (${p.id})`).join(', ');
    header += `\n\nProducts staged in room visualizer: ${staged}.`;
  }

  if (ctx.categoryId && ctx.categoryId !== 'all') {
    header += `\n\nUser is browsing category: ${ctx.categoryId}.`;
  }

  return header;
}
