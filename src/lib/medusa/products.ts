import type { CategoryId } from '../../data/categories';
import type { Product } from '../../data/scenes';
import { getMedusaBackendUrl, getMedusaPublishableKey } from './config';

export type CatalogItem = {
  product: Product;
  categoryId: CategoryId;
  /** Staged lifestyle image for grid / product sheet hero. */
  displayImage: string;
  /** White-background catalog image for room compositing. */
  catalogImage: string;
};

type ApiCatalogProduct = {
  id: string;
  name: string;
  price: string;
  description: string;
  image: string;
  stagedImage?: string;
  catalogImage?: string;
  gallery?: string[];
  categoryId: CategoryId;
};

function missingPublishableKeyError(): Error {
  const hint = import.meta.env.DEV
    ? 'Add VITE_MEDUSA_PUBLISHABLE_KEY to .env (run `npm run publishable-key` in apps/backend), then restart Vite.'
    : 'Set VITE_MEDUSA_PUBLISHABLE_KEY in your deployment environment.';
  return new Error(`Medusa publishable API key is missing. ${hint}`);
}

function medusaStoreHeaders(): Record<string, string> {
  const key = getMedusaPublishableKey();
  if (!key) throw missingPublishableKeyError();

  return {
    Accept: 'application/json',
    'x-publishable-api-key': key,
  };
}

function mapApiProduct(row: ApiCatalogProduct): CatalogItem {
  const staged = row.stagedImage?.trim() || row.image?.trim() || '';
  const catalog = row.catalogImage?.trim() || staged;

  const product: Product = {
    id: row.id,
    name: row.name,
    price: row.price || '—',
    description: row.description,
    image: catalog,
    anchorX: 0.5,
    anchorY: 0.5,
  };

  return {
    product,
    categoryId: row.categoryId,
    displayImage: staged,
    catalogImage: catalog,
  };
}

/**
 * Load published products from Medusa for the marketplace grid.
 */
export async function fetchMarketplaceCatalog(
  category: CategoryId = 'all'
): Promise<CatalogItem[]> {
  const params = new URLSearchParams({ limit: '100' });
  if (category !== 'all') {
    params.set('category', category);
  }

  const res = await fetch(
    `${getMedusaBackendUrl()}/store/marketplace/products?${params}`,
    { headers: medusaStoreHeaders() }
  );

  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
      type?: string;
    };
    throw new Error(
      json.error || json.message || `Failed to load products (${res.status})`
    );
  }

  const json = (await res.json()) as { products?: ApiCatalogProduct[] };
  return (json.products ?? [])
    .map(mapApiProduct)
    .filter((item) => item.displayImage.length > 0);
}

export function findProductInCatalog(
  catalog: CatalogItem[],
  productId: string
): CatalogItem | undefined {
  return catalog.find((item) => item.product.id === productId);
}

export function filterCatalogByCategory(
  catalog: CatalogItem[],
  categoryId: CategoryId
): CatalogItem[] {
  if (categoryId === 'all') return catalog;
  return catalog.filter((item) => item.categoryId === categoryId);
}

export function getAllProductsFromCatalog(catalog: CatalogItem[]): Product[] {
  const seen = new Set<string>();
  const out: Product[] = [];
  for (const item of catalog) {
    if (seen.has(item.product.id)) continue;
    seen.add(item.product.id);
    out.push(item.product);
  }
  return out;
}
