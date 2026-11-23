export function formatPrice(n: number | string | null | undefined): string {
  const v = Number(n ?? 0);
  return `${v.toLocaleString("en-US", { maximumFractionDigits: 0 })} د.ع`;
}

export function makeSlug(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]/gu, "")
    .slice(0, 40);
  return `${base || "item"}-${Math.random().toString(36).slice(2, 7)}`;
}
