"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import ProductCard from "@/components/ProductCard";
import CategoryTabs from "@/components/CategoryTabs";
import { toKuDigits } from "@/lib/format";
import { mergeTabs, type NavCat } from "@/lib/catalog";

type Props = {
  /** All products for the page, loaded once on the server. */
  products: any[];
  /** Categories with all their sub-categories (empty ones included). */
  cats: NavCat[];
  /** Path the URL is rewritten to ("/shop", "/c/<id>"); omit to leave the URL alone. */
  basePath?: string;
  initialCat?: string;
  initialSub?: string;
  /** Category page: the category is fixed, only the sub-category row is shown. */
  lockCat?: boolean;
  /** Page heading; omit on the home page. */
  eyebrow?: ReactNode;
  /** Fixed title; when omitted the selected tab's name is shown. */
  title?: string;
  /** Show at most this many products (home page). */
  limit?: number;
  emptyText?: string;
};

const catOf = (p: any): string | undefined => p.subcategories?.category_id;

/**
 * Instant two-level filtering (category -> sub-category) with React state only:
 * no navigation and no Supabase request on tab clicks.
 */
export default function FilterView({
  products,
  cats,
  basePath,
  initialCat,
  initialSub,
  lockCat,
  eyebrow,
  title,
  limit,
  emptyText = "کاڵاکان بەم زووانە لێرە دادەنرێن.",
}: Props) {
  const catTabs = useMemo(() => mergeTabs(cats), [cats]);
  // With a single category (or on a category page) its sub-categories are the useful tabs.
  const showCatRow = !lockCat && catTabs.length > 1;

  const findTab = <T extends { ids: string[]; id: string }>(tabs: T[], id?: string) =>
    id ? tabs.find((t) => t.id === id || t.ids.includes(id)) : undefined;

  const [cat, setCat] = useState(() => (showCatRow ? findTab(catTabs, initialCat)?.id : undefined) ?? "all");
  const selCat = showCatRow ? catTabs.find((t) => t.id === cat) : undefined;

  // Sub-categories offered for the current category choice (all subs when there is no category row).
  const subTabs = useMemo(() => {
    const pool = showCatRow ? (selCat ? cats.filter((c) => selCat.ids.includes(c.id)) : []) : cats;
    return mergeTabs(pool.flatMap((c) => c.subs));
  }, [cats, showCatRow, selCat]);

  const [sub, setSub] = useState(() => findTab(subTabs, initialSub)?.id ?? "all");
  const selSub = subTabs.find((t) => t.id === sub);

  const syncUrl = useCallback(
    (c: string, s: string) => {
      if (!basePath) return;
      const q = new URLSearchParams();
      if (c !== "all") q.set("cat", c);
      if (s !== "all") q.set("sub", s);
      const qs = q.toString();
      // Shareable URL without a server round-trip or scroll jump.
      window.history.replaceState(window.history.state, "", qs ? `${basePath}?${qs}` : basePath);
    },
    [basePath]
  );

  const pickCat = useCallback(
    (id: string) => {
      setCat(id);
      setSub("all");
      syncUrl(id, "all");
    },
    [syncUrl]
  );

  const pickSub = useCallback(
    (id: string) => {
      setSub(id);
      syncUrl(cat, id);
    },
    [syncUrl, cat]
  );

  const list = useMemo(() => {
    let out = products;
    if (selCat) out = out.filter((p) => selCat.ids.includes(catOf(p) ?? ""));
    if (selSub) out = out.filter((p) => selSub.ids.includes(p.subcategory_id));
    return limit ? out.slice(0, limit) : out;
  }, [products, selCat, selSub, limit]);

  const filtered = !!(selCat || selSub);
  const heading = title ?? selSub?.name ?? selCat?.name ?? "هەموو کاڵاکان";

  return (
    <>
      {eyebrow !== undefined ? (
        <div className="page-head">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{heading}</h1>
          <span className="count">{toKuDigits(list.length)} کاڵا</span>
        </div>
      ) : null}

      {showCatRow ? <CategoryTabs tabs={catTabs} active={cat} onSelect={pickCat} label="بەشەکان" /> : null}
      {subTabs.length > 0 ? (
        <CategoryTabs
          key={showCatRow ? `subs-${cat}` : "subs"}
          tabs={subTabs}
          active={sub}
          onSelect={pickSub}
          label="بەشە لاوەکییەکان"
          compact={showCatRow}
        />
      ) : null}

      {list.length === 0 ? (
        <div className="empty">
          {filtered ? (
            <>
              هێشتا کاڵا لەم بەشەدا نییە.{" "}
              <button type="button" className="link link-btn" onClick={() => pickCat("all")}>
                هەموو کاڵاکان ببینە
              </button>
            </>
          ) : (
            emptyText
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
