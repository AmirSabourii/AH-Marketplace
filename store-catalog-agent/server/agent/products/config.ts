/** Product extraction configuration */
export const PRODUCTS_PER_CATEGORY = 5;
export const MAX_CATEGORIES_TO_EXTRACT = 3;
export const EXTRACT_TIMEOUT_MS = 120_000;
export const NAVIGATION_TIMEOUT_MS = 90_000;
export const POPUP_ACT_TIMEOUT_MS = 15_000;

/** Default keywords when user does not specify a category */
export const DEFAULT_CATEGORY_KEYWORDS = [
  /مبل/i,
  /مبلمان/i,
  /living\s*room/i,
  /living-room/i,
  /livingroom/i,
  /اتاق\s*نشین/i,
  /نشیمن/i,
  /sofa/i,
  /couch/i,
];

/** Categories that are never product listings */
export const NON_PRODUCT_CATEGORY = [
  /contact/i,
  /about/i,
  /blog/i,
  /news/i,
  /account/i,
  /login/i,
  /sign[\s-]?in/i,
  /cart/i,
  /checkout/i,
  /policy/i,
  /privacy/i,
  /terms/i,
  /faq/i,
  /help/i,
  /support/i,
  /تماس/i,
  /درباره/i,
  /ورود/i,
  /ثبت[\s-]?نام/i,
];

/** URL hints that a category likely lists products */
export const PRODUCT_URL_HINTS = [
  /\/product/i,
  /\/shop/i,
  /\/store/i,
  /\/collection/i,
  /\/categor/i,
  /\/catalog/i,
  /\/department/i,
  /\/browse/i,
  /\/cat\//i,
];

export interface CategorySelectionOptions {
  /** User-provided category name/keyword, e.g. "living room" or "مبل" */
  query?: string;
  /** Max categories to extract products from (default 1) */
  maxCategories?: number;
  /** Products per category (default 5) */
  productsPerCategory?: number;
}

export const DEFAULT_SELECTION: Required<CategorySelectionOptions> = {
  query: '',
  maxCategories: 1,
  productsPerCategory: PRODUCTS_PER_CATEGORY,
};
