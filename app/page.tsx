import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { supabase } from "@/lib/supabase";
import { CARD_SELECT } from "@/lib/catalog";
import { COLLECTION_IMAGE, HERO_IMAGE } from "@/lib/config";

export const dynamic = "force-dynamic";

// Points left: "forward" in a right-to-left page.
function Arrow() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}

export default async function Home() {
  const [catsRes, latestRes, coversRes] = await Promise.all([
    supabase
      .from("categories")
      .select("id,name,image_url")
      .eq("is_active", true)
      .order("sort_order")
      .order("created_at")
      .limit(4),
    supabase
      .from("products")
      .select(CARD_SELECT)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(8),
    // Fallback cover per category: its newest product photo.
    supabase
      .from("products")
      .select("main_image_url,subcategories(category_id)")
      .eq("is_active", true)
      .not("main_image_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(60),
  ]);

  const latest: any[] = latestRes.data ?? [];
  const covers = new Map<string, string>();
  for (const p of (coversRes.data ?? []) as any[]) {
    const cid = p.subcategories?.category_id;
    if (cid && p.main_image_url && !covers.has(cid)) covers.set(cid, p.main_image_url);
  }
  const cats = ((catsRes.data ?? []) as any[]).map((c) => ({ ...c, cover: c.image_url || covers.get(c.id) || null }));

  const photos = latest.map((p) => p.main_image_url).filter(Boolean) as string[];
  const heroImg = HERO_IMAGE || photos[0] || cats.find((c) => c.cover)?.cover || null;
  const collectionImg = COLLECTION_IMAGE || photos.find((src) => src !== heroImg) || heroImg;

  return (
    <>
      <Header active="home" />
      <main>
        {/* Hero */}
        <section className="hero">
          <div className="container">
            <div className={`hero-panel ${heroImg ? "" : "no-img"}`} dir="ltr">
              <div className="hero-copy" dir="rtl">
                <p className="eyebrow">مۆدێرنی پێویست</p>
                <h1>کۆمەڵەی جلوبەرگی شەقامی بێوەخت</h1>
                <p className="hero-lead">ئەو جلە بنەڕەتییانەی لەگەڵ شێوازی مۆدێرن، بۆ ژیانی ڕۆژانە.</p>
                <div className="hero-btns">
                  <Link href="/shop" className="btn-solid">
                    کڕینی کۆمەڵەکە
                  </Link>
                  <a href="#new" className="btn-line">
                    گەڕان بەدوای دیمەنەکان
                  </a>
                </div>
              </div>
              {heroImg ? (
                <div className="hero-media">
                  <img src={heroImg} alt="" />
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {/* Categories */}
        {cats.length > 0 ? (
          <section className="sec">
            <div className="container">
              <div className="sec-head">
                <h2 className="sec-title-sm">بەشەکان</h2>
                <Link href="/shop" className="more">
                  هەموو کاڵاکان
                </Link>
              </div>
              <div className="cat-row">
                {cats.map((c) => (
                  <Link key={c.id} href={`/c/${c.id}`} className="cat">
                    <div className="cat-img">{c.cover ? <img src={c.cover} alt="" loading="lazy" /> : null}</div>
                    <div className="cat-name">
                      <span>{c.name}</span>
                      <Arrow />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* New arrivals */}
        <section className="sec" id="new">
          <div className="container">
            <div className="sec-head">
              <div>
                <p className="eyebrow">نوێترینەکان</p>
                <h2 className="sec-title">ستایلی نوێ، تازە لێرە</h2>
              </div>
              {latest.length > 0 ? (
                <Link href="/shop" className="more">
                  بینینی هەموو
                </Link>
              ) : null}
            </div>
            {latest.length === 0 ? (
              <div className="empty">کاڵا نوێیەکان بەم زووانە لێرە دادەنرێن.</div>
            ) : (
              <div className="grid">
                {latest.map((p, i) => (
                  <ProductCard key={p.id} {...p} priority={i < 2} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Our collection */}
        <section className="sec" id="collection">
          <div className="container">
            <div className={`coll ${collectionImg ? "" : "no-img"}`}>
              {collectionImg ? <img src={collectionImg} alt="" loading="lazy" /> : null}
              <div className="coll-copy" dir="ltr">
                <div dir="rtl">
                  <h2>کۆمەڵەی ئێمە</h2>
                  <p>بۆ جووڵانەوەی ڕۆژانەی هەموو ڕۆژێک</p>
                  <Link href="/shop" className="btn-light">
                    کۆمەڵەی تاقیکردنەوە
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
