"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cartCount, openCart, useCart } from "@/lib/cart";
import { toKuDigits } from "@/lib/format";
import CartDrawer from "@/components/CartDrawer";

/** Bag icon with a count badge; owns the drawer and the "added" confirmation. */
export default function CartButton() {
  const items = useCart();
  const count = cartCount(items);
  const [open, setOpen] = useState(false);
  const [bump, setBump] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const timer = useRef(0);

  useEffect(() => {
    setMounted(true);
    const onOpen = () => {
      setToast(null); // the bag itself shows what was added
      setOpen(true);
    };
    const onAdded = (e: Event) => {
      const name = (e as CustomEvent).detail?.name ?? "";
      setBump(true);
      window.setTimeout(() => setBump(false), 450);
      window.clearTimeout(timer.current);
      setToast(name);
      timer.current = window.setTimeout(() => setToast(null), 3500);
    };
    window.addEventListener("cart-open", onOpen);
    window.addEventListener("cart-added", onAdded);
    return () => {
      window.removeEventListener("cart-open", onOpen);
      window.removeEventListener("cart-added", onAdded);
    };
  }, []);

  return (
    <>
      <button
        type="button"
        className={`icon-btn cart-btn ${bump ? "bump" : ""}`}
        aria-label={count ? `سەبەتەی کڕین، ${count} پارچە` : "سەبەتەی کڕین"}
        onClick={() => {
          setToast(null);
          setOpen(true);
        }}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
          <path d="M5 8h14l-1.2 12H6.2z" />
          <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
        </svg>
        {mounted && count > 0 ? <span className="cart-badge">{toKuDigits(count > 99 ? "99+" : count)}</span> : null}
      </button>
      <CartDrawer open={open} onClose={() => setOpen(false)} />
      {mounted && toast !== null
        ? createPortal(
            <div className="cart-toast" role="status">
              <span>✓ «{toast}» زیادکرا بۆ سەبەتە</span>
              <button
                type="button"
                onClick={() => {
                  setToast(null);
                  openCart();
                }}
              >
                بینینی سەبەتە
              </button>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
