import type { CategoryId } from '../data/categories';
import { ENABLED_CATEGORIES } from '../data/categories';

export interface ShareTarget {
  categoryId: CategoryId;
  sceneId: string;
  productId?: string | null;
  room?: boolean;
}

export function isValidCategoryId(id: string): id is CategoryId {
  return ENABLED_CATEGORIES.some((c) => c.id === id);
}

export function buildShareUrl(target: ShareTarget): string {
  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set('category', target.categoryId);
  url.searchParams.set('scene', target.sceneId);
  if (target.productId) {
    url.searchParams.set('product', target.productId);
  }
  if (target.room) {
    url.searchParams.set('room', '1');
  }
  return url.toString();
}

export async function sharePageLink(
  url: string,
  title = 'The Home — Staged Shopping'
): Promise<'shared' | 'copied' | 'cancelled'> {
  if (navigator.share) {
    try {
      await navigator.share({ title, url });
      return 'shared';
    } catch (err) {
      if ((err as Error).name === 'AbortError') return 'cancelled';
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    const input = document.createElement('input');
    input.value = url;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    return 'copied';
  }
}

export function parseDeepLink(): {
  categoryId?: CategoryId;
  sceneId?: string;
  productId?: string;
  openRoom?: boolean;
} {
  const params = new URLSearchParams(window.location.search);
  const category = params.get('category');
  const sceneId = params.get('scene') ?? undefined;
  const productId = params.get('product') ?? undefined;
  const openRoom = params.get('room') === '1';

  return {
    categoryId:
      category && isValidCategoryId(category) ? category : undefined,
    sceneId,
    productId,
    openRoom,
  };
}
