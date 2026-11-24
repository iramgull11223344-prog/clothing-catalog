import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FilterView from "@/components/FilterView";
import { supabase } from "@/lib/supabase";
import { CARD_SELECT } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sub?: string }>;
}) {
  const { id } = await params;
  const { sub } = await searchParams;

  const { data: cat } = await supabase
    .from("categories")
    .select("id,name,subcategories(id,name,sort_order)")
    .eq("id", id)
    .maybeSingle();
  if (!cat) notFound();

  const subs = [...(cat.subcategories ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order);

  // All products of the category, loaded once; sub-category tabs filter in the browser.
  let products: any[] = [];
  if (subs.length) {
    const { data } = await supabase
      .from("products")
      .select(CARD_SELECT)
      .in(
        "subcategory_id",
        subs.map((s: any) => s.id)
      )
      .eq("is_active", true)
      .order("sort_order")
      .order("created_at", { ascending: false });
    products = data ?? [];
  }

  return (
    <>
      <Header active="shop" />
      <main className="container page">
        <FilterView
          products={products}
          cats={[{ id: cat.id, name: cat.name, subs: subs.map((s: any) => ({ id: s.id, name: s.name })) }]}
          lockCat
          basePath={`/c/${cat.id}`}
          initialSub={sub}
          title={cat.name}
          eyebrow={<Link href="/shop">دوکان</Link>}
        />
      </main>
      <Footer />
    </>
  );
}
