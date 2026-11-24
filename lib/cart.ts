"use client";

// Shopping bag kept in localStorage. localStorage is the ONLY source of truth: every
// change re-reads it first (never an in-memory copy), so a page restored from the
// back/forward cache, a second tab, or a slow price refresh can never overwrite items
// that were added elsewhere.
import { useSyncExternalStore } from "react";

export type CartItem = {
  /** productId|colour|hex|size — the same choice added twice just raises the quantity. */
  key: string;
  productId: string;
  name: string;
  color: string;
  colorHex: string | null;
  size: string;
  /** Unit price (refreshed from the database when the bag opens). */
  price: number;
  image: string | null;
  qty: number;
  /** Set when the product/colour/size is no longer offered. */
  unavailable?: boolean;
};

const KEY = "cart-v1";
const EVT = "cart-changed";
const MAX_QTY = 99;
const EMPTY: CartItem[] = [];

// Fallback only when localStorage is blocked (e.g. some private modes).
let memory: CartItem[] = EMPTY;
let storageOk = true;

// Snapshot cache keyed by the raw stored string (keeps React renders stable).
let lastRaw: string | null | undefined;
let lastList: CartItem[] = EMPTY;

function parse(raw: string | null): CartItem[] {
  if (!raw) return EMPTY;
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.filter((i) => i && typeof i.key === "string" && i.qty > 0) : EMPTY;
  } catch {
    return EMPTY;
  }
}

/** Current bag, always read from storage. */
function read(): CartItem[] {
  if (!storageOk) return memory;
  let raw: string | null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    storageOk = false;
    return memory;
  }
  if (raw !== lastRaw) {
    lastRaw = raw;
    lastList = parse(raw);
  }
  return lastList;
}

function write(list: CartItem[]) {
  if (storageOk) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch {
      storageOk = false;
    }
  }
  if (!storageOk) memory = list;
  window.dispatchEvent(new Event(EVT));
}

/** Read → change → write in one step, always from the freshest stored bag. */
function update(fn: (list: CartItem[]) => CartItem[]) {
  write(fn(read()));
}

function subscribe(fn: () => void) {
  const onStorage = (e: StorageEvent) => (e.key === KEY || e.key === null) && fn();
  // Coming back to a page (back/forward cache, tab switch) → re-read the bag.
  const onShow = () => fn();
  const onVisible = () => document.visibilityState === "visible" && fn();
  window.addEventListener(EVT, fn);
  window.addEventListener("storage", onStorage);
  window.addEventListener("pageshow", onShow);
  window.addEventListener("focus", onShow);
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    window.removeEventListener(EVT, fn);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("pageshow", onShow);
    window.removeEventListener("focus", onShow);
    document.removeEventListener("visibilitychange", onVisible);
  };
}

export function useCart(): CartItem[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

/** Bag as it is right now (for code outside React renders). */
export const getCart = () => read();

export const itemKey = (productId: string, color: string, colorHex: string | null, size: string) =>
  `${productId}|${color}|${colorHex ?? ""}|${size}`;

export function addToCart(item: Omit<CartItem, "key" | "qty">, qty = 1) {
  const key = itemKey(item.productId, item.color, item.colorHex, item.size);
  update((list) =>
    list.some((i) => i.key === key)
      ? list.map((i) => (i.key === key ? { ...i, ...item, qty: Math.min(MAX_QTY, i.qty + qty), unavailable: false } : i))
      : [...list, { ...item, key, qty }]
  );
  window.dispatchEvent(new CustomEvent("cart-added", { detail: { name: item.name } }));
}

export function setQty(key: string, qty: number) {
  update((list) => list.map((i) => (i.key === key ? { ...i, qty: Math.max(1, Math.min(MAX_QTY, qty)) } : i)));
}

/** Removes an item and returns a function that puts it back in the same place. */
export function removeFromCart(key: string): () => void {
  const before = read();
  const index = before.findIndex((i) => i.key === key);
  const item = before[index];
  update((list) => list.filter((i) => i.key !== key));
  return () => {
    if (!item) return;
    update((list) => {
      const rest = list.filter((i) => i.key !== key);
      return [...rest.slice(0, index), item, ...rest.slice(index)];
    });
  };
}

/**
 * Updates fields of existing items only (e.g. refreshed prices). Items added meanwhile
 * are kept; items removed meanwhile stay removed.
 */
export function patchCartItems(patches: Map<string, Partial<Pick<CartItem, "price" | "unavailable" | "name">>>) {
  if (!patches.size) return;
  update((list) => list.map((i) => (patches.has(i.key) ? { ...i, ...patches.get(i.key) } : i)));
}

/** Empties the bag (only after the order was handed to WhatsApp). */
export function clearCart() {
  write([]);
}

export const cartCount = (list: CartItem[]) => list.filter((i) => !i.unavailable).reduce((n, i) => n + i.qty, 0);
export const cartTotal = (list: CartItem[]) => list.filter((i) => !i.unavailable).reduce((n, i) => n + i.qty * i.price, 0);

export function openCart() {
  window.dispatchEvent(new Event("cart-open"));
}
