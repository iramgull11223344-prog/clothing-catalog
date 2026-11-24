"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { buildOrderMessage, loadCustomer, saveCustomer, whatsappUrl } from "@/lib/whatsapp";

type Props = {
  productName: string;
  color: string;
  size: string;
  price: string;
  onClose: () => void;
};

export default function OrderModal({ productName, color, size, price, onClose }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const firstInput = useRef<HTMLInputElement>(null);

  // Prefill from a previous order on this device, lock page scroll, close on Escape.
  useEffect(() => {
    const c = loadCustomer();
    setName(c.name);
    setPhone(c.phone);
    setAddress(c.address);
    firstInput.current?.focus();

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

  function submit(e: FormEvent) {
    e.preventDefault();
    const n = name.trim();
    const p = phone.trim();
    const a = address.trim();
    if (!n || !p || !a) {
      setError("تکایە هەموو خانەکان پڕ بکەرەوە.");
      return;
    }
    if (p.replace(/\D/g, "").length < 7) {
      setError("ژمارەی مۆبایل دروست نییە.");
      return;
    }
    setError("");
    saveCustomer({ name: n, phone: p, address: a });

    const url = whatsappUrl(
      buildOrderMessage({ productName, color, size, price, customerName: n, phone: p, address: a })
    );
    // Passing "noopener" makes window.open return null, so detach the opener manually.
    const win = window.open(url, "_blank");
    if (win) win.opener = null;
    else window.location.href = url;
    onClose();
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2 id="order-title">زانیاریی داواکاری</h2>
          <button type="button" className="modal-x" aria-label="داخستن" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="order-sum">
          <b>{productName}</b>
          <span>
            {[color, size].filter(Boolean).join(" · ")}
            {color || size ? " · " : ""}
            {price}
          </span>
        </div>

        <form onSubmit={submit} noValidate>
          <label className="field">
            <span>ناوی کڕیار</span>
            <input
              ref={firstInput}
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>ژمارە مۆبایل</span>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              placeholder="07xx xxx xxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>ناونیشان (شار و گەڕەک)</span>
            <input
              type="text"
              autoComplete="street-address"
              placeholder="بۆ نموونە: هەولێر، گەڕەکی ئازادی"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </label>

          {error ? <div className="toast err">{error}</div> : null}

          <button type="submit" className="btn-wa">
            ناردنی داواکاری
          </button>
        </form>
      </div>
    </div>
  );
}
