const DB_NAME = 'thehome';
const DB_VERSION = 1;
const STORE_NAME = 'room';
const ROOM_KEY = 'saved-room';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error ?? new Error('Failed to open room storage'));
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

function idbGet<T>(key: string): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(key);

        request.onerror = () => reject(request.error ?? new Error('Failed to read room'));
        request.onsuccess = () => resolve(request.result as T | undefined);
      })
  );
}

function idbSet(key: string, value: Blob): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.put(value, key);

        request.onerror = () => reject(request.error ?? new Error('Failed to save room'));
        request.onsuccess = () => resolve();
      })
  );
}

function idbDelete(key: string): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.delete(key);

        request.onerror = () => reject(request.error ?? new Error('Failed to clear room'));
        request.onsuccess = () => resolve();
      })
  );
}

export async function saveRoomPhoto(file: File): Promise<void> {
  await idbSet(ROOM_KEY, file);
}

export async function loadRoomPhoto(): Promise<File | null> {
  const blob = await idbGet<Blob>(ROOM_KEY);
  if (!blob) return null;

  const type = blob.type || 'image/jpeg';
  return new File([blob], 'saved-room.jpg', { type, lastModified: Date.now() });
}

export async function hasSavedRoom(): Promise<boolean> {
  const blob = await idbGet<Blob>(ROOM_KEY);
  return Boolean(blob && blob.size > 0);
}

export async function clearSavedRoom(): Promise<void> {
  await idbDelete(ROOM_KEY);
}
