import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductView from "@/components/ProductView";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ color?: string }>;
}) {
  const { id } = await params;
  const { color } = await searchParams;

  const { data: p } = await supabase
    .from("products")
    .select(
      "id,name,description,price,main_image_url,is_active,product_variants(*),subcategories(id,name,category_id,categories(id,name))"
    )
    .eq("id", id)
    .maybeSingle();
  if (!p || !p.is_active) notFound();

  const variants = [...(p.product_variants ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order);
  const sub: any = p.subcategories;
  const cat: any = sub?.categories;

  return (
    <>
      <Header active="shop" />
      <main className="container">
        <ProductView
          productId={p.id}
          name={p.name}
          description={p.description}
          price={p.price}
          mainImage={p.main_image_url}
          variants={variants}
          crumbs={[cat?.name, sub?.name].filter(Boolean).join(" / ")}
          initialColor={color}
        />
      </main>
      <Footer />
    </>
  );
}
