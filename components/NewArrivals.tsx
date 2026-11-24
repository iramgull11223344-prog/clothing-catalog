"use client";

import { useState } from "react";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import CategoryTabs from "@/components/CategoryTabs";

type Props = {
  products: any[];
  cats: { id: string; name: string }[];
};

// Category tabs that filter the new-arrivals grid in place.
export default function NewArrivals({ products, cats }: Props) {
  const [active, setActive] = useState("all");
  const usedCats = cats.filter((c) => products.some((p) => p.subcategories?.category_id === c.id));
  const list = (active === "all" ? products : products.filter((p) => p.subcategories?.category_id === active)).slice(0, 8);

  return (
    <>
      {usedCats.length > 0 ? <CategoryTabs tabs={usedCats} active={active} onSelect={setActive} /> : null}

      {list.length === 0 ? (
        <div className="empty">
          هێشتا کاڵای نوێ لەم بەشەدا نییە.{" "}
          <Link href={`/c/${active}`} className="link">
            هەموو کاڵاکانی ئەم بەشە ببینە
          </Link>
        </div>
      ) : (
        <div className="grid">
          {list.map((p, i) => (
            <ProductCard key={p.id} {...p} priority={i < 2} />
          ))}
        </div>
      )}
    </>
  );
}
