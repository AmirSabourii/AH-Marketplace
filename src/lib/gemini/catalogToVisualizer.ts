import {
  getProductDisplayImage,
  getProductVariant,
  type Product,
} from '../../data/scenes';
import type { VisualizerProductInput } from './visualizer';

export function productsToVisualizerInput(
  products: Product[],
  colorSelections: Record<string, string> = {}
): VisualizerProductInput[] {
  return products.map((product) => {
    const variant = getProductVariant(product, colorSelections[product.id]);
    return {
      name: product.name,
      description: product.description,
      imageUrl: getProductDisplayImage(product, colorSelections),
      variantName: variant?.name,
    };
  });
}
