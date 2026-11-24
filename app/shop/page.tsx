import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { supabase } from "@/lib/supabase";
import { CARD_SELECT, getNavCats } from "@/lib/catalog";
import { toKuDigits } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const [cats, res] = await Promise.all([
    getNavCats(),
    supabase.from("products").select(CARD_SELECT).eq("is_active", true).order("created_at", { ascending: false }).limit(200),
  ]);
  const products: any[] = res.data ?? [];

  return (
    <>
      <Header active="shop" />
      <main className="container page">
        <div className="page-head">
          <p className="eyebrow">دوکان</p>
          <h1>هەموو کاڵاکان</h1>
          <span className="count">{toKuDigits(products.length)} کاڵا</span>
        </div>

        {cats.length > 0 ? (
          <nav className="tabs-line" aria-label="بەشەکان">
            <Link href="/shop" className="on">
              هەموو
            </Link>
            {cats.map((c) => (
              <Link key={c.id} href={`/c/${c.id}`}>
                {c.name}
              </Link>
            ))}
          </nav>
        ) : null}

        {products.length === 0 ? (
          <div className="empty">کاڵاکان بەم زووانە لێرە دادەنرێن.</div>
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
