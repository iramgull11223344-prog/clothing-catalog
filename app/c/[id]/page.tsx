import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import { supabase } from "@/lib/supabase";
import { CARD_SELECT, getNavCats } from "@/lib/catalog";

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

  const [{ data: cat }, navCats] = await Promise.all([
    supabase.from("categories").select("id,name,subcategories(id,name,sort_order)").eq("id", id).maybeSingle(),
    getNavCats(),
  ]);
  if (!cat) notFound();

  const subs = [...(cat.subcategories ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order);
  const activeSub = subs.find((s: any) => s.id === sub)?.id;
  const subIds = activeSub ? [activeSub] : subs.map((s: any) => s.id);

  let products: any[] = [];
  if (subIds.length) {
    const { data } = await supabase
      .from("products")
      .select(CARD_SELECT)
      .in("subcategory_id", subIds)
      .eq("is_active", true)
      .order("sort_order")
      .order("created_at", { ascending: false });
    products = data ?? [];
  }

  return (
    <>
      <Header back="/" cats={navCats} active={cat.id} />
      <main className="container">
        <div className="page-head">
          <h1>{cat.name}</h1>
          <span>{products.length} کاڵا</span>
        </div>

        {subs.length > 0 ? (
          <nav className="subtabs" aria-label="بەشە لاوەکییەکان">
            <Link href={`/c/${cat.id}`} className={`subtab ${!activeSub ? "on" : ""}`}>
              هەموو
            </Link>
            {subs.map((s: any) => (
              <Link
                key={s.id}
                href={`/c/${cat.id}?sub=${s.id}`}
                className={`subtab ${activeSub === s.id ? "on" : ""}`}
              >
                {s.name}
              </Link>
            ))}
          </nav>
        ) : null}

        {products.length === 0 ? (
          <div className="empty">
            هێشتا کاڵا لەم بەشەدا نییە.{" "}
            <Link href="/" className="link">
              گەڕانەوە بۆ سەرەتا
            </Link>
          </div>
        ) : (
          <div className="grid page-grid">
            {products.map((p, i) => (
              <ProductCard key={p.id} {...p} priority={i < 2} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
