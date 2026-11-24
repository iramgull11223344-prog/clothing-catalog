import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { supabase } from "@/lib/supabase";
import { CARD_SELECT } from "@/lib/catalog";
import { toKuDigits } from "@/lib/format";

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
      <Header active="shop" />
      <main className="container page">
        <div className="page-head">
          <p className="eyebrow">
            <Link href="/shop">دوکان</Link>
          </p>
          <h1>{cat.name}</h1>
          <span className="count">{toKuDigits(products.length)} کاڵا</span>
        </div>

        {subs.length > 0 ? (
          <nav className="tabs-line" aria-label="بەشە لاوەکییەکان">
            <Link href={`/c/${cat.id}`} scroll={false} className={!activeSub ? "on" : ""}>
              هەموو
            </Link>
            {subs.map((s: any) => (
              <Link key={s.id} href={`/c/${cat.id}?sub=${s.id}`} scroll={false} className={activeSub === s.id ? "on" : ""}>
                {s.name}
              </Link>
            ))}
          </nav>
        ) : null}

        {products.length === 0 ? (
          <div className="empty">
            هێشتا کاڵا لەم بەشەدا نییە.{" "}
            <Link href="/shop" className="link">
              هەموو کاڵاکان ببینە
            </Link>
          </div>
        ) : (
          <div className="grid">
            {products.map((p, i) => (
              <ProductCard key={p.id} {...p} priority={i < 2} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
