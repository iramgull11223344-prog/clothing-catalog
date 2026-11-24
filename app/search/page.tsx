import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { supabase } from "@/lib/supabase";
import { CARD_SELECT } from "@/lib/catalog";
import { toKuDigits } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q: raw } = await searchParams;
  const q = (raw ?? "").trim().slice(0, 60);
  // Drop characters that have meaning in ILIKE / PostgREST filters.
  const term = q.replace(/[%_,()*\\]/g, " ").trim();

  let products: any[] = [];
  if (term) {
    const { data } = await supabase
      .from("products")
      .select(CARD_SELECT)
      .eq("is_active", true)
      .ilike("name", `%${term}%`)
      .order("created_at", { ascending: false })
      .limit(48);
    products = data ?? [];
  }

  return (
    <>
      <Header />
      <main className="container page">
        <div className="page-head">
          <h1>گەڕان</h1>
        </div>
        <form action="/search" method="get" role="search" className="search-big">
          <input type="search" name="q" defaultValue={q} placeholder="ناوی کاڵا بنووسە، بۆ نموونە هودی" aria-label="گەڕان بۆ کاڵا" enterKeyHint="search" autoFocus={!q} />
          <button type="submit" className="btn-solid">
            گەڕان
          </button>
        </form>

        {!q ? null : products.length === 0 ? (
          <div className="empty">
            هیچ کاڵایەک بە ناوی «{q}» نەدۆزرایەوە. وشەیەکی تر تاقی بکەرەوە یان{" "}
            <Link href="/shop" className="link">
              هەموو کاڵاکان ببینە
            </Link>
            .
          </div>
        ) : (
          <>
            <p className="count count-block">
              {toKuDigits(products.length)} ئەنجام بۆ «{q}»
            </p>
            <div className="grid">
              {products.map((p, i) => (
                <ProductCard key={p.id} {...p} priority={i < 2} />
              ))}
            </div>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
