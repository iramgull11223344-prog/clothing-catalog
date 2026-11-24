import { supabase } from "@/lib/supabase";

export type NavCat = { id: string; name: string };

/** Active categories for the header pill tabs. */
export async function getNavCats(): Promise<NavCat[]> {
  const { data } = await supabase
    .from("categories")
    .select("id,name")
    .eq("is_active", true)
    .order("sort_order")
    .order("created_at");
  return (data as NavCat[] | null) ?? [];
}

export const CARD_SELECT = "id,name,price,main_image_url,subcategory_id,product_variants(color_hex,color_name),subcategories(category_id)";
