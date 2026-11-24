// Helpers shared by the admin product form, the product editor and the product list.
import { supabase } from "@/lib/supabase";
import { uid } from "@/lib/image";
import { nameKey } from "@/lib/catalog";
import { colorKey } from "@/lib/colors";
import { rank, type ColorRow } from "@/components/admin/ColorCard";

export type DbVariant = {
  id?: string;
  color_name: string | null;
  color_hex: string | null;
  size: string | null;
  image_url: string | null;
  is_available: boolean;
  sort_order: number;
};

export type AdminProduct = {
  id: string;
  name: string;
  price: number | string;
  description?: string | null;
  main_image_url: string | null;
  is_active: boolean;
  subcategory_id: string;
  created_at?: string;
  subcategories?: { id?: string; name: string; category_id?: string; categories?: { name: string } | null } | null;
  product_variants?: DbVariant[];
};

export const ADMIN_PRODUCT_SELECT =
  "id,name,price,description,main_image_url,is_active,subcategory_id,created_at,subcategories(id,name,category_id,categories(name)),product_variants(id,color_name,color_hex,size,image_url,is_available,sort_order)";

export async function loadAdminProducts(): Promise<AdminProduct[] | null> {
  const { data, error } = await supabase.from("products").select(ADMIN_PRODUCT_SELECT).order("created_at", { ascending: true });
  return error ? null : ((data as any) ?? []);
}

/** Same product name in the same sub-category (case/space-insensitive). */
export const productKey = (subId: string, name: string) => `${subId}|${nameKey(name)}`;

/** One "colour" = variants sharing name + hex. */
const colorGroupKey = (name: string | null, hex: string | null) => `${colorKey(name ?? "")}|${(hex ?? "").toLowerCase()}`;
export const comboKey = (name: string | null, hex: string | null, size: string | null) =>
  `${colorGroupKey(name, hex)}|${(size ?? "").trim().toLowerCase()}`;

/** Database variants → colour cards for the editor (in their saved order). */
export function variantsToColors(variants: DbVariant[]): ColorRow[] {
  const sorted = [...variants].sort((a, b) => a.sort_order - b.sort_order);
  const map = new Map<string, ColorRow>();
  for (const v of sorted) {
    const k = colorGroupKey(v.color_name, v.color_hex);
    let c = map.get(k);
    if (!c) {
      c = {
        id: uid(),
        name: v.color_name ?? "",
        hex: v.color_hex ?? "#111111",
        file: null,
        preview: v.image_url,
        imageUrl: v.image_url,
        sizes: [],
        unavailable: [],
        custom: "",
      };
      map.set(k, c);
    }
    if (!c.imageUrl && v.image_url) c.imageUrl = c.preview = v.image_url;
    if (v.size && !c.sizes.includes(v.size)) {
      c.sizes.push(v.size);
      if (!v.is_available) c.unavailable!.push(v.size);
    }
  }
  const out = Array.from(map.values());
  out.forEach((c) => c.sizes.sort((a, b) => rank(a) - rank(b)));
  return out;
}

/** Colour cards → variant rows (one per size, or one without size). */
export function colorsToRows(
  colors: ColorRow[],
  productId: string,
  imageFor: (c: ColorRow, index: number) => string | null,
  firstOrder = 0
) {
  return colors.flatMap((c, ci) =>
    (c.sizes.length ? c.sizes : [null]).map((s, si) => ({
      product_id: productId,
      color_name: c.name.trim() || null,
      color_hex: c.hex,
      size: s,
      image_url: imageFor(c, ci),
      is_available: s ? !(c.unavailable ?? []).includes(s) : true,
      sort_order: firstOrder + ci * 100 + si,
    }))
  );
}

/** A colour card counts when it has a name, a photo or sizes. */
export const isUsedColor = (c: ColorRow) => !!(c.name.trim() || c.file || c.imageUrl || c.sizes.length);
