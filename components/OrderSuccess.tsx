"use client";

import { formatPriceKu, toKuDigits } from "@/lib/format";
import type { PlacedOrder } from "@/lib/orders";

/** Thank-you panel shown after an order was saved. */
export default function OrderSuccess({ order, onClose }: { order: PlacedOrder; onClose: () => void }) {
  return (
    <div className="order-ok" role="status" aria-live="polite">
      <div className="order-ok-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </div>
      <p className="order-ok-no">
        داواکاری ژمارە <b dir="ltr">#{toKuDigits(order.orderNo)}</b>
      </p>
      <h3>داواکارییەکەت بە سەرکەوتوویی گەیشت</h3>
      <p>بە زووترین کات پەیوەندیت پێوە دەکەین.</p>
      <div className="order-ok-total">
        <span>کۆی گشتی</span>
        <b>{formatPriceKu(order.total)}</b>
      </div>
      <button type="button" className="btn-solid" onClick={onClose}>
        بەردەوامبوون لە گەڕان
      </button>
    </div>
  );
}
