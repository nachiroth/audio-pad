/**
 * Audio Storage Utility
 * Uses IndexedDB to store audio files locally for persistence across sessions
 */

const DB_NAME = "AudioPadStorage";
const DB_VERSION = 1;
const STORE_NAME = "audioFiles";

interface StoredAudio {
  id: string;
  name: string;
  file: Blob;
  timestamp: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("Failed to open IndexedDB:", request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

export async function saveAudioFile(
  id: string,
  name: string,
  file: Blob,
): Promise<string> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const storedAudio: StoredAudio = {
      id,
      name,
      file,
      timestamp: Date.now(),
    };

    await new Promise<void>((resolve, reject) => {
      const request = store.put(storedAudio);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Create and return a blob URL for immediate use
    const url = URL.createObjectURL(file);
    return url;
  } catch (error) {
    console.error("Failed to save audio file:", error);
    throw error;
  }
}

export async function getAudioFile(id: string): Promise<Blob | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    const result = await new Promise<StoredAudio | null>((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });

    return result?.file || null;
  } catch (error) {
    console.error("Failed to get audio file:", error);
    return null;
  }
}

export async function deleteAudioFile(id: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to delete audio file:", error);
    throw error;
  }
}

export async function createAudioObjectURL(id: string): Promise<string | null> {
  const blob = await getAudioFile(id);
  if (!blob) return null;
  return URL.createObjectURL(blob);
}

export async function revokeStoredAudioURL(url: string): Promise<void> {
  if (!url.startsWith("blob:")) {
    return;
  }
  URL.revokeObjectURL(url);
}

export async function clearAllAudioFiles(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to clear audio files:", error);
    throw error;
  }
}

export async function getAllStoredIds(): Promise<string[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
      const request = store.getAllKeys();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    return keys as string[];
  } catch (error) {
    console.error("Failed to get stored IDs:", error);
    return [];
  }
}
