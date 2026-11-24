"use client";

import type { Checkout } from "@/lib/orders";

const FIELDS = [
  { k: "name", label: "ناوی تەواو", type: "text", ac: "name", ph: "" },
  { k: "phone", label: "ژمارە مۆبایل", type: "tel", ac: "tel", ph: "07xx xxx xxxx" },
  { k: "address", label: "ناونیشانی ورد", type: "area", ac: "street-address", ph: "شار، گەڕەک، کۆڵان یان نزیک چی" },
] as const;

/** Name / phone / detailed address / optional note — used in the bag and the quick order. */
export default function CheckoutFields({ ck, title = "زانیاری گەیاندن" }: { ck: Checkout; title?: string }) {
  return (
    <fieldset className="cart-customer" disabled={ck.busy}>
      <legend>{title}</legend>
      {FIELDS.map((f) => (
        <label key={f.k} className={`field ${ck.errs[f.k] ? "has-err" : ""}`}>
          <span>{f.label}</span>
          {f.type === "area" ? (
            <textarea
              id={`co-${f.k}`}
              rows={2}
              autoComplete={f.ac}
              placeholder={f.ph}
              value={ck.customer[f.k]}
              aria-invalid={!!ck.errs[f.k]}
              onChange={(e) => ck.setField(f.k, e.target.value)}
            />
          ) : (
            <input
              id={`co-${f.k}`}
              type={f.type}
              autoComplete={f.ac}
              inputMode={f.type === "tel" ? "tel" : undefined}
              dir={f.type === "tel" ? "ltr" : undefined}
              placeholder={f.ph || undefined}
              value={ck.customer[f.k]}
              aria-invalid={!!ck.errs[f.k]}
              onChange={(e) => ck.setField(f.k, e.target.value)}
            />
          )}
          {ck.errs[f.k] ? <small className="field-err">{ck.errs[f.k]}</small> : null}
        </label>
      ))}
      <label className="field">
        <span>
          تێبینی <small className="opt-note">(ئارەزوومەندانە)</small>
        </span>
        <textarea rows={2} maxLength={600} placeholder="بۆ نموونە: کاتی گونجاو بۆ پەیوەندی" value={ck.note} onChange={(e) => ck.setNote(e.target.value)} />
      </label>
    </fieldset>
  );
}
