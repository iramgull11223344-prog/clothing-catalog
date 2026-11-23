"use client";

import { useMemo, useState } from "react";
import { formatPrice } from "@/lib/format";

type Variant = {
  color_name: string | null;
  color_hex: string | null;
  size: string | null;
  image_url: string | null;
  is_available: boolean;
};

type ColorGroup = {
  key: string;
  name: string;
  hex: string;
  image: string | null;
  sizes: { size: string; available: boolean }[];
};

type Props = {
  name: string;
  description: string | null;
  price: number | string;
  mainImage: string | null;
  variants: Variant[];
  crumbs?: string;
};

export default function ProductView({ name, description, price, mainImage, variants, crumbs }: Props) {
  const colors = useMemo(() => {
    const map = new Map<string, ColorGroup>();
    for (const v of variants) {
      const key = `${v.color_name ?? ""}|${v.color_hex ?? ""}`;
      let g = map.get(key);
      if (!g) {
        g = { key, name: v.color_name ?? "", hex: v.color_hex ?? "#d6d3d1", image: v.image_url, sizes: [] };
        map.set(key, g);
      }
      if (!g.image && v.image_url) g.image = v.image_url;
      if (v.size) g.sizes.push({ size: v.size, available: v.is_available });
    }
    return Array.from(map.values());
  }, [variants]);

  const [colorKey, setColorKey] = useState<string | undefined>(colors[0]?.key);
  const current = colors.find((c) => c.key === colorKey) ?? colors[0];
  const image = current?.image ?? mainImage;

  return (
    <div className="pv">
      <div className="pv-img">{image ? <img key={image} src={image} alt={name} /> : null}</div>

      <div>
        {crumbs ? <div className="crumbs">{crumbs}</div> : null}
        <h1>{name}</h1>
        <div className="price">{formatPrice(price)}</div>
        {description ? <p className="desc">{description}</p> : null}

        {colors.length > 0 && colors.some((c) => c.name || c.hex) ? (
          <>
            <div className="label">
              ڕەنگ{current?.name ? <>: <b>{current.name}</b></> : null}
            </div>
            <div className="swatches">
              {colors.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  aria-label={c.name || "ڕەنگ"}
                  className={`swatch ${c.key === current?.key ? "active" : ""}`}
                  style={{ background: c.hex }}
                  onClick={() => setColorKey(c.key)}
                />
              ))}
            </div>
          </>
        ) : null}

        {current && current.sizes.length > 0 ? (
          <>
            <div className="label">قەبارە</div>
            <div className="sizes">
              {current.sizes.map((s) => (
                <span key={s.size} className={`size ${s.available ? "" : "off"}`}>
                  {s.size}
                </span>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
