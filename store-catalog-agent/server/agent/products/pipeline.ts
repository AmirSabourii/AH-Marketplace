import type Browserbase from '@browserbasehq/sdk';
import type { Stagehand } from '@browserbasehq/stagehand';
import { emitBrowserView, resolveUrl, safeGoto, withRetry } from '../sessionConfig.js';
import type { CategoryItem, CategoryProductsBundle, EmitFn, ProductDetail } from '../../types.js';
import {
  explainCategorySelection,
  selectCategoriesForExtraction,
} from './categorySelector.js';
import {
  DEFAULT_SELECTION,
  POPUP_ACT_TIMEOUT_MS,
  type CategorySelectionOptions,
} from './config.js';
import { extractProductDetail, extractProductListing } from './extractors.js';

export interface ExtractionContext {
  stagehand: Stagehand;
  bb: Browserbase;
  sessionId?: string;
  emit: EmitFn;
}

export interface CategoryExtractionReport {
  category: CategoryItem;
  products: ProductDetail[];
  requested: number;
  extracted: number;
  errors: string[];
}

async function dismissPopups(stagehand: Stagehand): Promise<void> {
  try {
    await stagehand.act('Dismiss cookie banners, newsletter popups, or age gates if visible', {
      timeout: POPUP_ACT_TIMEOUT_MS,
    });
  } catch {
    // optional
  }
}

async function refreshBrowser(ctx: ExtractionContext): Promise<void> {
  if (!ctx.sessionId) return;
  await emitBrowserView(ctx.bb, ctx.sessionId, ctx.emit);
}

function emitProgress(
  emit: EmitFn,
  step: number,
  total: number,
  label: string
): void {
  emit('progress', { step, total, label });
}

/**
 * Pipeline for ONE category:
 * 1. Navigate to category URL
 * 2. Extract product listing (up to N links)
 * 3. For each link → navigate → extract detail
 * 4. Emit each product via SSE; collect errors without aborting
 */
export async function runCategoryProductPipeline(
  ctx: ExtractionContext,
  category: CategoryItem,
  productsPerCategory: number
): Promise<CategoryExtractionReport> {
  const page = ctx.stagehand.context.pages()[0];
  const categoryUrl = resolveUrl(category.url, category.url);
  const errors: string[] = [];
  const products: ProductDetail[] = [];
  const totalSteps = productsPerCategory + 2;

  ctx.emit('log', {
    level: 'info',
    message: `── دسته: ${category.name} → ${categoryUrl}`,
    ts: Date.now(),
  });

  // Step 1: open category
  emitProgress(ctx.emit, 1, totalSteps, `باز کردن ${category.name}`);
  try {
    await withRetry(
      async () => {
        await safeGoto(page, categoryUrl, ctx.emit, `category:${category.name}`);
        await refreshBrowser(ctx);
      },
      { label: `Open category ${category.name}`, emit: ctx.emit, attempts: 2 }
    );
    await dismissPopups(ctx.stagehand);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Category navigation failed: ${msg}`);
    ctx.emit('log', { level: 'error', message: msg, ts: Date.now() });
    return {
      category: { ...category, url: categoryUrl },
      products: [],
      requested: productsPerCategory,
      extracted: 0,
      errors,
    };
  }

  // Step 2: listing
  emitProgress(ctx.emit, 2, totalSteps, `لیست محصولات ${category.name}`);
  const listing = await withRetry(
    () => extractProductListing(ctx.stagehand, categoryUrl, productsPerCategory),
    { label: `Listing ${category.name}`, emit: ctx.emit, attempts: 3 }
  );

  if (!listing.ok) {
    errors.push(listing.error);
    ctx.emit('log', {
      level: 'warn',
      message: `لیست محصولات «${category.name}» خالی: ${listing.error}`,
      ts: Date.now(),
    });
    return {
      category: { ...category, url: categoryUrl },
      products: [],
      requested: productsPerCategory,
      extracted: 0,
      errors,
    };
  }

  ctx.emit('log', {
    level: 'success',
    message: `${listing.links.length} محصول از «${category.name}» انتخاب شد`,
    ts: Date.now(),
  });

  // Step 3+: each product detail
  for (let i = 0; i < listing.links.length; i++) {
    const link = listing.links[i]!;
    emitProgress(
      ctx.emit,
      i + 3,
      totalSteps,
      `${category.name} — محصول ${i + 1}/${listing.links.length}`
    );

    ctx.emit('log', {
      level: 'info',
      message: `[${i + 1}/${listing.links.length}] ${link.name}`,
      ts: Date.now(),
    });

    try {
      await withRetry(
        async () => {
          await safeGoto(page, link.url, ctx.emit, `product:${i + 1}`);
          await refreshBrowser(ctx);
        },
        { label: `Open ${link.name}`, emit: ctx.emit, attempts: 2 }
      );
      await dismissPopups(ctx.stagehand);

      const detail = await withRetry(
        () => extractProductDetail(ctx.stagehand, page, link),
        { label: `Extract ${link.name}`, emit: ctx.emit, attempts: 2 }
      );

      if (!detail.ok) {
        errors.push(`${link.name}: ${detail.error}`);
        ctx.emit('log', {
          level: 'error',
          message: `✗ ${link.name}: ${detail.error}`,
          ts: Date.now(),
        });
        continue;
      }

      products.push(detail.product);

      ctx.emit('product', {
        index: i,
        total: listing.links.length,
        category: category.name,
        categoryUrl,
        product: detail.product,
      });

      ctx.emit('log', {
        level: 'success',
        message: `✓ ${detail.product.name} — ${detail.product.images.length} عکس، ${detail.product.price ?? '—'}`,
        ts: Date.now(),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${link.name}: ${msg}`);
      ctx.emit('log', { level: 'error', message: `✗ ${link.name}: ${msg}`, ts: Date.now() });

      if (ctx.sessionId && /closed|disconnect|websocket|timeout/i.test(msg)) {
        ctx.emit('log', {
          level: 'warn',
          message: 'بازیابی session...',
          ts: Date.now(),
        });
        await refreshBrowser(ctx);
      }
    }
  }

  return {
    category: { ...category, url: categoryUrl },
    products,
    requested: productsPerCategory,
    extracted: products.length,
    errors,
  };
}

export async function runProductExtraction(
  ctx: ExtractionContext,
  categories: CategoryItem[],
  selectionOptions: CategorySelectionOptions = {}
): Promise<CategoryProductsBundle[]> {
  const opts = { ...DEFAULT_SELECTION, ...selectionOptions };
  const selected = selectCategoriesForExtraction(categories, {
    query: opts.query,
    maxCategories: opts.maxCategories,
  });

  const explanation = explainCategorySelection(selected, categories, opts.query);
  ctx.emit('log', { level: 'info', message: explanation, ts: Date.now() });

  if (selected.length === 0) return [];

  const bundles: CategoryProductsBundle[] = [];

  for (const category of selected) {
    const report = await runCategoryProductPipeline(ctx, category, opts.productsPerCategory);

    if (report.errors.length > 0) {
      ctx.emit('log', {
        level: 'warn',
        message: `«${category.name}»: ${report.extracted}/${report.requested} محصول — ${report.errors.length} خطا`,
        ts: Date.now(),
      });
    }

    bundles.push({
      category: report.category,
      products: report.products,
      meta: {
        requested: report.requested,
        extracted: report.extracted,
        errors: report.errors.length > 0 ? report.errors : undefined,
      },
    });
  }

  return bundles;
}

// Re-exports for orchestrator compatibility
export { selectCategoriesForExtraction } from './categorySelector.js';

export function hasExtractableCategories(
  categories: CategoryItem[],
  options?: CategorySelectionOptions
): boolean {
  return selectCategoriesForExtraction(categories, options).length > 0;
}
