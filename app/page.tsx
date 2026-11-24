import Link from "next/link";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import { supabase } from "@/lib/supabase";
import { CARD_SELECT } from "@/lib/catalog";
import { WHATSAPP_NUMBER } from "@/lib/config";

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
      .select(CARD_SELECT)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  const cats = catsRes.data ?? [];
  const latest = latestRes.data ?? [];
  // Lookbook hero: the newest products that have a photo.
  const looks = latest.filter((p: any) => p.main_image_url).slice(0, 3);

  return (
    <>
      <Header cats={cats.map((c: any) => ({ id: c.id, name: c.name }))} active="all" />
      <main>
        <section className={`hero container ${looks.length ? "" : "hero-text"}`}>
          <div className="hero-copy">
            <h1>کۆلێکشنی نوێ</h1>
            <p>
              بە ڕەنگ و قەبارەی جیاواز. ڕەنگ و قەبارەکەت هەڵبژێرە و ڕاستەوخۆ لە ڕێگەی واتسئاپ داوای بکە.
            </p>
            {latest.length > 0 ? (
              <a href="#new" className="btn-ink">
                بینینی نوێترینەکان
              </a>
            ) : null}
          </div>

          {looks.length > 0 ? (
            <div className={`looks looks-${looks.length}`}>
              {looks.map((p: any, i: number) => (
                <Link key={p.id} href={`/p/${p.id}`} className="look" aria-label={p.name}>
                  <img src={p.main_image_url} alt="" loading={i === 0 ? "eager" : "lazy"} />
                </Link>
              ))}
            </div>
          ) : null}
        </section>

        {cats.length > 0 ? (
          <section className="container section">
            <div className="section-head">
              <h2>بەشەکان</h2>
            </div>
            <div className="cat-grid">
              {cats.map((c: any) => {
                const subs = (c.subcategories ?? [])
                  .slice()
                  .sort((a: any, b: any) => a.sort_order - b.sort_order)
                  .slice(0, 3)
                  .map((s: any) => s.name);
                return (
                  <Link key={c.id} href={`/c/${c.id}`} className="cat-tile">
                    {c.image_url ? <img src={c.image_url} alt="" loading="lazy" /> : null}
                    <div className="cat-tile-txt">
                      <h3>{c.name}</h3>
                      {subs.length ? <small>{subs.join("، ")}</small> : null}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="container section" id="new">
          <div className="section-head">
            <h2>نوێترین کاڵاکان</h2>
            {latest.length > 0 ? <span>{latest.length} کاڵا</span> : null}
          </div>
          {latest.length === 0 ? (
            <div className="empty">کاڵاکان بەم زووانە لێرە دادەنرێن.</div>
          ) : (
            <div className="grid">
              {latest.map((p: any, i: number) => (
                <ProductCard key={p.id} {...p} priority={i < 2} />
              ))}
            </div>
          )}
        </section>
      </main>
      <footer className="footer">
        <div className="container footer-in">
          <span className="logo logo-sm" dir="ltr">ERAM STORE</span>
          <a href={`https://wa.me/${WHATSAPP_NUMBER}`} className="link" target="_blank" rel="noopener noreferrer">
            پەیوەندی لە ڕێگەی واتسئاپ
          </a>
        </div>
      </footer>
    </>
  );
}
