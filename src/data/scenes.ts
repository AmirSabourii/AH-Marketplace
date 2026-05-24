import type { CategoryId } from './categories';

export interface ProductColorVariant {
  id: string;
  name: string;
  /** CSS color for the swatch button */
  swatch: string;
  productImage: string;
  sceneImage: string;
}

export interface Product {
  id: string;
  name: string;
  price: string;
  description: string;
  image: string;
  anchorX: number;
  anchorY: number;
  featured?: boolean;
  /** When set, user can pick a color; scene + product image update per variant */
  variants?: ProductColorVariant[];
}

export interface Scene {
  id: string;
  categoryId: CategoryId;
  title: string;
  subtitle?: string;
  image: string;
  products: Product[];
}

/** Staged room scenes — horizontal swipe stays within the same categoryId. */
export const SCENES: Scene[] = [
  {
    id: 'sofa-living',
    categoryId: 'sofa',
    title: 'Living · Cloud Sofa',
    image: '/assets/room-sofa.png',
    products: [
      {
        id: 'sofa-cloud',
        name: 'Cloud Modular Sofa',
        price: '$2,480',
        description:
          'Low-profile modular sectional in warm cream bouclé. Deep seats, soft edges — the anchor piece for calm living rooms.',
        image: '/assets/product-sofa.png',
        anchorX: 0.34,
        anchorY: 0.56,
        featured: true,
        variants: [
          {
            id: 'cream',
            name: 'Cream Bouclé',
            swatch: '#EDE8DF',
            productImage: '/assets/product-sofa.png',
            sceneImage: '/assets/room-sofa.png',
          },
          {
            id: 'slate',
            name: 'Slate Linen',
            swatch: '#6B7280',
            productImage: '/assets/product1.png',
            sceneImage: '/assets/room1.png',
          },
        ],
      },
    ],
  },
  {
    id: 'sofa-lounge',
    categoryId: 'sofa',
    title: 'Lounge · Linen Sectional',
    subtitle: 'Scene 2',
    image: '/assets/room1.png',
    products: [
      {
        id: 'sofa-linen',
        name: 'Linen Corner Sectional',
        price: '$2,190',
        description:
          'Relaxed linen upholstery with slim arms. Perfect for open-plan lounges and soft afternoon light.',
        image: '/assets/product1.png',
        anchorX: 0.42,
        anchorY: 0.58,
        featured: true,
      },
    ],
  },
  {
    id: 'bed-bedroom',
    categoryId: 'bed',
    title: 'Bedroom · Haven Bed',
    image: '/assets/room-bed.png',
    products: [
      {
        id: 'bed-haven',
        name: 'Haven Platform Bed',
        price: '$1,890',
        description:
          'Floating platform bed with layered white linens and a whisper-quiet frame. Designed for light, airy bedrooms.',
        image: '/assets/product-bed.png',
        anchorX: 0.5,
        anchorY: 0.6,
        featured: true,
      },
    ],
  },
  {
    id: 'bed-suite',
    categoryId: 'bed',
    title: 'Suite · Oak Frame',
    subtitle: 'Scene 2',
    image: '/assets/room2.png',
    products: [
      {
        id: 'bed-oak',
        name: 'Oak Arch Frame Bed',
        price: '$2,120',
        description:
          'Curved oak headboard with organic grain. Pairs with neutral textiles for a grounded, hotel-like suite.',
        image: '/assets/product2.png',
        anchorX: 0.48,
        anchorY: 0.55,
        featured: true,
      },
    ],
  },
  {
    id: 'rug-living',
    categoryId: 'rug',
    title: 'Living · Persian Rug',
    image: '/assets/room-rug.png',
    products: [
      {
        id: 'rug-persian',
        name: 'Heritage Persian Rug',
        price: '$890',
        description:
          'Hand-knotted wool with deep burgundy and ivory motifs. Anchors the room without overpowering neutral furniture.',
        image: '/assets/product1.png',
        anchorX: 0.5,
        anchorY: 0.72,
        featured: true,
      },
    ],
  },
  {
    id: 'rug-minimal',
    categoryId: 'rug',
    title: 'Minimal · Flatweave',
    subtitle: 'Scene 2',
    image: '/assets/room1.png',
    products: [
      {
        id: 'rug-flatweave',
        name: 'Sisal Flatweave',
        price: '$420',
        description:
          'Natural fiber weave in warm sand. Low pile, easy care — ideal under dining tables and reading nooks.',
        image: '/assets/product2.png',
        anchorX: 0.46,
        anchorY: 0.68,
        featured: true,
      },
    ],
  },
  {
    id: 'table-dining',
    categoryId: 'table',
    title: 'Dining · Round Oak',
    image: '/assets/room-table.png',
    products: [
      {
        id: 'table-oak',
        name: 'Round Oak Dining Table',
        price: '$1,240',
        description:
          'Solid oak top with soft bullnose edge. Seats six comfortably in Scandinavian-inspired dining rooms.',
        image: '/assets/product1.png',
        anchorX: 0.5,
        anchorY: 0.55,
        featured: true,
      },
    ],
  },
  {
    id: 'table-console',
    categoryId: 'table',
    title: 'Entry · Console',
    subtitle: 'Scene 2',
    image: '/assets/room-decor.png',
    products: [
      {
        id: 'table-console',
        name: 'Slim Console Table',
        price: '$680',
        description:
          'Powder-coated steel legs with walnut top. Narrow profile for hallways and behind-sofa placement.',
        image: '/assets/product2.png',
        anchorX: 0.38,
        anchorY: 0.62,
        featured: true,
      },
    ],
  },
  {
    id: 'lamp-bedroom',
    categoryId: 'lamp',
    title: 'Bedroom · Ceramic Lamp',
    image: '/assets/room-lamp.png',
    products: [
      {
        id: 'lamp-ceramic',
        name: 'Ceramic Bedside Lamp',
        price: '$185',
        description:
          'Matte ceramic base with linen drum shade. Warm dimmable glow for evening wind-down.',
        image: '/assets/product1.png',
        anchorX: 0.28,
        anchorY: 0.48,
        featured: true,
      },
    ],
  },
  {
    id: 'lamp-floor',
    categoryId: 'lamp',
    title: 'Living · Arc Floor',
    subtitle: 'Scene 2',
    image: '/assets/room2.png',
    products: [
      {
        id: 'lamp-arc',
        name: 'Brass Arc Floor Lamp',
        price: '$320',
        description:
          'Sweeping brass arm with marble base. Throws focused light over sofas without ceiling fixtures.',
        image: '/assets/product2.png',
        anchorX: 0.62,
        anchorY: 0.42,
        featured: true,
      },
    ],
  },
  {
    id: 'decor-entry',
    categoryId: 'decor',
    title: 'Entry · Wall Art',
    image: '/assets/room-decor.png',
    products: [
      {
        id: 'decor-art',
        name: 'Abstract Canvas Triptych',
        price: '$540',
        description:
          'Muted abstract panels in clay and sage. Sized for entryways and dining feature walls.',
        image: '/assets/product1.png',
        anchorX: 0.55,
        anchorY: 0.35,
        featured: true,
      },
    ],
  },
  {
    id: 'decor-shelf',
    categoryId: 'decor',
    title: 'Shelf · Styling',
    subtitle: 'Scene 2',
    image: '/assets/room-sofa.png',
    products: [
      {
        id: 'decor-vase',
        name: 'Stoneware Statement Vase',
        price: '$95',
        description:
          'Hand-thrown silhouette in charcoal glaze. One piece elevates consoles and open shelving.',
        image: '/assets/product2.png',
        anchorX: 0.72,
        anchorY: 0.38,
        featured: true,
      },
    ],
  },
];

export function getScenesByCategory(categoryId: CategoryId): Scene[] {
  if (categoryId === 'all') return SCENES;
  return SCENES.filter((s) => s.categoryId === categoryId);
}

export function getFeaturedProduct(scene: Scene): Product {
  return scene.products.find((p) => p.featured) ?? scene.products[0];
}

export function getProductVariant(
  product: Product,
  variantId?: string
): ProductColorVariant | null {
  if (!product.variants?.length) return null;
  const found = variantId
    ? product.variants.find((v) => v.id === variantId)
    : undefined;
  return found ?? product.variants[0];
}

export function getProductDisplayImage(
  product: Product,
  colorSelections: Record<string, string>
): string {
  const variant = getProductVariant(product, colorSelections[product.id]);
  return variant?.productImage ?? product.image;
}

export function getSceneDisplayImage(
  scene: Scene,
  colorSelections: Record<string, string>,
  customRoomBySceneId: Record<string, string> = {}
): string {
  const custom = customRoomBySceneId[scene.id];
  if (custom) return custom;

  for (const product of scene.products) {
    const variant = getProductVariant(product, colorSelections[product.id]);
    if (variant) return variant.sceneImage;
  }
  return scene.image;
}

export function findSceneById(sceneId: string): Scene | undefined {
  return SCENES.find((s) => s.id === sceneId);
}

export function findSceneForProduct(productId: string): Scene | undefined {
  return SCENES.find((s) => s.products.some((p) => p.id === productId));
}

export function findProductInScene(
  productId: string
): { product: Product; scene: Scene } | undefined {
  for (const scene of SCENES) {
    const product = scene.products.find((p) => p.id === productId);
    if (product) return { product, scene };
  }
  return undefined;
}

export function getAllProductsForCategory(categoryId: CategoryId): Product[] {
  const seen = new Set<string>();
  const out: Product[] = [];
  const scenes = categoryId === 'all' ? SCENES : getScenesByCategory(categoryId);
  for (const scene of scenes) {
    for (const p of scene.products) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        out.push(p);
      }
    }
  }
  return out;
}
