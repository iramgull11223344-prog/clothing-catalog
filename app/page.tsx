import Link from "next/link";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import { supabase } from "@/lib/supabase";
import { STORE_NAME, STORE_TAGLINE } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [catsRes, latestRes] = await Promise.all([
    supabase
      .from("categories")
      .select("id,name,image_url,sort_order,subcategories(id,name,sort_order)")
      .eq("is_active", true)
      .order("sort_order")
      .order("created_at"),
    supabase
      .from("products")
      .select("id,name,price,main_image_url,product_variants(color_hex)")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const cats = catsRes.data ?? [];
  const latest = latestRes.data ?? [];

  return (
    <>
      <Header />
      <main className="container">
        <section className="hero">
          <h1>{STORE_NAME}</h1>
          <p>{STORE_TAGLINE}</p>
        </section>

        <div className="section-title">
          <h2>بەشەکان</h2>
        </div>
        {cats.length === 0 ? (
          <div className="empty">هێشتا هیچ بەشێک زیاد نەکراوە</div>
        ) : (
          <div className="cat-grid">
            {cats.map((c: any) => (
              <Link key={c.id} href={`/c/${c.id}`} className="cat-card">
                {c.image_url ? <img src={c.image_url} alt={c.name} loading="lazy" /> : null}
                <div className="txt">
                  <h3>{c.name}</h3>
                  {c.subcategories?.length ? (
                    <small>
                      {c.subcategories
                        .slice()
                        .sort((a: any, b: any) => a.sort_order - b.sort_order)
                        .slice(0, 3)
                        .map((s: any) => s.name)
                        .join(" · ")}
                    </small>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        )}

        {latest.length > 0 ? (
          <>
            <div className="section-title">
              <h2>نوێترین کاڵاکان</h2>
            </div>
            <div className="grid" style={{ paddingBottom: 48 }}>
              {latest.map((p: any) => (
                <ProductCard key={p.id} {...p} />
              ))}
            </div>
          </>
        ) : null}
      </main>
    </>
  );
}
