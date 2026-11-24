"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import { formatPrice, formatPriceKu, toKuDigits } from "@/lib/format";
import { effectivePrice, toPrice } from "@/lib/variantPrice";
import { buildCartMessage, loadCustomer, saveCustomer, whatsappUrl, type Customer } from "@/lib/whatsapp";
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
  const [customer, setCustomer] = useState<Customer>({ name: "", phone: "", address: "" });
  const [errs, setErrs] = useState<Partial<Record<keyof Customer, string>>>({});
  const [undo, setUndo] = useState<{ name: string; fn: () => void } | null>(null);
  const [sentUrl, setSentUrl] = useState<string | null>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const undoTimer = useRef(0);

  useEffect(() => {
    setMounted(true);
    setCustomer(loadCustomer());
  }, []);

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

  useEffect(() => {
    if (!open) setSentUrl((u) => (u && items.length ? null : u));
  }, [open, items.length]);

  const setField = (k: keyof Customer, v: string) => {
    setCustomer((c) => {
      const next = { ...c, [k]: v };
      saveCustomer(next); // remembered on this device
      return next;
    });
    setErrs((e) => (e[k] ? { ...e, [k]: undefined } : e));
  };

  const remove = useCallback((i: CartItem) => {
    const fn = removeFromCart(i.key);
    window.clearTimeout(undoTimer.current);
    setUndo({ name: i.name, fn });
    undoTimer.current = window.setTimeout(() => setUndo(null), 5000);
  }, []);

  function send(e: FormEvent) {
    e.preventDefault();
    const c = { name: customer.name.trim(), phone: customer.phone.trim(), address: customer.address.trim() };
    const found: typeof errs = {};
    if (!c.name) found.name = "ناوت بنووسە";
    if (!c.phone) found.phone = "ژمارەی مۆبایل بنووسە";
    else if (c.phone.replace(/\D/g, "").length < 7) found.phone = "ژمارەی مۆبایل دروست نییە";
    if (!c.address) found.address = "شار و گەڕەک بنووسە";
    setErrs(found);
    if (Object.keys(found).length) {
      document.getElementById(`cart-${Object.keys(found)[0]}`)?.focus();
      return;
    }
    const lines = items
      .filter((i) => !i.unavailable)
      .map((i) => ({ name: i.name, color: i.color, size: i.size, qty: i.qty, price: i.price }));
    if (!lines.length) return;
    saveCustomer(c);
    const url = whatsappUrl(buildCartMessage(lines, c, formatPrice));
    const win = window.open(url, "_blank");
    if (win) win.opener = null;
    else window.location.href = url;
    clearCart();
    setSentUrl(url);
  }

  if (!mounted) return null;

  const live = items.filter((i) => !i.unavailable);
  const count = cartCount(items);
  const total = cartTotal(items);

  return createPortal(
    <div className={`cart-root ${open ? "open" : ""}`} aria-hidden={!open} inert={!open || undefined}>
      <div className="cart-overlay" onClick={onClose} />
      <aside className="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title">
        <header className="cart-head">
          <h2 id="cart-title">
            سەبەتەی کڕین {count ? <span>({toKuDigits(count)})</span> : null}
          </h2>
          <button ref={closeBtn} type="button" className="icon-btn" aria-label="داخستن" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        {sentUrl ? (
          <div className="cart-body cart-done">
            <div className="cart-done-mark" aria-hidden="true">✓</div>
            <h3>داواکارییەکەت ئامادە کرا</h3>
            <p>واتسئاپ کرایەوە و نامەکە نووسراوە؛ تەنها دوگمەی ناردن لە واتسئاپدا دابگرە.</p>
            <a className="btn-line" href={sentUrl} target="_blank" rel="noopener noreferrer">
              واتسئاپ نەکرایەوە؟ دووبارە بیکەرەوە
            </a>
            <button type="button" className="btn-solid" onClick={onClose}>
              بەردەوامبوون لە گەڕان
            </button>
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
            {undo ? (
              <div className="cart-undo" role="status">
                «{undo.name}» لابرا.
                <button type="button" className="link link-btn" onClick={() => { undo.fn(); setUndo(null); }}>
                  گەڕاندنەوە
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <form className="cart-form" onSubmit={send} noValidate>
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

              {undo ? (
                <div className="cart-undo" role="status">
                  «{undo.name}» لابرا.
                  <button type="button" className="link link-btn" onClick={() => { undo.fn(); setUndo(null); }}>
                    گەڕاندنەوە
                  </button>
                </div>
              ) : null}

              <fieldset className="cart-customer">
                <legend>زانیاری گەیاندن</legend>
                {(
                  [
                    { k: "name", label: "ناوی کڕیار", type: "text", ac: "name" },
                    { k: "phone", label: "ژمارە مۆبایل", type: "tel", ac: "tel", ph: "07xx xxx xxxx" },
                    { k: "address", label: "ناونیشان (شار و گەڕەک)", type: "text", ac: "street-address", ph: "بۆ نموونە: هەولێر، گەڕەکی ئازادی" },
                  ] as const
                ).map((f) => (
                  <label key={f.k} className={`field ${errs[f.k] ? "has-err" : ""}`}>
                    <span>{f.label}</span>
                    <input
                      id={`cart-${f.k}`}
                      type={f.type}
                      autoComplete={f.ac}
                      inputMode={f.type === "tel" ? "tel" : undefined}
                      dir={f.type === "tel" ? "ltr" : undefined}
                      placeholder={"ph" in f ? f.ph : undefined}
                      value={customer[f.k]}
                      aria-invalid={!!errs[f.k]}
                      onChange={(e) => setField(f.k, e.target.value)}
                    />
                    {errs[f.k] ? <small className="field-err">{errs[f.k]}</small> : null}
                  </label>
                ))}
              </fieldset>
            </div>

            <footer className="cart-foot">
              <div className="cart-total">
                <span>کۆی گشتی ({toKuDigits(count)} پارچە)</span>
                <b aria-live="polite">{formatPriceKu(total)}</b>
              </div>
              <button type="submit" className="btn-wa" disabled={!live.length}>
                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M12 3C7 3 3 6.6 3 11c0 2.3 1.1 4.4 2.9 5.9L5 21l4.4-2.2c.8.2 1.7.3 2.6.3 5 0 9-3.6 9-8s-4-8-9-8zm-4 9.2a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4zm4 0a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4zm4 0a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4z"
                  />
                </svg>
                ناردنی داواکارییەکە بۆ واتسئاپ
              </button>
            </footer>
          </form>
        )}
      </aside>
    </div>,
    document.body
  );
}
