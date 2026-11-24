// Colour list for the admin product form: built-in clothing colours + the admin's own
// colours (table public.custom_colors), with Kurdish/English search.

export type ColorOption = { id?: string; name: string; hex: string; aliases?: string[]; custom?: boolean };

/** 30 common clothing colours (Kurdish name, hex, search aliases). */
export const PRESET_COLORS: ColorOption[] = [
  { name: "ڕەش", hex: "#111111", aliases: ["black", "رەش", "رش"] },
  { name: "سپی", hex: "#FFFFFF", aliases: ["white", "اسپی"] },
  { name: "شیری", hex: "#FAF6EC", aliases: ["off white", "ivory", "milky", "سپیی شیری"] },
  { name: "کرێم", hex: "#F3E5C8", aliases: ["cream", "کریم", "کرێمی"] },
  { name: "بێج", hex: "#D8C3A0", aliases: ["beige", "بیج", "بێژ"] },
  { name: "خاکی", hex: "#BDAE83", aliases: ["khaki", "sand", "خۆڵی"] },
  { name: "حوشتری", hex: "#C19A6B", aliases: ["camel", "کامێل"] },
  { name: "قاوەیی", hex: "#7C4A2D", aliases: ["brown", "قهوەیی", "قاوەیی"] },
  { name: "کاکاوی", hex: "#5A3825", aliases: ["cocoa", "chocolate", "شوکولاتەیی", "شۆکۆلاتی"] },
  { name: "خۆڵەمێشیی کاڵ", hex: "#D1D5DB", aliases: ["light gray", "light grey", "ڕەساسی کاڵ", "رەساسی کاڵ"] },
  { name: "خۆڵەمێشی", hex: "#9CA3AF", aliases: ["gray", "grey", "ڕەساسی", "رەساسی", "رساسی"] },
  { name: "خۆڵەمێشیی تۆخ", hex: "#4B5563", aliases: ["charcoal", "dark gray", "dark grey", "ڕەساسی تۆخ", "فەحمی"] },
  { name: "سوور", hex: "#D62828", aliases: ["red", "احمر"] },
  { name: "شەرابی", hex: "#7A1F2B", aliases: ["burgundy", "wine", "maroon", "مارۆنی", "عەنابی"] },
  { name: "پەمەیی", hex: "#EC6FA9", aliases: ["pink", "پەمبەیی", "وەردی"] },
  { name: "پەمەیی کاڵ", hex: "#F8C8D6", aliases: ["light pink", "baby pink", "powder pink"] },
  { name: "نارنجی", hex: "#F97316", aliases: ["orange", "پرتەقاڵی"] },
  { name: "زەرد", hex: "#FACC15", aliases: ["yellow", "اصفر"] },
  { name: "خەردەلی", hex: "#C9A227", aliases: ["mustard", "خەردەل"] },
  { name: "سەوز", hex: "#16A34A", aliases: ["green", "اخضر"] },
  { name: "زەیتوونی", hex: "#6B7A3A", aliases: ["olive", "زەیتونی", "زیتونی"] },
  { name: "سەوزی تۆخ", hex: "#065F46", aliases: ["dark green", "emerald", "زمروودی", "زمرودی"] },
  { name: "نەعنایی", hex: "#A7E8C8", aliases: ["mint", "سەوزی کاڵ", "light green"] },
  { name: "شین", hex: "#1D4ED8", aliases: ["blue", "ازرق"] },
  { name: "شینی ئاسمانی", hex: "#7CC4F0", aliases: ["sky blue", "light blue", "baby blue", "ئاسمانی"] },
  { name: "نیلی", hex: "#1E2F55", aliases: ["navy", "navy blue", "شینی تۆخ", "کحلی"] },
  { name: "جینزی", hex: "#3B5B85", aliases: ["denim", "jeans", "جینز"] },
  { name: "فیرۆزەیی", hex: "#14B8A6", aliases: ["turquoise", "teal", "فیروزەیی"] },
  { name: "مۆر", hex: "#7C3AED", aliases: ["purple", "violet", "بنەوشەیی", "مور"] },
  { name: "لیلەکی", hex: "#C4B5FD", aliases: ["lilac", "lavender", "لاڤەندەر"] },
];

/**
 * Loose key for comparing Kurdish/Arabic/English text: case-insensitive, trims, collapses
 * spaces and treats common spelling variants as equal (ڕ/ر, ێ/ی, ۆ/و, ڵ/ل, ە/ه, ك/ک, ي/ی…).
 */
export function colorKey(s: string): string {
  return (s ?? "")
    .normalize("NFC")
    .toLocaleLowerCase()
    .replace(/[‌‍ـً-ٟ]/g, "")
    .replace(/[ڕ]/g, "ر")
    .replace(/[ێيى]/g, "ی")
    .replace(/[ۆ]/g, "و")
    .replace(/[ڵ]/g, "ل")
    .replace(/[ەةھ]/g, "ه")
    .replace(/[ك]/g, "ک")
    .replace(/[أإآ]/g, "ا")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchesColor(c: ColorOption, query: string): boolean {
  const q = colorKey(query);
  if (!q) return true;
  if (q.startsWith("#")) return c.hex.toLowerCase().startsWith(q);
  return [c.name, ...(c.aliases ?? [])].some((n) => colorKey(n).includes(q));
}

export function sameHex(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

// Last known custom colours, so the list is complete instantly (and offline).
const CACHE = "admin-custom-colors-v1";
export function readColorCache(): ColorOption[] {
  try {
    return JSON.parse(localStorage.getItem(CACHE) || "[]");
  } catch {
    return [];
  }
}
export function writeColorCache(list: ColorOption[]) {
  try {
    localStorage.setItem(CACHE, JSON.stringify(list));
  } catch {}
}
