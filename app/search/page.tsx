import Link from "next/link";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import { supabase } from "@/lib/supabase";
import { CARD_SELECT, getNavCats } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q: raw } = await searchParams;
  const q = (raw ?? "").trim().slice(0, 60);
  // Drop characters that have meaning in ILIKE / PostgREST filters.
  const term = q.replace(/[%_,()*\\]/g, " ").trim();

  const [navCats, res] = await Promise.all([
    getNavCats(),
    term
      ? supabase
          .from("products")
          .select(CARD_SELECT)
          .eq("is_active", true)
          .ilike("name", `%${term}%`)
          .order("created_at", { ascending: false })
          .limit(48)
      : Promise.resolve({ data: [] as any[] }),
  ]);
  const products: any[] = res.data ?? [];

  return (
    <>
      <Header back="/" cats={navCats} q={q} />
      <main className="container">
        <div className="page-head">
          <h1>{q ? <>گەڕان بۆ «{q}»</> : "گەڕان"}</h1>
          {q ? <span>{products.length} ئەنجام</span> : null}
        </div>

        {!q ? (
          <div className="empty">ناوی کاڵایەک لە خانەی گەڕاندا بنووسە.</div>
        ) : products.length === 0 ? (
          <div className="empty">
            هیچ کاڵایەک بەم ناوە نەدۆزرایەوە. وشەیەکی تر تاقی بکەرەوە یان{" "}
            <Link href="/" className="link">
              هەموو کاڵاکان ببینە
            </Link>
            .
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
