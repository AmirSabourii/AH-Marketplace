export type CatalogSource = 'mock' | 'medusa';

/** Set `VITE_CATALOG_SOURCE=mock` in `.env` to use `src/data/scenes.ts` instead of Medusa. */
export function getCatalogSource(): CatalogSource {
  const raw = import.meta.env.VITE_CATALOG_SOURCE?.trim().toLowerCase();
  if (raw === 'mock' || raw === 'medusa') return raw;
  if (import.meta.env.VITE_USE_MOCK_CATALOG === 'true') return 'mock';
  return 'medusa';
}

export function useMockCatalog(): boolean {
  return getCatalogSource() === 'mock';
}
