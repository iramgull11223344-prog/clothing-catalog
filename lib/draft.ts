// Auto-saved draft of the "new product" form.
// Text fields -> localStorage. Photos (too big for localStorage) -> IndexedDB.
// Needed because phones often reload the page when the camera app opens.

const KEY = "new-product-draft-v1";
const DB_NAME = "catalog-draft";
const STORE = "files";

// `custom` = the unsaved text in the "قەبارەی تر" input (optional for older drafts).
export type DraftColor = { id: string; name: string; hex: string; sizes: string[]; custom?: string };
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

/** Clears the new-product draft (text + its photos). Other admin drafts are kept. */
export async function clearDraft() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  const keys = ((await run("readonly", (s) => s.getAllKeys())) ?? []) as IDBValidKey[];
  for (const k of keys) {
    const key = String(k);
    if (key === "main" || key.startsWith("color:")) await putFile(key, null);
  }
}

// ---- Scroll position per admin tab (sessionStorage: per browser tab, survives reloads,
// e.g. the camera-triggered reload on phones).
const SCROLL_KEY = "admin-scroll-v2";
export const ADMIN_TAB_KEY = "admin-tab-v1";

function scrollMap(): Record<string, number> {
  try {
    return JSON.parse(sessionStorage.getItem(SCROLL_KEY) || "{}");
  } catch {
    return {};
  }
}

function currentTab(): string {
  try {
    return sessionStorage.getItem(ADMIN_TAB_KEY) || "new";
  } catch {
    return "new";
  }
}

export function saveScroll(y: number = window.scrollY, tab: string = currentTab()) {
  try {
    const m = scrollMap();
    m[tab] = Math.round(y);
    sessionStorage.setItem(SCROLL_KEY, JSON.stringify(m));
  } catch {
    /* ignore */
  }
}

export function loadScroll(tab: string = currentTab()): number | null {
  const n = scrollMap()[tab];
  return typeof n === "number" && n > 0 ? n : null;
}

export function clearScroll(tab: string = currentTab()) {
  try {
    const m = scrollMap();
    delete m[tab];
    sessionStorage.setItem(SCROLL_KEY, JSON.stringify(m));
  } catch {
    /* ignore */
  }
}

// ---- Small text drafts for the other admin forms (localStorage).
const DRAFT_PREFIX = "admin-draft:";

export function readDraft<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(DRAFT_PREFIX + key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeDraft(key: string, value: unknown) {
  try {
    localStorage.setItem(DRAFT_PREFIX + key, JSON.stringify(value));
  } catch {
    /* storage full or blocked */
  }
}

export function removeDraft(key: string) {
  try {
    localStorage.removeItem(DRAFT_PREFIX + key);
  } catch {
    /* ignore */
  }
}
