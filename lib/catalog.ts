import { supabase } from "@/lib/supabase";

export type NavSub = { id: string; name: string };
export type NavCat = { id: string; name: string; subs: NavSub[] };

/**
 * Every active category with ALL its sub-categories — including ones that have no
 * products yet (they are never hidden). Categories switched off in /admin stay hidden.
 */
export async function getNavCats(): Promise<NavCat[]> {
  const { data } = await supabase
    .from("categories")
    .select("id,name,sort_order,created_at,subcategories(id,name,sort_order)")
    .eq("is_active", true)
    .order("sort_order")
    .order("created_at");
  return ((data as any[] | null) ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    subs: [...(c.subcategories ?? [])]
      .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((s: any) => ({ id: s.id, name: s.name })),
  }));
}

export const CARD_SELECT =
  "id,name,price,main_image_url,subcategory_id,product_variants(color_hex,color_name,price,image_url,sort_order),subcategories(category_id)";

/** Name key for comparing: trims, collapses spaces, Unicode-normalises and ignores case ("Polo " = "polo"). */
export function nameKey(name: string | null | undefined): string {
  return (name ?? "").normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export type MergedTab = { id: string; name: string; ids: string[] };

/**
 * One tab per distinct name: items whose names only differ in case or surrounding
 * spaces ("Polo", " polo") share a single tab that matches all of their ids.
 */
export function mergeTabs(items: { id: string; name: string }[]): MergedTab[] {
  const byKey = new Map<string, MergedTab>();
  for (const it of items) {
    const k = nameKey(it.name) || it.id;
    const hit = byKey.get(k);
    if (hit) hit.ids.push(it.id);
    else byKey.set(k, { id: it.id, name: (it.name ?? "").trim() || "—", ids: [it.id] });
  }
  return Array.from(byKey.values());
}
