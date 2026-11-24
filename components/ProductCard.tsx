import Link from "next/link";
import { formatPriceKu } from "@/lib/format";

type Props = {
  id: string;
  name: string;
  price: number | string;
  main_image_url: string | null;
  product_variants?: { color_hex: string | null; color_name?: string | null }[];
  subcategories?: unknown;
  subcategory_id?: unknown;
  /** Load eagerly (first row of a grid). */
  priority?: boolean;
};

export default function ProductCard({ id, name, price, main_image_url, product_variants, priority }: Props) {
  const seen = new Map<string, string>();
  for (const v of product_variants ?? []) {
    if (v.color_hex && !seen.has(v.color_hex)) seen.set(v.color_hex, v.color_name ?? "");
  }
  const colors = Array.from(seen.entries()).slice(0, 6);

  return (
    <Link href={`/p/${id}`} className="card">
      <div className="card-img">
        {main_image_url ? (
          <img src={main_image_url} alt={name} loading={priority ? "eager" : "lazy"} />
        ) : (
          <span className="card-noimg" dir="ltr">ERAM</span>
        )}
      </div>
      <div className="card-info">
        <h3 className="card-name">{name}</h3>
        <div className="card-meta">
          <span className="card-price">{formatPriceKu(price)}</span>
          {colors.length > 0 ? (
            <span className="card-colors" aria-label={`${colors.length} ڕەنگ`}>
              {colors.map(([hex, nm]) => (
                <span key={hex} className="dot" style={{ background: hex }} title={nm || undefined} />
              ))}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
