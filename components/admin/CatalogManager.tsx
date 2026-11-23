"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { uploadImage, removeImages } from "@/lib/image";
import { makeSlug } from "@/lib/format";
import PhotoPicker from "./PhotoPicker";

type Sub = { id: string; name: string; image_url: string | null; is_active: boolean };
type Cat = { id: string; name: string; image_url: string | null; is_active: boolean; subcategories: Sub[] };

export default function CatalogManager() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [msg, setMsg] = useState<{ t: "ok" | "err"; m: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const [catName, setCatName] = useState("");
  const [catFile, setCatFile] = useState<File | null>(null);
  const [catPrev, setCatPrev] = useState<string | null>(null);

  const [subCat, setSubCat] = useState("");
  const [subName, setSubName] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("categories")
      .select("id,name,image_url,is_active,subcategories(id,name,image_url,is_active)")
      .order("sort_order")
      .order("created_at");
    setCats((data as any) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const fail = (err: any) => setMsg({ t: "err", m: err?.message ?? "هەڵەیەک ڕوویدا" });

  async function addCategory(e: FormEvent) {
    e.preventDefault();
    if (!catName.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const image_url = catFile ? await uploadImage(catFile, "categories") : null;
      const { error } = await supabase
        .from("categories")
        .insert({ name: catName.trim(), slug: makeSlug(catName), image_url, sort_order: cats.length });
      if (error) throw error;
      setCatName("");
      setCatFile(null);
      setCatPrev(null);
      setMsg({ t: "ok", m: "بەشی سەرەکی زیادکرا ✅" });
      await load();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  async function addSub(e: FormEvent) {
    e.preventDefault();
    if (!subCat || !subName.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const siblings = cats.find((c) => c.id === subCat)?.subcategories.length ?? 0;
      const { error } = await supabase
        .from("subcategories")
        .insert({ category_id: subCat, name: subName.trim(), slug: makeSlug(subName), sort_order: siblings });
      if (error) throw error;
      setSubName("");
      setMsg({ t: "ok", m: "بەشی لاوەکی زیادکرا ✅" });
      await load();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(table: "categories" | "subcategories", id: string, value: boolean) {
    const { error } = await supabase.from(table).update({ is_active: value }).eq("id", id);
    if (error) return fail(error);
    load();
  }

  async function remove(table: "categories" | "subcategories", id: string, name: string, image: string | null) {
    if (!window.confirm(`"${name}" و هەموو کاڵاکانی ناوی دەسڕدرێنەوە. دڵنیایت؟`)) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return fail(error);
    await removeImages([image]);
    load();
  }

  return (
    <div>
      {msg ? <div className={`toast ${msg.t}`}>{msg.m}</div> : null}

      <form className="box" onSubmit={addCategory}>
        <h3>بەشی سەرەکی نوێ</h3>
        <label className="field">
          <span>ناو (وەک کابۆ، بلوز)</span>
          <input type="text" value={catName} onChange={(e) => setCatName(e.target.value)} />
        </label>
        <div className="field">
          <span>وێنە (ئارەزوومەندانە)</span>
          <PhotoPicker
            preview={catPrev}
            onPick={(f) => {
              setCatFile(f);
              setCatPrev(URL.createObjectURL(f));
            }}
          />
        </div>
        <button className="btn btn-primary" disabled={busy}>
          زیادکردن
        </button>
      </form>

      <form className="box" onSubmit={addSub}>
        <h3>بەشی لاوەکی نوێ</h3>
        <label className="field">
          <span>بەشی سەرەکی</span>
          <select value={subCat} onChange={(e) => setSubCat(e.target.value)}>
            <option value="">هەڵبژێرە...</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>ناو</span>
          <input type="text" value={subName} onChange={(e) => setSubName(e.target.value)} />
        </label>
        <button className="btn btn-primary" disabled={busy}>
          زیادکردن
        </button>
      </form>

      <div className="box">
        <h3>بەشەکان</h3>
        {cats.length === 0 ? <div className="empty">هیچ بەشێک نییە</div> : null}
        {cats.map((c) => (
          <div key={c.id} style={{ marginBottom: 14 }}>
            <div className="list-item">
              <div className="th">{c.image_url ? <img src={c.image_url} alt="" /> : null}</div>
              <div className="meta">
                <b>{c.name}</b>
                <small>{c.is_active ? "چالاک" : "شاراوە"}</small>
              </div>
              <div className="acts">
                <button className="btn btn-sm" onClick={() => toggle("categories", c.id, !c.is_active)}>
                  {c.is_active ? "شاردنەوە" : "پیشاندان"}
                </button>
                <button className="btn btn-sm btn-danger" onClick={() => remove("categories", c.id, c.name, c.image_url)}>
                  سڕینەوە
                </button>
              </div>
            </div>
            {c.subcategories.map((s) => (
              <div key={s.id} className="list-item" style={{ paddingInlineStart: 24 }}>
                <div className="meta">
                  <b>{s.name}</b>
                  <small>{s.is_active ? "چالاک" : "شاراوە"}</small>
                </div>
                <div className="acts" style={{ flexDirection: "row" }}>
                  <button className="btn btn-sm" onClick={() => toggle("subcategories", s.id, !s.is_active)}>
                    {s.is_active ? "شاردنەوە" : "پیشاندان"}
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => remove("subcategories", s.id, s.name, s.image_url)}>
                    سڕینەوە
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
