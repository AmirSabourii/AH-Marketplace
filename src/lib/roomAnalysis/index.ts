export type { DetectedRoomElement, RoomSceneAnalysis, RoomElementKind } from './types';
export { analyzeRoomScene } from '../gemini/roomAnalysis';
export {
  hashRoomFile,
  loadCachedRoomAnalysis,
  saveCachedRoomAnalysis,
} from './storage';
export { pickBestProductForElement, categoryLabelForElement } from './matchProducts';
