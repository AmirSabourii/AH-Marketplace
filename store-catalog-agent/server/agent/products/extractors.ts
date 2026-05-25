import type { Stagehand } from '@browserbasehq/stagehand';
import { productDetailSchema, productLinksSchema } from '../schemas.js';
import { resolveUrl } from '../sessionConfig.js';
import { EXTRACT_TIMEOUT_MS } from './config.js';
import type { ProductDetail } from '../../types.js';

export interface ProductLink {
  name: string;
  url: string;
}

export interface ListingExtractResult {
  ok: true;
  links: ProductLink[];
}

export interface ListingExtractError {
  ok: false;
  error: string;
}

export type ListingResult = ListingExtractResult | ListingExtractError;

export interface DetailExtractResult {
  ok: true;
  product: ProductDetail;
}

export interface DetailExtractError {
  ok: false;
  error: string;
  partial?: Partial<ProductDetail>;
}

export type DetailResult = DetailExtractResult | DetailExtractError;

const IMAGE_SCRAPE_SCRIPT = `(() => {
  const urls = new Set();
  for (const img of document.querySelectorAll('img')) {
    const src = img.currentSrc || img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || '';
    if (src && !src.startsWith('data:')) urls.add(src);
    const srcset = img.getAttribute('srcset');
    if (srcset) {
      for (const part of srcset.split(',')) {
        const u = part.trim().split(/\\s+/)[0];
        if (u && !u.startsWith('data:')) urls.add(u);
      }
    }
  }
  for (const source of document.querySelectorAll('picture source[srcset], source[src]')) {
    const src = source.getAttribute('src');
    const srcset = source.getAttribute('srcset');
    if (src && !src.startsWith('data:')) urls.add(src);
    if (srcset) {
      for (const part of srcset.split(',')) {
        const u = part.trim().split(/\\s+/)[0];
        if (u && !u.startsWith('data:')) urls.add(u);
      }
    }
  }
  return [...urls];
})()`;

export async function scrapePageImages(
  page: ReturnType<Stagehand['context']['pages']>[number],
  baseUrl: string
): Promise<string[]> {
  try {
    const raw = (await page.evaluate(IMAGE_SCRAPE_SCRIPT)) as string[];
    return [...new Set(raw.map((u) => resolveUrl(u, baseUrl)))].filter(
      (u) => u.startsWith('http') && !/logo|icon|avatar|sprite|banner-ad|payment/i.test(u)
    );
  } catch {
    return [];
  }
}

function normalizeLinks(raw: ProductLink[], baseUrl: string, limit: number): ProductLink[] {
  const seen = new Set<string>();
  const out: ProductLink[] = [];

  for (const item of raw) {
    const url = resolveUrl(item.url, baseUrl);
    if (!url.startsWith('http')) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ name: item.name.trim() || 'Product', url });
    if (out.length >= limit) break;
  }

  return out;
}

export async function extractProductListing(
  stagehand: Stagehand,
  categoryUrl: string,
  limit: number
): Promise<ListingResult> {
  try {
    const result = await stagehand.extract(
      `List up to ${limit} product items on this category/collection page. For each item return the product title and the link to its product detail page. Skip navigation links, ads, banners, and non-product items.`,
      productLinksSchema,
      { timeout: EXTRACT_TIMEOUT_MS }
    );

    const links = normalizeLinks(result.products, categoryUrl, limit);
    if (links.length === 0) {
      return { ok: false, error: 'No product links found on category page' };
    }
    return { ok: true, links };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function mergeImages(extracted: string[] | undefined, scraped: string[]): string[] {
  return [
    ...new Set(
      [...(extracted ?? []), ...scraped]
        .map((u) => u.trim())
        .filter((u) => u && !u.startsWith('data:'))
    ),
  ];
}

export function buildProductDetail(
  detail: Partial<ProductDetail> & { name?: string },
  link: ProductLink,
  scrapedImages: string[]
): ProductDetail {
  return {
    name: detail.name?.trim() || link.name,
    url: detail.url ? resolveUrl(detail.url, link.url) : link.url,
    price: detail.price,
    originalPrice: detail.originalPrice,
    currency: detail.currency,
    colors: detail.colors,
    description: detail.description,
    shortDescription: detail.shortDescription,
    images: mergeImages(detail.images, scrapedImages),
    sku: detail.sku,
    availability: detail.availability,
    specifications: detail.specifications,
    dimensions: detail.dimensions,
    material: detail.material,
  };
}

export async function extractProductDetail(
  stagehand: Stagehand,
  page: ReturnType<Stagehand['context']['pages']>[number],
  link: ProductLink
): Promise<DetailResult> {
  try {
    const scrapedImages = await scrapePageImages(page, link.url);

    const detail = await stagehand.extract(
      `Extract complete product information from this product detail page: name, current price, original price if on sale, currency, all available colors, full description, short description, SKU, stock/availability, material, dimensions, specification table as key-value pairs, and all product image URLs from the gallery.`,
      productDetailSchema,
      { timeout: EXTRACT_TIMEOUT_MS }
    );

    const product = buildProductDetail(detail, link, scrapedImages);

    if (!product.name) {
      return { ok: false, error: 'Product name missing after extraction', partial: product };
    }

    return { ok: true, product };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
