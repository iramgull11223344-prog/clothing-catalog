"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatPriceKu } from "@/lib/format";
import { effectivePrice, toPrice } from "@/lib/variantPrice";

type CardVariant = {
  color_hex: string | null;
  color_name?: string | null;
  price?: number | string | null;
  image_url?: string | null;
  sort_order?: number;
};

type Props = {
  id: string;
  name: string;
  price: number | string;
  main_image_url: string | null;
  product_variants?: CardVariant[];
  subcategories?: unknown;
  subcategory_id?: unknown;
  /** Load eagerly (first row of a grid). */
  priority?: boolean;
};

type Swatch = { key: string; name: string; hex: string; price: number; image: string | null };

export default function ProductCard({ id, name, price, main_image_url, product_variants, priority }: Props) {
  // One swatch per colour (same grouping as the product page: "name|hex"), in saved order.
  const swatches = useMemo(() => {
    const map = new Map<string, { key: string; name: string; hex: string; own: number | null; image: string | null }>();
    const sorted = [...(product_variants ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    for (const v of sorted) {
      if (!v.color_hex) continue;
      const key = `${v.color_name ?? ""}|${v.color_hex ?? ""}`;
      const g = map.get(key);
      if (!g) map.set(key, { key, name: v.color_name ?? "", hex: v.color_hex, own: toPrice(v.price), image: v.image_url ?? null });
      else {
        if (g.own === null) g.own = toPrice(v.price);
        if (!g.image && v.image_url) g.image = v.image_url;
      }
    }
    return Array.from(map.values()).map<Swatch>((g) => ({ ...g, price: effectivePrice(g.own, price) }));
  }, [product_variants, price]);

  const [sel, setSel] = useState<string | null>(null);
  const picked = swatches.find((s) => s.key === sel);

  const prices = swatches.length ? swatches.map((s) => s.price) : [effectivePrice(null, price)];
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  // Different prices per colour → "from …" until a colour is chosen.
  const label = picked ? formatPriceKu(picked.price) : min === max ? formatPriceKu(min) : `لە ${formatPriceKu(min)} ـەوە`;
  const image = picked?.image ?? main_image_url;
  const href = picked ? `/p/${id}?color=${encodeURIComponent(picked.key)}` : `/p/${id}`;
  const shown = swatches.slice(0, 6);

  return (
    <div className="card">
      <Link href={href} className="card-link">
        <div className="card-img">
          {image ? (
            <img src={image} alt={name} loading={priority ? "eager" : "lazy"} />
          ) : (
            <span className="card-noimg" dir="ltr">ERAM</span>
          )}
        </div>
        <div className="card-info">
          <h3 className="card-name">{name}</h3>
        </div>
      </Link>
      <div className="card-meta">
        <span className="card-price" aria-live="polite">
          {label}
        </span>
        {shown.length > 0 ? (
          <span className="card-colors" role="group" aria-label="ڕەنگەکان">
            {shown.map((s) => (
              <button
                key={s.key}
                type="button"
                className={`dot-btn ${sel === s.key ? "on" : ""}`}
                aria-pressed={sel === s.key}
                aria-label={s.name || "ڕەنگ"}
                title={s.name ? `${s.name} · ${formatPriceKu(s.price)}` : undefined}
                onClick={() => setSel((cur) => (cur === s.key ? null : s.key))}
              >
                <span className="dot" style={{ background: s.hex }} />
              </button>
            ))}
          </span>
        ) : null}
      </div>
    </div>
  );
}
