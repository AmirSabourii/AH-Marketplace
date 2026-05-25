import type { CategoryItem } from '../../types.js';
import {
  DEFAULT_CATEGORY_KEYWORDS,
  NON_PRODUCT_CATEGORY,
  PRODUCT_URL_HINTS,
  type CategorySelectionOptions,
} from './config.js';

function categoryLabel(cat: CategoryItem): string {
  return `${cat.parent ?? ''} ${cat.name}`.trim();
}

function isNonProductCategory(cat: CategoryItem): boolean {
  const label = categoryLabel(cat);
  return NON_PRODUCT_CATEGORY.some((re) => re.test(label) || re.test(cat.url));
}

function looksLikeProductCategory(cat: CategoryItem): boolean {
  if (!cat.url || !/^https?:\/\//i.test(cat.url)) return false;
  if (isNonProductCategory(cat)) return false;
  if (PRODUCT_URL_HINTS.some((re) => re.test(cat.url))) return true;
  return cat.name.length > 1;
}

function scoreCategory(cat: CategoryItem, query?: string): number {
  const label = categoryLabel(cat).toLowerCase();
  let score = 0;

  if (PRODUCT_URL_HINTS.some((re) => re.test(cat.url))) score += 3;
  if (query) {
    const q = query.toLowerCase().trim();
    if (label.includes(q)) score += 10;
    if (cat.name.toLowerCase().includes(q)) score += 8;
    if (cat.parent?.toLowerCase().includes(q)) score += 5;
  }
  if (DEFAULT_CATEGORY_KEYWORDS.some((re) => re.test(label))) score += 4;

  return score;
}

function dedupeByUrl(categories: CategoryItem[]): CategoryItem[] {
  const seen = new Set<string>();
  return categories.filter((cat) => {
    const key = cat.url.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Select which categories from the discovered list should have products extracted.
 *
 * Priority:
 * 1. User query match (highest score)
 * 2. Default keyword match (sofa, living room, …)
 * 3. First product-like category in the list
 */
export function selectCategoriesForExtraction(
  categories: CategoryItem[],
  options: CategorySelectionOptions = {}
): CategoryItem[] {
  const maxCategories = options.maxCategories ?? 1;
  const query = options.query?.trim();

  const candidates = dedupeByUrl(categories).filter(looksLikeProductCategory);
  if (candidates.length === 0) return [];

  const ranked = [...candidates].sort(
    (a, b) => scoreCategory(b, query) - scoreCategory(a, query)
  );

  if (query) {
    const matched = ranked.filter((c) => scoreCategory(c, query) > 0);
    if (matched.length > 0) return matched.slice(0, maxCategories);
  }

  const keywordMatched = ranked.filter((c) =>
    DEFAULT_CATEGORY_KEYWORDS.some((re) => re.test(categoryLabel(c)))
  );
  if (keywordMatched.length > 0) return keywordMatched.slice(0, maxCategories);

  return ranked.slice(0, maxCategories);
}

export function explainCategorySelection(
  selected: CategoryItem[],
  all: CategoryItem[],
  query?: string
): string {
  if (selected.length === 0) {
    return query
      ? `دسته‌ای با «${query}» در ${all.length} دسته پیدا نشد`
      : `هیچ دسته محصولی در ${all.length} دسته شناسایی نشد`;
  }
  const names = selected.map((c) => c.name).join('، ');
  return query
    ? `انتخاب با فیلتر «${query}»: ${names}`
    : `انتخاب خودکار: ${names}`;
}
