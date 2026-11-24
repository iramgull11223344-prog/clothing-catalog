"use client";

// Shopping bag kept in localStorage (survives reloads, synced across browser tabs).
import { useSyncExternalStore } from "react";

export type CartItem = {
  /** productId|colour|size — the same choice added twice just raises the quantity. */
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

let cache: CartItem[] | null = null;

function read(): CartItem[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as CartItem[]) : [];
    cache = Array.isArray(list) ? list.filter((i) => i && i.key && i.qty > 0) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(list: CartItem[]) {
  cache = list;
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {}
  window.dispatchEvent(new Event(EVT));
}

function subscribe(fn: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null; // another tab changed the bag
      fn();
    }
  };
  window.addEventListener(EVT, fn);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVT, fn);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCart(): CartItem[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export const itemKey = (productId: string, color: string, colorHex: string | null, size: string) =>
  `${productId}|${color}|${colorHex ?? ""}|${size}`;

export function addToCart(item: Omit<CartItem, "key" | "qty">, qty = 1) {
  const key = itemKey(item.productId, item.color, item.colorHex, item.size);
  const list = read();
  const hit = list.find((i) => i.key === key);
  write(
    hit
      ? list.map((i) => (i.key === key ? { ...i, ...item, qty: Math.min(MAX_QTY, i.qty + qty), unavailable: false } : i))
      : [...list, { ...item, key, qty }]
  );
  window.dispatchEvent(new CustomEvent("cart-added", { detail: { name: item.name } }));
}

export function setQty(key: string, qty: number) {
  write(read().map((i) => (i.key === key ? { ...i, qty: Math.max(1, Math.min(MAX_QTY, qty)) } : i)));
}

/** Removes an item and returns a function that puts it back in the same place. */
export function removeFromCart(key: string): () => void {
  const list = read();
  const index = list.findIndex((i) => i.key === key);
  const item = list[index];
  write(list.filter((i) => i.key !== key));
  return () => {
    if (!item) return;
    const now = read().filter((i) => i.key !== key);
    write([...now.slice(0, index), item, ...now.slice(index)]);
  };
}

export function clearCart() {
  write([]);
}

export function replaceCart(list: CartItem[]) {
  write(list);
}

export const cartCount = (list: CartItem[]) => list.filter((i) => !i.unavailable).reduce((n, i) => n + i.qty, 0);
export const cartTotal = (list: CartItem[]) => list.filter((i) => !i.unavailable).reduce((n, i) => n + i.qty * i.price, 0);

export function openCart() {
  window.dispatchEvent(new Event("cart-open"));
}
