// Auto-saved draft of the "new product" form.
// Text fields -> localStorage. Photos (too big for localStorage) -> IndexedDB.
// Needed because phones often reload the page when the camera app opens.

const KEY = "new-product-draft-v1";
const DB_NAME = "catalog-draft";
const STORE = "files";

export type DraftColor = { id: string; name: string; hex: string; sizes: string[] };
export type Draft = {
  catId: string;
  subId: string;
  name: string;
  desc: string;
  price: string;
  colors: DraftColor[];
};

export function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

export function saveDraft(d: Draft) {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    /* storage full or blocked */
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  try {
    const db = await openDb();
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => {
        db.close();
        resolve(req.result);
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    return undefined;
  }
}

/** Save a photo under `key`; pass null to delete it. */
export async function putFile(key: string, file: Blob | null) {
  if (file) await run("readwrite", (s) => s.put(file, key));
  else await run("readwrite", (s) => s.delete(key));
}

export async function getFile(key: string): Promise<File | null> {
  const blob = (await run("readonly", (s) => s.get(key))) as Blob | undefined;
  if (!blob) return null;
  return blob instanceof File ? blob : new File([blob], "photo.jpg", { type: blob.type || "image/jpeg" });
}

export async function clearDraft() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  await run("readwrite", (s) => s.clear());
}
