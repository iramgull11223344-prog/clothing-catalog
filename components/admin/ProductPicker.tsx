"use client";

import { useMemo, useState } from "react";
import { nameKey } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import type { AdminProduct } from "@/lib/adminProducts";

type Props = {
  products: AdminProduct[];
  onPick: (id: string) => void;
  onCancel: () => void;
};

export const productPath = (p: AdminProduct) =>
  [p.subcategories?.categories?.name, p.subcategories?.name].filter(Boolean).join(" / ");

export function colorNames(p: AdminProduct) {
  const seen = new Map<string, string>();
  for (const v of [...(p.product_variants ?? [])].sort((a, b) => a.sort_order - b.sort_order)) {
    const k = `${v.color_name ?? ""}|${v.color_hex ?? ""}`;
    if (!seen.has(k)) seen.set(k, v.color_hex ?? "#ccc");
  }
  return Array.from(seen.entries()).map(([k, hex]) => ({ name: k.split("|")[0], hex }));
}

/** Searchable list of existing products (newest first). */
export default function ProductPicker({ products, onPick, onCancel }: Props) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const k = nameKey(q);
    return [...products]
      .reverse()
      .filter((p) => !k || nameKey(p.name).includes(k) || nameKey(productPath(p)).includes(k));
  }, [products, q]);

  return (
    <div className="ppick">
      <div className="cpick-top">
        <input
          type="search"
          className="cpick-search"
          placeholder="گەڕان بەدوای کاڵادا (وەک Jeans)..."
          aria-label="گەڕان بەدوای کاڵادا"
          value={q}
          autoFocus
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (list.length === 1) onPick(list[0].id);
            }
          }}
        />
        <button type="button" className="btn btn-sm" onClick={onCancel}>
          داخستن
        </button>
      </div>
      <div className="ppick-list">
        {list.length === 0 ? <div className="cpick-empty">هیچ کاڵایەک نەدۆزرایەوە.</div> : null}
        {list.map((p) => (
          <button key={p.id} type="button" className="ppick-item" onClick={() => onPick(p.id)}>
            <span className="th">{p.main_image_url ? <img src={p.main_image_url} alt="" /> : null}</span>
            <span className="meta">
              <b>{p.name}</b>
              <small>
                {productPath(p)} · {formatPrice(p.price)}
              </small>
              <span className="ppick-dots">
                {colorNames(p).map((c) => (
                  <span key={c.name + c.hex} className="cdot" style={{ background: c.hex }} title={c.name} />
                ))}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
