import type { Product } from '../data/scenes';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** Room / staged image shown in the user bubble */
  imageUrl?: string;
  /** Base64 data URL sent to the vision model */
  imageDataUrl?: string;
  productIds?: string[];
  products?: Product[];
  error?: boolean;
}
