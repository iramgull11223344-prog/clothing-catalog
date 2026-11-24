// Per-variant prices: a variant's own price wins; otherwise the product's price is used.

export function toPrice(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function effectivePrice(variantPrice: unknown, productPrice: unknown): number {
  return toPrice(variantPrice) ?? toPrice(productPrice) ?? 0;
}

/** Admin input: "" (no own price) or a valid number. */
export function isValidPriceInput(s: string | undefined | null): boolean {
  const t = (s ?? "").trim();
  return t === "" || toPrice(t) !== null;
}
