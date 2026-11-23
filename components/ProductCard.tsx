import Link from "next/link";
import { formatPrice } from "@/lib/format";

type Props = {
  id: string;
  name: string;
  price: number | string;
  main_image_url: string | null;
  product_variants?: { color_hex: string | null }[];
};

export default function ProductCard({ id, name, price, main_image_url, product_variants }: Props) {
  const hexes = Array.from(
    new Set((product_variants ?? []).map((v) => v.color_hex).filter(Boolean))
  ).slice(0, 6) as string[];

  return (
    <Link href={`/p/${id}`} className="card">
      <div className="ph">
        {main_image_url ? <img src={main_image_url} alt={name} loading="lazy" /> : null}
      </div>
      <div className="info">
        <div className="nm">{name}</div>
        <div className="pr">{formatPrice(price)}</div>
        {hexes.length > 1 ? (
          <div className="dots">
            {hexes.map((h) => (
              <span key={h} className="dot" style={{ background: h }} />
            ))}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
