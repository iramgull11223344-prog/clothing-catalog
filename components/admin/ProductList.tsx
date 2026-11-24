"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { removeImages } from "@/lib/image";
import { useDraft } from "@/lib/useDraft";
import { formatPrice } from "@/lib/format";
import { notifyProductsChanged, onProductsChanged } from "@/lib/catalogEvents";
import { comboKey, loadAdminProducts, productKey, type AdminProduct } from "@/lib/adminProducts";
import { colorNames, productPath } from "./ProductPicker";
import ProductEditor from "./ProductEditor";

const EDITING_KEY = "admin-editing-product";

export default function ProductList() {
  const [items, setItems] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ t: "ok" | "err"; m: string } | null>(null);
  // Prices typed but not saved yet survive reloads; errors are shown on the row itself.
  const [prices, setPrices] = useDraft<Record<string, string>>("prices", {});
  const [rowErr, setRowErr] = useState<Record<string, string>>({});
  const [rowOk, setRowOk] = useState<string | null>(null);
  // The product being edited stays open after a reload (per browser tab).
  const [editing, setEditing] = useState<string | null>(() => {
    try {
      return typeof window === "undefined" ? null : sessionStorage.getItem(EDITING_KEY);
    } catch {
      return null;
    }
  });
  const [busyId, setBusyId] = useState<string | null>(null);

  const dropPrice = (id: string) =>
    setPrices((m) => {
      if (!(id in m)) return m;
      const n = { ...m };
      delete n[id];
      return n;
    });

  const load = useCallback(async () => {
    const list = await loadAdminProducts();
    if (list === null) setMsg({ t: "err", m: "لیستی کاڵاکان بار نەبوو، دووبارە هەوڵبدەرەوە." });
    else setItems([...list].reverse()); // newest first
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    return onProductsChanged(load);
  }, [load]);

  function openEditor(id: string | null) {
    setEditing(id);
    try {
      if (id) sessionStorage.setItem(EDITING_KEY, id);
      else sessionStorage.removeItem(EDITING_KEY);
    } catch {}
    window.scrollTo({ top: 0 });
  }

  // Products with the same name in the same sub-category → the oldest one is kept.
  const dupTarget = useMemo(() => {
    const oldest = new Map<string, AdminProduct>();
    for (const p of [...items].sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""))) {
      const k = productKey(p.subcategory_id, p.name);
      if (!oldest.has(k)) oldest.set(k, p);
    }
    const out = new Map<string, AdminProduct>();
    for (const p of items) {
      const t = oldest.get(productKey(p.subcategory_id, p.name));
      if (t && t.id !== p.id) out.set(p.id, t);
    }
    return out;
  }, [items]);

  async function toggle(p: AdminProduct) {
    const { error } = await supabase.from("products").update({ is_active: !p.is_active }).eq("id", p.id);
    if (error) return setMsg({ t: "err", m: error.message });
    notifyProductsChanged();
  }

  async function savePrice(p: AdminProduct, value: string) {
    const n = Number(value);
    if (value.trim() === "" || Number.isNaN(n) || n < 0) {
      setRowErr((e) => ({ ...e, [p.id]: "نرخ دروست نییە (تەنها ژمارە)" }));
      return;
    }
    if (n === Number(p.price)) return dropPrice(p.id);
    const { error } = await supabase.from("products").update({ price: n }).eq("id", p.id);
    if (error) {
      setRowErr((e) => ({ ...e, [p.id]: error.message }));
      return;
    }
    setItems((list) => list.map((x) => (x.id === p.id ? { ...x, price: n } : x)));
    dropPrice(p.id);
    setRowOk(p.id);
    window.setTimeout(() => setRowOk((id) => (id === p.id ? null : id)), 1800);
  }

  async function remove(p: AdminProduct) {
    if (!window.confirm(`"${p.name}" دەسڕدرێتەوە. دڵنیایت؟`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) return setMsg({ t: "err", m: error.message });
    await removeImages([p.main_image_url, ...(p.product_variants ?? []).map((v) => v.image_url)]);
    notifyProductsChanged();
  }

  /** Moves the colours of `p` into `t` (skipping colour/size pairs `t` already has), then deletes `p`. */
  async function merge(p: AdminProduct, t: AdminProduct) {
    const priceNote =
      Number(p.price) !== Number(t.price)
        ? `\n\nئاگاداری: نرخەکان جیاوازن (${formatPrice(p.price)} و ${formatPrice(t.price)}). نرخی «${formatPrice(t.price)}» دەمێنێتەوە.`
        : "";
    if (
      !window.confirm(
        `ڕەنگەکانی ئەم «${p.name}» دەچنە ناو «${t.name}»ـە کۆنەکە (${productPath(t)})، و ئەم کارتە دووبارەیە دەسڕدرێتەوە.${priceNote}\n\nدڵنیایت؟`
      )
    )
      return;
    setBusyId(p.id);
    setMsg(null);
    try {
      const { data: tv, error: e0 } = await supabase.from("product_variants").select("color_name,color_hex,size,sort_order").eq("product_id", t.id);
      if (e0) throw e0;
      const have = new Set((tv ?? []).map((v: any) => comboKey(v.color_name, v.color_hex, v.size)));
      const maxOrder = Math.max(-1, ...(tv ?? []).map((v: any) => v.sort_order ?? 0));
      const base = (Math.floor(maxOrder / 100) + 1) * 100;
      const rows = [...(p.product_variants ?? [])]
        .sort((a, b) => a.sort_order - b.sort_order)
        .filter((v) => !have.has(comboKey(v.color_name, v.color_hex, v.size)))
        .map((v, i) => ({
          product_id: t.id,
          color_name: v.color_name,
          color_hex: v.color_hex,
          size: v.size,
          image_url: v.image_url ?? p.main_image_url,
          is_available: v.is_available,
          sort_order: base + i,
        }));
      if (rows.length) {
        const { error: e1 } = await supabase.from("product_variants").insert(rows);
        if (e1) throw e1;
      }
      if (!t.main_image_url && p.main_image_url) await supabase.from("products").update({ main_image_url: p.main_image_url }).eq("id", t.id);
      // Only after the colours are safely copied: delete the duplicate (its variants go with it).
      const { error: e2 } = await supabase.from("products").delete().eq("id", p.id);
      if (e2) throw e2;
      const used = new Set<string>([t.main_image_url, p.main_image_url, ...rows.map((r) => r.image_url)].filter(Boolean) as string[]);
      const orphan = [p.main_image_url, ...(p.product_variants ?? []).map((v) => v.image_url)].filter((u) => u && !used.has(u));
      await removeImages(orphan);
      dropPrice(p.id);
      setMsg({ t: "ok", m: `«${p.name}» یەکخرا لەگەڵ «${t.name}» ✅ (${rows.length} ڕەنگ/قەبارە گوازرانەوە)` });
      notifyProductsChanged();
    } catch (err: any) {
      setMsg({ t: "err", m: err?.message ?? "یەکخستن سەرکەوتوو نەبوو" });
    } finally {
      setBusyId(null);
    }
  }

  if (editing) return <ProductEditor key={editing} productId={editing} onClose={() => openEditor(null)} />;
  if (loading) return <div className="empty">...</div>;

  const dupCount = dupTarget.size;

  return (
    <div className="box">
      {msg ? <div className={`toast ${msg.t}`} role="status">{msg.m}</div> : null}
      {dupCount > 0 ? (
        <div className="toast err" role="status">
          {dupCount} کاڵا دووبارەن (هەمان ناو لە هەمان بەشدا). بە دوگمەی «یەکخستن» دەیانکەیتە یەک کارت.
        </div>
      ) : null}
      {items.length === 0 ? <div className="empty">هێشتا هیچ کاڵایەک نییە</div> : null}
      {items.map((p) => {
        const t = dupTarget.get(p.id);
        const cn = colorNames(p);
        return (
          <div key={p.id} className={`list-item ${t ? "is-dup" : ""}`}>
            <div className="th">{p.main_image_url ? <img src={p.main_image_url} alt="" /> : null}</div>
            <div className="meta">
              <b>{p.name}</b>
              <small>
                {productPath(p)}
                {p.is_active ? "" : " · شاراوە"}
              </small>
              <span className="ppick-dots" title={cn.map((c) => c.name).join("، ")}>
                {cn.map((c) => (
                  <span key={c.name + c.hex} className="cdot" style={{ background: c.hex }} />
                ))}
                <small>{cn.length} ڕەنگ</small>
              </span>
              <input
                className={`price-in ${rowErr[p.id] ? "is-err" : ""}`}
                type="number"
                inputMode="numeric"
                aria-invalid={!!rowErr[p.id]}
                aria-label="نرخ"
                value={prices[p.id] ?? String(Number(p.price))}
                onChange={(e) => {
                  const v = e.target.value;
                  setPrices((m) => ({ ...m, [p.id]: v }));
                  setRowErr((x) => (x[p.id] ? { ...x, [p.id]: "" } : x));
                }}
                onBlur={(e) => savePrice(p, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
              />
              {rowErr[p.id] ? (
                <small className="field-err">{rowErr[p.id]}</small>
              ) : p.id in prices && prices[p.id] !== String(Number(p.price)) ? (
                <small className="field-note">نرخی نوێ هێشتا پاشەکەوت نەکراوە</small>
              ) : rowOk === p.id ? (
                <small className="field-ok">پاشەکەوت کرا ✓</small>
              ) : null}
              {t ? (
                <div className="dup-note">
                  <span>دووبارەیە: «{t.name}» پێشتر لەم بەشەدا هەیە ({formatPrice(t.price)}).</span>
                  <button type="button" className="btn btn-sm btn-ink" disabled={busyId === p.id} onClick={() => merge(p, t)}>
                    {busyId === p.id ? "..." : "یەکخستن"}
                  </button>
                </div>
              ) : null}
            </div>
            <div className="acts">
              <button type="button" className="btn btn-sm btn-ink" onClick={() => openEditor(p.id)}>
                دەستکاریکردن / زیادکردنی ڕەنگ
              </button>
              <button type="button" className="btn btn-sm" onClick={() => toggle(p)}>
                {p.is_active ? "شاردنەوە" : "پیشاندان"}
              </button>
              <button type="button" className="btn btn-sm btn-danger" onClick={() => remove(p)}>
                سڕینەوە
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
