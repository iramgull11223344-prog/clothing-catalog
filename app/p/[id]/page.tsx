import { notFound } from "next/navigation";
import Header from "@/components/Header";
import ProductView from "@/components/ProductView";
import { supabase } from "@/lib/supabase";
import { getNavCats } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [{ data: p }, navCats] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id,name,description,price,main_image_url,is_active,product_variants(*),subcategories(id,name,category_id,categories(id,name))"
      )
      .eq("id", id)
      .maybeSingle(),
    getNavCats(),
  ]);
  if (!p || !p.is_active) notFound();

  const variants = [...(p.product_variants ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order);
  const sub: any = p.subcategories;
  const cat: any = sub?.categories;

  return (
    <>
      <Header back={cat ? `/c/${cat.id}` : "/"} cats={navCats} active={cat?.id} />
      <main className="container">
        <ProductView
          name={p.name}
          description={p.description}
          price={p.price}
          mainImage={p.main_image_url}
          variants={variants}
          crumbs={[cat?.name, sub?.name].filter(Boolean).join(" / ")}
        />
      </main>
    </>
  );
}
