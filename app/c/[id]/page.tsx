import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import { supabase } from "@/lib/supabase";

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
      .select("id,name,price,main_image_url,product_variants(color_hex)")
      .in("subcategory_id", subIds)
      .eq("is_active", true)
      .order("sort_order")
      .order("created_at", { ascending: false });
    products = data ?? [];
  }

  return (
    <>
      <Header back="/" />
      <main className="container">
        <section className="hero">
          <h1>{cat.name}</h1>
        </section>

        {subs.length > 0 ? (
          <div className="chips">
            <Link href={`/c/${cat.id}`} className={`chip ${!activeSub ? "active" : ""}`}>
              هەموو
            </Link>
            {subs.map((s: any) => (
              <Link
                key={s.id}
                href={`/c/${cat.id}?sub=${s.id}`}
                className={`chip ${activeSub === s.id ? "active" : ""}`}
              >
                {s.name}
              </Link>
            ))}
          </div>
        ) : null}

        {products.length === 0 ? (
          <div className="empty">هێشتا کاڵا لەم بەشەدا نییە</div>
        ) : (
          <div className="grid" style={{ paddingBottom: 48 }}>
            {products.map((p) => (
              <ProductCard key={p.id} {...p} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
