// Lets the admin tabs tell each other that categories changed, so every list stays fresh
// (admin tabs stay mounted, so they would otherwise keep a stale list).
export const CATALOG_CHANGED = "admin-catalog-changed";

export function notifyCatalogChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CATALOG_CHANGED));
}

export function onCatalogChanged(fn: () => void) {
  window.addEventListener(CATALOG_CHANGED, fn);
  // Also refresh when coming back to the page (another device may have changed things).
  const vis = () => document.visibilityState === "visible" && fn();
  document.addEventListener("visibilitychange", vis);
  return () => {
    window.removeEventListener(CATALOG_CHANGED, fn);
    document.removeEventListener("visibilitychange", vis);
  };
}
