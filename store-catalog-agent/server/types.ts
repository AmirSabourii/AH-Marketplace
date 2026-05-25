export interface CategoryItem {
  name: string;
  url: string;
  parent?: string;
}

export interface ProductDetail {
  name: string;
  url: string;
  price?: string;
  originalPrice?: string;
  currency?: string;
  colors?: string[];
  description?: string;
  shortDescription?: string;
  images: string[];
  sku?: string;
  availability?: string;
  specifications?: Record<string, string>;
  dimensions?: string;
  material?: string;
}

export interface CategoryProductsBundle {
  category: CategoryItem;
  products: ProductDetail[];
  meta?: {
    requested: number;
    extracted: number;
    errors?: string[];
  };
}

/** @deprecated use CategoryProductsBundle */
export type SofaCategoryProducts = CategoryProductsBundle;

export interface StoreInfo {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface CatalogDiscoveryResult {
  sourceUrl: string;
  store: StoreInfo;
  categories: CategoryItem[];
  categoryProducts?: CategoryProductsBundle[];
  /** @deprecated use categoryProducts */
  sofaProducts?: CategoryProductsBundle;
  meta: {
    method: 'fetch' | 'stagehand-extract' | 'stagehand-agent';
    sessionId?: string;
    durationMs: number;
    confidence: 'high' | 'partial' | 'low';
  };
}

export type StreamEventType =
  | 'log'
  | 'progress'
  | 'browser'
  | 'product'
  | 'result'
  | 'error'
  | 'done';

export interface StreamLogPayload {
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  ts: number;
}

export interface StreamProgressPayload {
  step: number;
  total: number;
  label: string;
}

export interface StreamBrowserPayload {
  sessionId: string;
  liveViewUrl: string;
  debuggerUrl: string;
}

export interface DiscoverRequestBody {
  apiKey: string;
  projectId: string;
  url: string;
  /** Optional: filter which category to extract products from, e.g. "living room" or "مبل" */
  categoryQuery?: string;
  /** Products per category (default 5) */
  productsPerCategory?: number;
}

export type EmitFn = (type: StreamEventType, data: unknown) => void;
