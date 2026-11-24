"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import ProductCard from "@/components/ProductCard";
import CategoryTabs from "@/components/CategoryTabs";
import { toKuDigits } from "@/lib/format";

type Tab = { id: string; name: string };

type Props = {
  /** All products for the page, loaded once on the server. */
  products: any[];
  tabs: Tab[];
  /** "cat" filters by category (/shop), "sub" by sub-category (/c/[id]). */
  by: "cat" | "sub";
  /** Path the URL is rewritten to, e.g. "/shop" or "/c/<id>". */
  basePath: string;
  initial?: string;
  eyebrow: ReactNode;
  /** Fixed title; when omitted the active tab's name is shown ("هەموو کاڵاکان" for all). */
  title?: string;
};

const keyOf = (p: any, by: "cat" | "sub") => (by === "cat" ? p.subcategories?.category_id : p.subcategory_id);

// Instant tab filtering: no navigation, no Supabase request — just React state.
export default function FilterView({ products, tabs, by, basePath, initial, eyebrow, title }: Props) {
  const [active, setActive] = useState(initial && tabs.some((t) => t.id === initial) ? initial : "all");

  const list = useMemo(
    () => (active === "all" ? products : products.filter((p) => keyOf(p, by) === active)),
    [active, products, by]
  );

  const select = useCallback(
    (id: string) => {
      setActive(id);
      // Keep the URL shareable without a server round-trip or scroll jump.
      const param = by === "cat" ? "cat" : "sub";
      window.history.replaceState(window.history.state, "", id === "all" ? basePath : `${basePath}?${param}=${id}`);
    },
    [basePath, by]
  );

  const activeName = tabs.find((t) => t.id === active)?.name;

  return (
    <>
      <div className="page-head">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title ?? activeName ?? "هەموو کاڵاکان"}</h1>
        <span className="count">{toKuDigits(list.length)} کاڵا</span>
      </div>

      {tabs.length > 0 ? <CategoryTabs tabs={tabs} active={active} onSelect={select} /> : null}

      {list.length === 0 ? (
        <div className="empty">
          {active === "all" ? (
            "کاڵاکان بەم زووانە لێرە دادەنرێن."
          ) : (
            <>
              هێشتا کاڵا لەم بەشەدا نییە.{" "}
              <button type="button" className="link link-btn" onClick={() => select("all")}>
                هەموو کاڵاکان ببینە
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid">
          {list.map((p, i) => (
            <ProductCard key={p.id} {...p} priority={i < 4} />
          ))}
        </div>
      )}

    </>
  );
}
