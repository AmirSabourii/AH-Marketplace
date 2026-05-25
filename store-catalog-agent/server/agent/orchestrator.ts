import Browserbase from '@browserbasehq/sdk';
import { Stagehand } from '@browserbasehq/stagehand';
import {
  categoriesSchema,
  fetchExtractSchema,
  storeInfoSchema,
  type FetchExtractResult,
} from './schemas.js';
import {
  hasExtractableCategories,
  runProductExtraction,
  type CategorySelectionOptions,
} from './products/index.js';
import { initStagehandSession } from './sessionConfig.js';
import type { CatalogDiscoveryResult, CategoryItem, CategoryProductsBundle, EmitFn } from '../types.js';

function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) throw new Error('URL is required');
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return new URL(withProtocol).href;
}

function dedupeCategories(items: CategoryItem[]): CategoryItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.name}::${item.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function confidenceFrom(
  store: { name: string; address?: string; phone?: string },
  categories: CategoryItem[]
): 'high' | 'partial' | 'low' {
  const hasContact = Boolean(store.address || store.phone);
  if (store.name && categories.length >= 3 && hasContact) return 'high';
  if (store.name && categories.length > 0) return 'partial';
  return 'low';
}

async function extractProductsFromCategories(params: {
  stagehand: Stagehand;
  bb: Browserbase;
  sessionId?: string;
  categories: CategoryItem[];
  selection: CategorySelectionOptions;
  emit: EmitFn;
}): Promise<CategoryProductsBundle[]> {
  return runProductExtraction(
    {
      stagehand: params.stagehand,
      bb: params.bb,
      sessionId: params.sessionId,
      emit: params.emit,
    },
    params.categories,
    params.selection
  );
}

async function runProductExtractionSession(
  apiKey: string,
  projectId: string,
  categories: CategoryItem[],
  selection: CategorySelectionOptions,
  emit: EmitFn
): Promise<CategoryProductsBundle[]> {
  if (!hasExtractableCategories(categories, selection)) return [];

  emit('log', {
    level: 'info',
    message: 'شروع session مرورگر برای استخراج محصولات...',
    ts: Date.now(),
  });

  const { stagehand, bb, sessionId } = await initStagehandSession(apiKey, projectId, emit);
  try {
    return await extractProductsFromCategories({
      stagehand,
      bb,
      sessionId,
      categories,
      selection,
      emit,
    });
  } finally {
    await stagehand.close();
  }
}

async function tryFetchExtract(
  bb: Browserbase,
  url: string,
  emit: EmitFn
): Promise<CatalogDiscoveryResult | null> {
  emit('log', { level: 'info', message: 'Trying Fetch API (fast path)...', ts: Date.now() });

  try {
    const response = await bb.fetchAPI.create({
      url,
      format: 'json',
      proxies: true,
      allowRedirects: true,
      schema: fetchExtractSchema,
    });

    if (response.statusCode >= 400) {
      emit('log', {
        level: 'warn',
        message: `Fetch returned HTTP ${response.statusCode}`,
        ts: Date.now(),
      });
      return null;
    }

    const data = response.content as FetchExtractResult;
    const categories = dedupeCategories(
      (data.categories ?? []).map((c) => ({
        name: c.name,
        url: c.url,
        parent: c.parent,
      }))
    );

    if (!data.storeName || categories.length === 0) {
      emit('log', {
        level: 'warn',
        message: 'Fetch result incomplete — escalating to browser agent',
        ts: Date.now(),
      });
      return null;
    }

    const store = {
      name: data.storeName,
      address: data.address,
      phone: data.phone,
      email: data.email,
    };

    return {
      sourceUrl: url,
      store,
      categories,
      meta: {
        method: 'fetch',
        durationMs: 0,
        confidence: confidenceFrom(store, categories),
      },
    };
  } catch (err) {
    emit('log', {
      level: 'warn',
      message: `Fetch failed: ${err instanceof Error ? err.message : String(err)}`,
      ts: Date.now(),
    });
    return null;
  }
}

async function runStagehandExtract(
  apiKey: string,
  projectId: string,
  url: string,
  selection: CategorySelectionOptions,
  emit: EmitFn
): Promise<CatalogDiscoveryResult> {
  emit('progress', { step: 1, total: 6, label: 'Starting browser session' });
  emit('log', { level: 'info', message: 'Launching Stagehand on Browserbase...', ts: Date.now() });

  const { stagehand, bb, sessionId } = await initStagehandSession(apiKey, projectId, emit);

  const page = stagehand.context.pages()[0];

  emit('progress', { step: 2, total: 6, label: 'Opening store homepage' });
  emit('log', { level: 'info', message: `Navigating to ${url}`, ts: Date.now() });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeoutMs: 60000 });

  emit('progress', { step: 3, total: 6, label: 'Dismissing popups' });
  try {
    await stagehand.act('Dismiss cookie banners, newsletter popups, or age gates if visible');
  } catch {
    emit('log', { level: 'warn', message: 'No popup to dismiss (ok)', ts: Date.now() });
  }

  emit('progress', { step: 4, total: 6, label: 'Extracting store contact info' });
  emit('log', {
    level: 'info',
    message: 'Extracting store name, address, phone from page...',
    ts: Date.now(),
  });

  let storeExtract = await stagehand.extract(
    'Extract the store or business name, physical address, phone number, and email from the footer, header, contact section, or schema.org data on this e-commerce site.',
    storeInfoSchema
  );

  if (!storeExtract.phone || !storeExtract.address) {
    emit('log', {
      level: 'info',
      message: 'Contact info incomplete — trying contact page...',
      ts: Date.now(),
    });
    try {
      await stagehand.act(
        'Click Contact Us, About, or footer contact link if available, then wait for the page to load'
      );
      const contactExtract = await stagehand.extract(
        'Extract store name, physical address, phone number, and email from this contact page',
        storeInfoSchema
      );
      storeExtract = {
        storeName: contactExtract.storeName || storeExtract.storeName,
        address: contactExtract.address || storeExtract.address,
        phone: contactExtract.phone || storeExtract.phone,
        email: contactExtract.email || storeExtract.email,
      };
    } catch {
      emit('log', { level: 'warn', message: 'Could not open contact page', ts: Date.now() });
    }
  }

  emit('progress', { step: 5, total: 6, label: 'Extracting product categories' });
  emit('log', {
    level: 'info',
    message: 'Opening shop menu and extracting categories...',
    ts: Date.now(),
  });

  try {
    await stagehand.act(
      'Open the main shop, products, or categories navigation menu. Expand all category dropdowns or accordions so every product category is visible.'
    );
  } catch {
    emit('log', {
      level: 'warn',
      message: 'Could not expand menus — extracting visible categories only',
      ts: Date.now(),
    });
  }

  let categoriesExtract = await stagehand.extract(
    'Extract ALL product categories from navigation menus, shop pages, category sidebars, and collection links. Include subcategories with their parent name when nested.',
    categoriesSchema
  );

  if (categoriesExtract.categories.length < 2) {
    emit('log', {
      level: 'info',
      message: 'Few categories found — running autonomous agent pass...',
      ts: Date.now(),
    });

    try {
      const categoryAgent = stagehand.agent();
      await categoryAgent.execute(
        `On this e-commerce website, find every product category. Open shop/catalog menus, expand submenus, visit /shop or /collections if needed. Do not add products to cart. Just discover category names and URLs.`
      );

      categoriesExtract = await stagehand.extract(
        'Extract every product category name and URL visible on the site after navigation',
        categoriesSchema
      );
    } catch (err) {
      emit('log', {
        level: 'warn',
        message: `Agent pass failed: ${err instanceof Error ? err.message : String(err)}`,
        ts: Date.now(),
      });
    }
  }

  const categories = dedupeCategories(categoriesExtract.categories);
  const method =
    categories.length >= 2 ? 'stagehand-extract' : ('stagehand-agent' as const);

  const store = {
    name: storeExtract.storeName || new URL(url).hostname,
    address: storeExtract.address,
    phone: storeExtract.phone,
    email: storeExtract.email,
  };

  emit('progress', { step: 6, total: 6, label: 'Extracting products from category' });
  const categoryProducts = await extractProductsFromCategories({
    stagehand,
    bb,
    sessionId,
    categories,
    selection,
    emit,
  });

  await stagehand.close();

  return {
    sourceUrl: url,
    store,
    categories,
    categoryProducts: categoryProducts.length > 0 ? categoryProducts : undefined,
    meta: {
      method,
      sessionId: sessionId ?? undefined,
      durationMs: 0,
      confidence: confidenceFrom(store, categories),
    },
  };
}

export async function discoverCatalog(params: {
  apiKey: string;
  projectId: string;
  url: string;
  categoryQuery?: string;
  productsPerCategory?: number;
  emit: EmitFn;
}): Promise<CatalogDiscoveryResult> {
  const started = Date.now();
  const url = normalizeUrl(params.url);
  const bb = new Browserbase({ apiKey: params.apiKey });

  const selection: CategorySelectionOptions = {
    query: params.categoryQuery,
    maxCategories: 1,
    productsPerCategory: params.productsPerCategory ?? 5,
  };

  params.emit('log', {
    level: 'info',
    message: `Starting catalog discovery for ${url}`,
    ts: Date.now(),
  });

  const fetchResult = await tryFetchExtract(bb, url, params.emit);

  let result: CatalogDiscoveryResult;
  if (fetchResult) {
    params.emit('log', {
      level: 'success',
      message: `Fetch extracted ${fetchResult.categories.length} categories`,
      ts: Date.now(),
    });
    result = fetchResult;

    if (hasExtractableCategories(result.categories, selection)) {
      const categoryProducts = await runProductExtractionSession(
        params.apiKey,
        params.projectId,
        result.categories,
        selection,
        params.emit
      );
      if (categoryProducts.length > 0) result = { ...result, categoryProducts };
    }
  } else {
    result = await runStagehandExtract(
      params.apiKey,
      params.projectId,
      url,
      selection,
      params.emit
    );
    params.emit('log', {
      level: 'success',
      message: `Browser agent extracted ${result.categories.length} categories`,
      ts: Date.now(),
    });
  }

  result.meta.durationMs = Date.now() - started;
  return result;
}
