"use client";

import { useEffect, useRef, useState } from "react";
import { formatPriceKu, toKuDigits } from "@/lib/format";
import { useCheckout, type PlacedOrder } from "@/lib/orders";
import CheckoutFields from "@/components/CheckoutFields";
import OrderSuccess from "@/components/OrderSuccess";

type Props = {
  productId: string;
  productName: string;
  color: string;
  colorHex: string | null;
  size: string;
  /** Unit price shown to the customer (the database sets the real one). */
  price: number;
  image: string | null;
  onClose: () => void;
};

/** Quick order for one item from the product page, saved straight into the shop's orders. */
export default function OrderModal({ productId, productName, color, colorHex, size, price, image, onClose }: Props) {
  const [qty, setQty] = useState(1);
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  const ck = useCheckout(() => [{ productId, color, colorHex, size, qty }], setPlaced);

  // Lock page scroll, close on Escape.
  useEffect(() => {
    closeBtn.current?.focus({ preventScroll: true });
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="order-title" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 id="order-title">{placed ? "سوپاس!" : "داواکردنی خێرا"}</h2>
          <button ref={closeBtn} type="button" className="modal-x" aria-label="داخستن" onClick={onClose}>
            ×
          </button>
        </div>

        {placed ? (
          <OrderSuccess order={placed} onClose={onClose} />
        ) : (
          <form onSubmit={ck.submit} noValidate>
            <div className="order-sum">
              <span className="cart-th">{image ? <img src={image} alt="" /> : null}</span>
              <div className="order-sum-info">
                <b>{productName}</b>
                <span className="cart-opts">
                  {color ? (
                    <span>
                      {colorHex ? <span className="dot" style={{ background: colorHex }} /> : null}
                      {color}
                    </span>
                  ) : null}
                  {size ? <span>قەبارە {size}</span> : null}
                </span>
                <div className="cart-row">
                  <div className="qty" role="group" aria-label="ژمارە">
                    <button type="button" aria-label="کەمکردنەوە" disabled={qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))}>
                      −
                    </button>
                    <span aria-live="polite">{toKuDigits(qty)}</span>
                    <button type="button" aria-label="زیادکردن" onClick={() => setQty((q) => Math.min(99, q + 1))}>
                      +
                    </button>
                  </div>
                  <b className="cart-price">{formatPriceKu(price * qty)}</b>
                </div>
              </div>
            </div>

            <CheckoutFields ck={ck} />

            {ck.serverErr ? (
              <div className="toast err" role="alert">
                {ck.serverErr}
              </div>
            ) : null}
            <button type="submit" className="btn-order" disabled={ck.busy}>
              {ck.busy ? "ناردن..." : "ناردنی داواکاری (تەواوکردنی کڕین)"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
