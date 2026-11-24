"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import { formatPriceKu, toKuDigits } from "@/lib/format";
import { effectivePrice, toPrice } from "@/lib/variantPrice";
import { useCheckout, type PlacedOrder } from "@/lib/orders";
import CheckoutFields from "@/components/CheckoutFields";
import OrderSuccess from "@/components/OrderSuccess";
import { cartCount, cartTotal, clearCart, getCart, patchCartItems, removeFromCart, setQty, useCart, type CartItem } from "@/lib/cart";

type Props = { open: boolean; onClose: () => void };

/** Re-reads prices and availability so the bag (and the WhatsApp message) is always current. */
async function refreshPrices() {
  const list = getCart();
  const ids = Array.from(new Set(list.map((i) => i.productId)));
  if (!ids.length) return;
  const { data, error } = await supabase
    .from("products")
    .select("id,name,price,is_active,product_variants(color_name,color_hex,size,price,is_available)")
    .in("id", ids);
  if (error || !data) return; // keep what we have when offline
  const byId = new Map((data as any[]).map((p) => [p.id, p]));
  // Only the price/availability of these items is patched into the CURRENT bag, so
  // anything added or removed while this request was loading is kept as it is.
  const patches = new Map<string, { price: number; unavailable: boolean }>();
  list.forEach((i) => {
    const p = byId.get(i.productId);
    let price = i.price;
    let unavailable = false;
    if (!p || !p.is_active) unavailable = true;
    else {
      const vs: any[] = p.product_variants ?? [];
      // The bag stores the colour's name (or its hex when it has no name) and its hex.
      const colorOf = (v: any) => v.color_name || v.color_hex || "";
      const sameColor = vs.filter((v) => colorOf(v) === i.color && (!i.colorHex || (v.color_hex ?? "") === i.colorHex));
      const v = sameColor.find((x) => (x.size ?? "") === i.size) ?? (i.size ? undefined : sameColor[0]);
      if (vs.length && !v) unavailable = true;
      else if (v && !v.is_available) unavailable = true;
      price = effectivePrice(v ? toPrice(v.price) : null, p.price);
    }
    if (price !== i.price || unavailable !== !!i.unavailable) patches.set(i.key, { price, unavailable });
  });
  patchCartItems(patches);
}

export default function CartDrawer({ open, onClose }: Props) {
  const items = useCart();
  const [mounted, setMounted] = useState(false);
  const [undo, setUndo] = useState<{ name: string; fn: () => void } | null>(null);
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const undoTimer = useRef(0);

  // Order straight from the site: only ids/colour/size/qty are sent; prices are set by the database.
  const ck = useCheckout(
    () =>
      getCart()
        .filter((i) => !i.unavailable)
        .map((i) => ({ productId: i.productId, color: i.color, colorHex: i.colorHex, size: i.size, qty: i.qty })),
    (o) => {
      clearCart();
      setPlaced(o);
    }
  );

  useEffect(() => setMounted(true), []);

  // Open: refresh prices, lock page scroll, focus the close button, Esc closes.
  useEffect(() => {
    if (!open) return;
    refreshPrices();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const back = document.activeElement as HTMLElement | null;
    closeBtn.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      back?.focus?.({ preventScroll: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // The thank-you panel is shown until the bag is closed.
  useEffect(() => {
    if (!open) setPlaced(null);
  }, [open]);

  const remove = useCallback((i: CartItem) => {
    const fn = removeFromCart(i.key);
    window.clearTimeout(undoTimer.current);
    setUndo({ name: i.name, fn });
    undoTimer.current = window.setTimeout(() => setUndo(null), 5000);
  }, []);

  if (!mounted) return null;

  const live = items.filter((i) => !i.unavailable);
  const count = cartCount(items);
  const total = cartTotal(items);
  const undoBar = undo ? (
    <div className="cart-undo" role="status">
      «{undo.name}» لابرا.
      <button
        type="button"
        className="link link-btn"
        onClick={() => {
          undo.fn();
          setUndo(null);
        }}
      >
        گەڕاندنەوە
      </button>
    </div>
  ) : null;

  return createPortal(
    <div className={`cart-root ${open ? "open" : ""}`} aria-hidden={!open} inert={!open || undefined}>
      <div className="cart-overlay" onClick={onClose} />
      <aside className="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title">
        <header className="cart-head">
          <h2 id="cart-title">
            سەبەتەی کڕین {count && !placed ? <span>({toKuDigits(count)})</span> : null}
          </h2>
          <button ref={closeBtn} type="button" className="icon-btn" aria-label="داخستن" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        {placed ? (
          <div className="cart-body">
            <OrderSuccess order={placed} onClose={onClose} />
          </div>
        ) : items.length === 0 ? (
          <div className="cart-body cart-empty">
            <svg viewBox="0 0 24 24" width="44" height="44" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1" strokeLinejoin="round">
              <path d="M5 8h14l-1.2 12H6.2z" />
              <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
            </svg>
            <p>سەبەتەکەت بەتاڵە.</p>
            <a className="btn-solid" href="/shop" onClick={onClose}>
              بچۆ بۆ دوکان
            </a>
            {undoBar}
          </div>
        ) : (
          <form className="cart-form" onSubmit={ck.submit} noValidate>
            <div className="cart-body">
              <ul className="cart-list">
                {items.map((i) => (
                  <li key={i.key} className={`cart-item ${i.unavailable ? "is-off" : ""}`}>
                    <a className="cart-th" href={`/p/${i.productId}`} onClick={onClose}>
                      {i.image ? <img src={i.image} alt="" /> : null}
                    </a>
                    <div className="cart-info">
                      <div className="cart-row">
                        <a className="cart-name" href={`/p/${i.productId}`} onClick={onClose}>
                          {i.name}
                        </a>
                        <button type="button" className="cart-x" aria-label={`لابردنی ${i.name}`} onClick={() => remove(i)}>
                          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                            <path d="M6 6l12 12M18 6L6 18" />
                          </svg>
                        </button>
                      </div>
                      <div className="cart-opts">
                        {i.color ? (
                          <span>
                            {i.colorHex ? <span className="dot" style={{ background: i.colorHex }} /> : null}
                            {i.color}
                          </span>
                        ) : null}
                        {i.size ? <span>قەبارە {i.size}</span> : null}
                      </div>
                      {i.unavailable ? (
                        <small className="field-err">ئەم کاڵایە ئێستا بەردەست نییە و ناچێتە ناو داواکارییەکە.</small>
                      ) : (
                        <div className="cart-row">
                          <div className="qty" role="group" aria-label="ژمارە">
                            <button type="button" aria-label="کەمکردنەوە" disabled={i.qty <= 1} onClick={() => setQty(i.key, i.qty - 1)}>
                              −
                            </button>
                            <span aria-live="polite">{toKuDigits(i.qty)}</span>
                            <button type="button" aria-label="زیادکردن" onClick={() => setQty(i.key, i.qty + 1)}>
                              +
                            </button>
                          </div>
                          <span className="cart-price">
                            {i.qty > 1 ? <small>{toKuDigits(i.qty)} × {formatPriceKu(i.price)}</small> : null}
                            {formatPriceKu(i.qty * i.price)}
                          </span>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              {undoBar}
              <CheckoutFields ck={ck} />
            </div>

            <footer className="cart-foot">
              <div className="cart-total">
                <span>کۆی گشتی ({toKuDigits(count)} پارچە)</span>
                <b aria-live="polite">{formatPriceKu(total)}</b>
              </div>
              {ck.serverErr ? (
                <div className="toast err" role="alert">
                  {ck.serverErr}
                </div>
              ) : null}
              <button type="submit" className="btn-order" disabled={!live.length || ck.busy}>
                {ck.busy ? "ناردن..." : "ناردنی داواکاری (تەواوکردنی کڕین)"}
              </button>
            </footer>
          </form>
        )}
      </aside>
    </div>,
    document.body
  );
}
