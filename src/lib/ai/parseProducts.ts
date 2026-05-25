const PRODUCTS_TAG = /\[PRODUCTS:\s*([^\]]+)\]\s*$/im;

export function parseAssistantContent(raw: string): {
  text: string;
  productIds: string[];
} {
  const match = raw.match(PRODUCTS_TAG);
  if (!match) {
    return { text: raw.trim(), productIds: [] };
  }

  const text = raw.replace(PRODUCTS_TAG, '').trim();
  const productIds = match[1]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);

  return { text, productIds };
}
