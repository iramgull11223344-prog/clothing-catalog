"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { openCart } from "@/lib/cart";
import CartDrawer from "@/components/CartDrawer";

/**
 * Mounted once in the root layout: the bag drawer and the "added" confirmation live
 * here, so they stay alive while the customer moves between pages and categories.
 */
export default function CartRoot() {
  const [open, setOpen] = useState(false);
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
      window.clearTimeout(timer.current);
      setToast((e as CustomEvent).detail?.name ?? "");
      timer.current = window.setTimeout(() => setToast(null), 3500);
    };
    window.addEventListener("cart-open", onOpen);
    window.addEventListener("cart-added", onAdded);
    return () => {
      window.removeEventListener("cart-open", onOpen);
      window.removeEventListener("cart-added", onAdded);
    };
  }, []);

  if (!mounted) return null;

  return (
    <>
      <CartDrawer open={open} onClose={() => setOpen(false)} />
      {toast !== null
        ? createPortal(
            <div className="cart-toast" role="status">
              <span>✓ «{toast}» زیادکرا بۆ سەبەتە</span>
              <button type="button" onClick={openCart}>
                بینینی سەبەتە
              </button>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
