import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { supabase } from "@/lib/supabase";
import { CARD_SELECT, getNavCats } from "@/lib/catalog";
import { toKuDigits } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const { cat } = await searchParams;
  const cats = await getNavCats();
  const activeCat = cats.find((c) => c.id === cat)?.id;

  let products: any[] = [];
  let query = supabase.from("products").select(CARD_SELECT).eq("is_active", true);
  if (activeCat) {
    const { data: subs } = await supabase.from("subcategories").select("id").eq("category_id", activeCat);
    const ids = (subs ?? []).map((s: any) => s.id);
    if (ids.length) {
      const { data } = await query.in("subcategory_id", ids).order("created_at", { ascending: false }).limit(200);
      products = data ?? [];
    }
  } else {
    const { data } = await query.order("created_at", { ascending: false }).limit(200);
    products = data ?? [];
  }
  const activeName = cats.find((c) => c.id === activeCat)?.name;

  return (
    <>
      <Header active="shop" />
      <main className="container page">
        <div className="page-head">
          <p className="eyebrow">دوکان</p>
          <h1>{activeName ?? "هەموو کاڵاکان"}</h1>
          <span className="count">{toKuDigits(products.length)} کاڵا</span>
        </div>

        {cats.length > 0 ? (
          <nav className="tabs-line" aria-label="بەشەکان">
            <Link href="/shop" scroll={false} className={!activeCat ? "on" : ""} aria-current={!activeCat ? "page" : undefined}>
              هەموو
            </Link>
            {cats.map((c) => (
              <Link
                key={c.id}
                href={`/shop?cat=${c.id}`}
                scroll={false}
                className={activeCat === c.id ? "on" : ""}
                aria-current={activeCat === c.id ? "page" : undefined}
              >
                {c.name}
              </Link>
            ))}
          </nav>
        ) : null}

        {products.length === 0 ? (
          <div className="empty">
            {activeCat ? (
              <>
                هێشتا کاڵا لەم بەشەدا نییە.{" "}
                <Link href="/shop" className="link">
                  هەموو کاڵاکان ببینە
                </Link>
              </>
            ) : (
              "کاڵاکان بەم زووانە لێرە دادەنرێن."
            )}
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
