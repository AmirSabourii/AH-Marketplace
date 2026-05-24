import type { RoomSceneAnalysis } from './types';

const DB_NAME = 'thehome-room-analysis';
const DB_VERSION = 1;
const STORE = 'analysis';
/** Bump when analysis algorithm changes — invalidates stale caches */
const CACHE_VERSION = 'v7';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error('Failed to open analysis storage'));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
  });
}

export async function hashRoomFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function loadCachedRoomAnalysis(
  fileHash: string
): Promise<RoomSceneAnalysis | null> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const request = tx.objectStore(STORE).get(`${CACHE_VERSION}:${fileHash}`);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const value = request.result as RoomSceneAnalysis | undefined;
        resolve(value?.elements?.length ? value : null);
      };
    });
  } catch {
    return null;
  }
}

export async function saveCachedRoomAnalysis(
  fileHash: string,
  analysis: RoomSceneAnalysis
): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const request = tx.objectStore(STORE).put(analysis, `${CACHE_VERSION}:${fileHash}`);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
