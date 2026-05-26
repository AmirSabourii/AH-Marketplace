import { SCENES, type Product } from '../../data/scenes';
import { analyzeRoomScene } from '../gemini/roomAnalysis';
import { productsToVisualizerInput } from '../gemini/catalogToVisualizer';
import { consumeCurateBrief } from '../gemini/curateStageContext';
import {
  curateRoomVisualization,
  generateRoomVisualization,
  rearrangeRoomVisualization,
} from '../gemini/visualizer';
import type { RoomStageMode } from './stageRequest';

type VisualizerProgress = {
  phase?: string;
  message?: string;
  provider?: string;
  index?: number;
  total?: number;
};

function productsByIds(ids: string[]): Product[] {
  const byId = new Map<string, Product>();
  for (const scene of SCENES) {
    for (const product of scene.products) {
      byId.set(product.id, product);
    }
  }
  return ids.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p));
}

function resolveVisualizerInputs(body: {
  productIds?: string[];
  productImageUrls?: string[];
  productTitles?: string[];
  productDescriptions?: string[];
}): ReturnType<typeof productsToVisualizerInput> {
  if (body.productImageUrls?.length) {
    return body.productImageUrls.map((imageUrl, i) => ({
      name: body.productTitles?.[i] ?? 'Product',
      description: body.productDescriptions?.[i] ?? '',
      imageUrl,
    }));
  }

  const products = productsByIds(body.productIds ?? []);
  if (products.length === 0 && (body.productIds?.length ?? 0) > 0) {
    throw new Error(
      'Could not resolve product images for staging. Reload the catalog and try again.'
    );
  }
  return productsToVisualizerInput(products);
}

async function dataUriToFile(dataUri: string, filename = 'room.jpg'): Promise<File> {
  const res = await fetch(dataUri);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || 'image/jpeg' });
}

const PROGRESS: Record<RoomStageMode, string> = {
  compose: 'Staging room (Gemini)…',
  rearrange: 'Rearranging layout (Gemini)…',
  curate: 'Curating your room (Gemini)…',
  remove: 'Updating room (Gemini)…',
};

export async function clientAnalyzeRoom(
  roomDataUri: string,
  options: {
    onProgress?: (p: VisualizerProgress) => void;
    signal?: AbortSignal;
  }
) {
  options.onProgress?.({ phase: 'analyze', message: 'Analyzing room (Gemini)…' });
  const roomFile = await dataUriToFile(roomDataUri);
  return analyzeRoomScene({ roomFile, signal: options.signal });
}

export async function clientStageRoom(
  body: {
    roomDataUri: string;
    mode?: RoomStageMode;
    productIds?: string[];
    productImageUrls?: string[];
    productTitles?: string[];
    productDescriptions?: string[];
  },
  options: {
    onProgress?: (p: VisualizerProgress) => void;
    signal?: AbortSignal;
  }
): Promise<{ imageUrl: string; provider?: string }> {
  const mode: RoomStageMode = body.mode ?? 'compose';
  options.onProgress?.({ phase: 'stage', message: PROGRESS[mode] });

  const roomFile = await dataUriToFile(body.roomDataUri);
  const inputs = resolveVisualizerInputs(body);

  if (mode === 'compose' && inputs.length === 0) {
    throw new Error('Add at least one product to stage in your room.');
  }

  let imageUrl: string;
  if (mode === 'rearrange') {
    // Rearrange mirrors the compose pipeline exactly — single image input
    // (the user's current room), no catalog reference products. Gemini
    // returns a new image with the same room and re-positioned furniture.
    imageUrl = await rearrangeRoomVisualization({
      roomFile,
      signal: options.signal,
    });
  } else if (mode === 'curate') {
    if (inputs.length === 0) {
      throw new Error('Could not load catalog products for curation.');
    }
    imageUrl = await curateRoomVisualization({
      roomFile,
      products: inputs,
      roomBrief: consumeCurateBrief(),
      signal: options.signal,
    });
  } else {
    imageUrl = await generateRoomVisualization({
      roomFile,
      products: inputs,
      signal: options.signal,
    });
  }

  return { imageUrl, provider: 'gemini-client' };
}
