export function formatPrice(n: number | string | null | undefined): string {
  const v = Number(n ?? 0);
  return `${v.toLocaleString("en-US", { maximumFractionDigits: 0 })} د.ع`;
}

const KU_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** Western digits -> Kurdish/Arabic-Indic digits (display only). */
export function toKuDigits(s: string | number): string {
  return String(s).replace(/[0-9]/g, (d) => KU_DIGITS[Number(d)]);
}

/** Price for display on the storefront, e.g. "٤٥,٠٠٠ د.ع". WhatsApp messages keep formatPrice. */
export function formatPriceKu(n: number | string | null | undefined): string {
  return toKuDigits(formatPrice(n));
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
