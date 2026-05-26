import type { Product } from '../../data/scenes';
import { getProductDisplayImage } from '../../data/scenes';

export type RoomStageMode = 'compose' | 'rearrange' | 'curate' | 'remove';

export type RoomStageRequestBody = {
  roomDataUri: string;
  mode: RoomStageMode;
  productIds: string[];
  productImageUrls: string[];
  productTitles: string[];
  productDescriptions: string[];
  removeProductTitle?: string;
};

export function buildRoomStageRequest(params: {
  roomDataUri: string;
  mode: RoomStageMode;
  products: Product[];
  colorSelections: Record<string, string>;
  removeProductTitle?: string;
}): RoomStageRequestBody {
  const { roomDataUri, mode, products, colorSelections, removeProductTitle } = params;

  return {
    roomDataUri,
    mode,
    productIds: products.map((p) => p.id),
    productImageUrls: products.map((p) =>
      getProductDisplayImage(p, colorSelections)
    ),
    productTitles: products.map((p) => p.name),
    productDescriptions: products.map((p) => p.description),
    ...(removeProductTitle ? { removeProductTitle } : {}),
  };
}
