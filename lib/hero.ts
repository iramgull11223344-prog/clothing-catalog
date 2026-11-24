// Editable texts (and optional photo) of the home page banner, stored in
// public.site_settings under key "hero". Empty fields fall back to these defaults.

export const HERO_KEY = "hero";

export type HeroSettings = {
  eyebrow: string;
  title: string;
  lead: string;
  btn1: string;
  btn2: string;
  image_url: string | null;
};

export const HERO_DEFAULTS: HeroSettings = {
  eyebrow: "مۆدێرنی پێویست",
  title: "کۆمەڵەی جلوبەرگی شەقامی بێوەخت",
  lead: "ئەو جلە بنەڕەتییانەی لەگەڵ شێوازی مۆدێرن، بۆ ژیانی ڕۆژانە.",
  btn1: "کڕینی کۆمەڵەکە",
  btn2: "گەڕان بەدوای دیمەنەکان",
  image_url: null,
};

export const HERO_LIMITS: Record<Exclude<keyof HeroSettings, "image_url">, number> = {
  eyebrow: 40,
  title: 90,
  lead: 220,
  btn1: 30,
  btn2: 30,
};

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Stored value → what the home page shows (empty field = default text). */
export function mergeHero(value: unknown): HeroSettings {
  const v = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return {
    eyebrow: text(v.eyebrow) || HERO_DEFAULTS.eyebrow,
    title: text(v.title) || HERO_DEFAULTS.title,
    lead: text(v.lead) || HERO_DEFAULTS.lead,
    btn1: text(v.btn1) || HERO_DEFAULTS.btn1,
    btn2: text(v.btn2) || HERO_DEFAULTS.btn2,
    image_url: text(v.image_url) || null,
  };
}
