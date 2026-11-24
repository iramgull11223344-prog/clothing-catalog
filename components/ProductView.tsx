"use client";

import { useCallback, useMemo, useState } from "react";
import OrderModal from "@/components/OrderModal";
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

  const [pickedSize, setPickedSize] = useState<string | null>(null);
  const [sizeHint, setSizeHint] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const closeOrder = useCallback(() => setOrderOpen(false), []);

  const hasColors = colors.length > 0 && colors.some((c) => c.name || c.hex);
  const allSizes = current?.sizes ?? [];
  const availableSizes = allSizes.filter((s) => s.available);
  // Auto-pick when only one size is available; drop a pick the current colour doesn't offer.
  const size =
    availableSizes.length === 1
      ? availableSizes[0].size
      : availableSizes.some((s) => s.size === pickedSize)
        ? pickedSize
        : null;
  const soldOut = allSizes.length > 0 && availableSizes.length === 0;

  function pickColor(key: string) {
    setColorKey(key);
    setSizeHint(false);
  }

  function pickSize(s: string) {
    setPickedSize(s);
    setSizeHint(false);
  }

  function startOrder() {
    if (allSizes.length > 0 && !size) {
      setSizeHint(true);
      return;
    }
    setOrderOpen(true);
  }

  return (
    <div className="pv">
      <div className="pv-img">{image ? <img key={image} src={image} alt={name} /> : null}</div>

      <div>
        {crumbs ? <div className="crumbs">{crumbs}</div> : null}
        <h1>{name}</h1>
        <div className="price">{formatPrice(price)}</div>
        {description ? <p className="desc">{description}</p> : null}

        {hasColors ? (
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
                  aria-pressed={c.key === current?.key}
                  className={`swatch ${c.key === current?.key ? "active" : ""}`}
                  style={{ background: c.hex }}
                  onClick={() => pickColor(c.key)}
                />
              ))}
            </div>
          </>
        ) : null}

        {allSizes.length > 0 ? (
          <>
            <div className="label">
              قەبارە{size ? <>: <b>{size}</b></> : null}
            </div>
            <div className="sizes">
              {allSizes.map((s) => (
                <button
                  key={s.size}
                  type="button"
                  disabled={!s.available}
                  aria-pressed={s.size === size}
                  className={`size ${s.available ? "" : "off"} ${s.size === size ? "active" : ""}`}
                  onClick={() => pickSize(s.size)}
                >
                  {s.size}
                </button>
              ))}
            </div>
            {sizeHint ? <div className="size-hint">تکایە سەرەتا قەبارەیەک هەڵبژێرە.</div> : null}
          </>
        ) : null}

        <button type="button" className="btn-wa order-btn" disabled={soldOut} onClick={startOrder}>
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path
              fill="currentColor"
              d="M12 3C7 3 3 6.6 3 11c0 2.3 1.1 4.4 2.9 5.9L5 21l4.4-2.2c.8.2 1.7.3 2.6.3 5 0 9-3.6 9-8s-4-8-9-8zm-4 9.2a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4zm4 0a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4zm4 0a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4z"
            />
          </svg>
          {soldOut ? "ئەم ڕەنگە لە ئێستادا بەردەست نییە" : "داواکردن لە ڕێگەی واتسئاپ"}
        </button>
      </div>

      {orderOpen ? (
        <OrderModal
          productName={name}
          color={hasColors ? current?.name || current?.hex || "" : ""}
          size={size ?? ""}
          price={formatPrice(price)}
          onClose={closeOrder}
        />
      ) : null}
    </div>
  );
}
