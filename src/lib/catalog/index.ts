import { fetchMockCatalog } from './mockCatalog';
import { useMockCatalog } from './config';
import {
  fetchMarketplaceCatalog,
  type CatalogItem,
} from '../medusa/products';

export { useMockCatalog, getCatalogSource } from './config';
export type { CatalogSource } from './config';

export async function fetchCatalog(): Promise<CatalogItem[]> {
  if (useMockCatalog()) {
    return fetchMockCatalog();
  }
  return fetchMarketplaceCatalog('all');
}
