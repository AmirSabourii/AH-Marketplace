import { z } from 'zod';

export const storeInfoSchema = z.object({
  storeName: z.string().describe('Official store or business name'),
  address: z.string().optional().describe('Physical address if visible'),
  phone: z.string().optional().describe('Phone number if visible'),
  email: z.string().optional().describe('Contact email if visible'),
});

export const categoriesSchema = z.object({
  categories: z.array(
    z.object({
      name: z.string().describe('Category display name'),
      url: z.string().describe('Link to category page'),
      parent: z.string().optional().describe('Parent category name if nested'),
    })
  ),
});

export const productLinksSchema = z.object({
  products: z.array(
    z.object({
      name: z.string().describe('Product title as shown on listing'),
      url: z.string().describe('Link to product detail page'),
    })
  ),
});

export const productDetailSchema = z.object({
  name: z.string().describe('Full product name'),
  url: z.string().optional().describe('Product page URL'),
  price: z.string().optional().describe('Current selling price'),
  originalPrice: z.string().optional().describe('Original price if on sale'),
  currency: z.string().optional().describe('Currency code or symbol'),
  colors: z.array(z.string()).optional().describe('Available color options'),
  description: z.string().optional().describe('Full product description'),
  shortDescription: z.string().optional().describe('Short summary'),
  images: z.array(z.string()).optional().describe('All product image URLs'),
  sku: z.string().optional().describe('SKU or product code'),
  availability: z.string().optional().describe('Stock status'),
  specifications: z
    .record(z.string(), z.string())
    .optional()
    .describe('Specification table key-value pairs'),
  dimensions: z.string().optional().describe('Product dimensions'),
  material: z.string().optional().describe('Primary material or fabric'),
});

export const fetchExtractSchema = {
  type: 'object' as const,
  properties: {
    storeName: { type: 'string' as const },
    address: { type: 'string' as const },
    phone: { type: 'string' as const },
    email: { type: 'string' as const },
    categories: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          name: { type: 'string' as const },
          url: { type: 'string' as const },
          parent: { type: 'string' as const },
        },
        required: ['name', 'url'] as const,
      },
    },
  },
  required: ['storeName', 'categories'] as const,
};

export type FetchExtractResult = {
  storeName?: string;
  address?: string;
  phone?: string;
  email?: string;
  categories?: Array<{ name: string; url: string; parent?: string }>;
};

export type StoreInfoExtract = z.infer<typeof storeInfoSchema>;
export type CategoriesExtract = z.infer<typeof categoriesSchema>;
export type ProductDetailExtract = z.infer<typeof productDetailSchema>;
