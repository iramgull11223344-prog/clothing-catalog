"use client";

import { useEffect, useState } from "react";
import { cartCount, openCart, useCart } from "@/lib/cart";
import { toKuDigits } from "@/lib/format";

/** Bag icon with a count badge (the drawer itself lives in the root layout: CartRoot). */
export default function CartButton() {
  const items = useCart();
  const count = cartCount(items);
  const [bump, setBump] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onAdded = () => {
      setBump(true);
      window.setTimeout(() => setBump(false), 450);
    };
    window.addEventListener("cart-added", onAdded);
    return () => window.removeEventListener("cart-added", onAdded);
  }, []);

  return (
    <button
      type="button"
      className={`icon-btn cart-btn ${bump ? "bump" : ""}`}
      aria-label={mounted && count ? `سەبەتەی کڕین، ${count} پارچە` : "سەبەتەی کڕین"}
      onClick={openCart}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
        <path d="M5 8h14l-1.2 12H6.2z" />
        <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
      </svg>
      {mounted && count > 0 ? <span className="cart-badge">{toKuDigits(count > 99 ? "99+" : count)}</span> : null}
    </button>
  );
}
