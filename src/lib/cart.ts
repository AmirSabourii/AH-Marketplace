import {
  getProductDisplayImage,
  getProductVariant,
  type Product,
} from '../data/scenes';

export interface CartItem {
  /** Stable key: productId + variantId */
  id: string;
  product: Product;
  variantId?: string;
  quantity: number;
}

export function cartItemKey(productId: string, variantId?: string): string {
  return variantId ? `${productId}:${variantId}` : productId;
}

export function createCartItem(
  product: Product,
  variantId: string | undefined,
  quantity = 1
): CartItem {
  return {
    id: cartItemKey(product.id, variantId),
    product,
    variantId,
    quantity,
  };
}

export function getCartItemImage(
  item: CartItem,
  colorSelections: Record<string, string>
): string {
  const selections = item.variantId
    ? { ...colorSelections, [item.product.id]: item.variantId }
    : colorSelections;
  return getProductDisplayImage(item.product, selections);
}

export function getCartItemVariantName(item: CartItem): string | null {
  const variant = getProductVariant(item.product, item.variantId);
  return variant?.name ?? null;
}

export function parsePrice(price: string): number {
  const digits = price.replace(/[^0-9.]/g, '');
  const value = Number.parseFloat(digits);
  return Number.isFinite(value) ? value : 0;
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getCartSubtotal(items: CartItem[]): string {
  const total = items.reduce(
    (sum, item) => sum + parsePrice(item.product.price) * item.quantity,
    0
  );
  return formatPrice(total);
}

export function getCartCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function addToCartItems(
  items: CartItem[],
  product: Product,
  variantId: string | undefined
): CartItem[] {
  const key = cartItemKey(product.id, variantId);
  const existing = items.find((item) => item.id === key);

  if (existing) {
    return items.map((item) =>
      item.id === key ? { ...item, quantity: item.quantity + 1 } : item
    );
  }

  return [...items, createCartItem(product, variantId)];
}

export function updateCartItemQuantity(
  items: CartItem[],
  itemId: string,
  quantity: number
): CartItem[] {
  if (quantity <= 0) {
    return items.filter((item) => item.id !== itemId);
  }
  return items.map((item) =>
    item.id === itemId ? { ...item, quantity } : item
  );
}

export function removeCartItem(items: CartItem[], itemId: string): CartItem[] {
  return items.filter((item) => item.id !== itemId);
}
