import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FilterView from "@/components/FilterView";
import { supabase } from "@/lib/supabase";
import { CARD_SELECT, getNavCats } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ cat?: string; sub?: string }> }) {
  const { cat, sub } = await searchParams;
  // Everything is loaded once; switching tabs is filtered in the browser.
  const [cats, res] = await Promise.all([
    getNavCats(),
    supabase.from("products").select(CARD_SELECT).eq("is_active", true).order("created_at", { ascending: false }).limit(500),
  ]);

  return (
    <>
      <Header active="shop" />
      <main className="container page">
        <FilterView products={res.data ?? []} cats={cats} basePath="/shop" initialCat={cat} initialSub={sub} eyebrow="دوکان" />
      </main>
      <Footer />
    </>
  );
}
