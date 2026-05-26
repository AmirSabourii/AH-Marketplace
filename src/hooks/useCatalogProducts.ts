import { useCallback, useEffect, useState } from 'react';
import type { CategoryId } from '../data/categories';
import { fetchCatalog } from '../lib/catalog';
import type { CatalogItem } from '../lib/medusa/products';

type CatalogState = {
  items: CatalogItem[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

/**
 * Fetches the full marketplace catalog once; category filtering is client-side.
 */
export function useCatalogProducts(): CatalogState {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const catalog = await fetchCatalog();
      setItems(catalog);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : 'Could not load products from the server';
      setError(message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { items, loading, error, refresh: load };
}

export function useFilteredCatalog(
  catalog: CatalogItem[],
  categoryId: CategoryId
): CatalogItem[] {
  if (categoryId === 'all') return catalog;
  return catalog.filter((item) => item.categoryId === categoryId);
}
