"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { removeImages } from "@/lib/image";

export default function ProductList() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("products")
      .select("id,name,price,main_image_url,is_active,subcategories(name,categories(name)),product_variants(image_url)")
      .order("created_at", { ascending: false });
    if (error) setMsg(error.message);
    setItems(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(p: any) {
    const { error } = await supabase.from("products").update({ is_active: !p.is_active }).eq("id", p.id);
    if (error) return setMsg(error.message);
    load();
  }

  async function savePrice(p: any, value: string) {
    const n = Number(value);
    if (value === "" || Number.isNaN(n) || n < 0 || n === Number(p.price)) return;
    const { error } = await supabase.from("products").update({ price: n }).eq("id", p.id);
    if (error) return setMsg(error.message);
    load();
  }

  async function remove(p: any) {
    if (!window.confirm(`"${p.name}" دەسڕدرێتەوە. دڵنیایت؟`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) return setMsg(error.message);
    await removeImages([p.main_image_url, ...(p.product_variants ?? []).map((v: any) => v.image_url)]);
    load();
  }

  if (loading) return <div className="empty">...</div>;

  return (
    <div className="box">
      {msg ? <div className="toast err">{msg}</div> : null}
      {items.length === 0 ? <div className="empty">هێشتا هیچ کاڵایەک نییە</div> : null}
      {items.map((p) => (
        <div key={p.id} className="list-item">
          <div className="th">{p.main_image_url ? <img src={p.main_image_url} alt="" /> : null}</div>
          <div className="meta">
            <b>{p.name}</b>
            <small>
              {[p.subcategories?.categories?.name, p.subcategories?.name].filter(Boolean).join(" / ")}
              {p.is_active ? "" : " · شاراوە"}
            </small>
            <input
              className="price-in"
              type="number"
              inputMode="numeric"
              defaultValue={Number(p.price)}
              onBlur={(e) => savePrice(p, e.target.value)}
            />
          </div>
          <div className="acts">
            <button className="btn btn-sm" onClick={() => toggle(p)}>
              {p.is_active ? "شاردنەوە" : "پیشاندان"}
            </button>
            <button className="btn btn-sm btn-danger" onClick={() => remove(p)}>
              سڕینەوە
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
