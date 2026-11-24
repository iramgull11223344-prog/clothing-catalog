"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { uploadImage, removeImages } from "@/lib/image";
import { makeSlug } from "@/lib/format";
import { getFile, putFile } from "@/lib/draft";
import { useDraft } from "@/lib/useDraft";
import { nameKey } from "@/lib/catalog";
import { notifyCatalogChanged, onCatalogChanged } from "@/lib/catalogEvents";
import PhotoPicker from "./PhotoPicker";

type Sub = { id: string; name: string; image_url: string | null; is_active: boolean };
type Cat = { id: string; name: string; image_url: string | null; is_active: boolean; subcategories: Sub[] };

export default function CatalogManager() {
  const [cats, setCats] = useState<Cat[]>([]);
  // Messages are shown inside the form/list they belong to (no jump to the top).
  type Msg = { t: "ok" | "err"; m: string } | null;
  const [catMsg, setCatMsg] = useState<Msg>(null);
  const [subMsg, setSubMsg] = useState<Msg>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);

  // Drafts: text in localStorage, the photo in IndexedDB. Kept until the form is saved or cleared.
  const [catName, setCatName, clearCatName] = useDraft("cat-new-name", "");
  const [catFile, setCatFile] = useState<File | null>(null);
  const [catPrev, setCatPrev] = useState<string | null>(null);
  const [catErr, setCatErr] = useState<string | null>(null);

  const [subCat, setSubCat, clearSubCat] = useDraft("sub-new-category", "");
  const [subName, setSubName, clearSubName] = useDraft("sub-new-name", "");
  const [subErr, setSubErr] = useState<{ cat?: string; name?: string }>({});

  useEffect(() => {
    let alive = true;
    getFile("cat:new").then((f) => {
      if (f && alive) {
        setCatFile(f);
        setCatPrev(URL.createObjectURL(f));
      }
    });
    return () => {
      alive = false;
    };
  }, []);

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
    return onCatalogChanged(load);
  }, [load]);

  const fail = (err: any) => setMsg({ t: "err", m: err?.message ?? "هەڵەیەک ڕوویدا" });

  async function addCategory(e: FormEvent) {
    e.preventDefault();
    setCatMsg(null);
    if (!catName.trim()) {
      setCatErr("ناوی بەشەکە بنووسە");
      document.getElementById("cm-cat-name")?.focus({ preventScroll: true });
      return;
    }
    const sameCat = cats.find((c) => nameKey(c.name) === nameKey(catName));
    if (sameCat) {
      setCatErr(`بەشێکی سەرەکی بە ناوی «${sameCat.name}» پێشتر هەیە.`);
      return;
    }
    setBusy(true);
    try {
      const image_url = catFile ? await uploadImage(catFile, "categories") : null;
      const { error } = await supabase
        .from("categories")
        .insert({ name: catName.trim(), slug: makeSlug(catName), image_url, sort_order: cats.length });
      if (error) throw error;
      clearCatName();
      setCatFile(null);
      setCatPrev(null);
      await putFile("cat:new", null);
      setCatMsg({ t: "ok", m: "بەشی سەرەکی زیادکرا ✅" });
      await load();
      notifyCatalogChanged();
    } catch (err: any) {
      // Nothing typed is lost; the error stays next to the form.
      setCatMsg({ t: "err", m: err?.code === "23505" ? "ئەم ناوە پێشتر هەیە." : err?.message ?? "هەڵەیەک ڕوویدا" });
    } finally {
      setBusy(false);
    }
  }

  async function addSub(e: FormEvent) {
    e.preventDefault();
    setSubMsg(null);
    const found: { cat?: string; name?: string } = {};
    if (!subCat) found.cat = "بەشی سەرەکی هەڵبژێرە";
    if (!subName.trim()) found.name = "ناوی بەشی لاوەکی بنووسە";
    else {
      const same = cats.find((c) => c.id === subCat)?.subcategories.find((x) => nameKey(x.name) === nameKey(subName));
      if (same) found.name = `«${same.name}» پێشتر لەم بەشەدا هەیە، پێویست بە دروستکردنەوە ناکات.`;
    }
    setSubErr(found);
    if (found.cat || found.name) {
      document.getElementById(found.cat ? "cm-sub-cat" : "cm-sub-name")?.focus({ preventScroll: true });
      return;
    }
    setBusy(true);
    try {
      const siblings = cats.find((c) => c.id === subCat)?.subcategories.length ?? 0;
      const { error } = await supabase
        .from("subcategories")
        .insert({ category_id: subCat, name: subName.trim(), slug: makeSlug(subName), sort_order: siblings });
      if (error) throw error;
      clearSubName();
      setSubMsg({ t: "ok", m: "بەشی لاوەکی زیادکرا ✅" });
      await load();
      notifyCatalogChanged();
    } catch (err: any) {
      setSubMsg({ t: "err", m: err?.code === "23505" ? "ئەم بەشە لاوەکییە پێشتر هەیە." : err?.message ?? "هەڵەیەک ڕوویدا" });
    } finally {
      setBusy(false);
    }
  }

  async function toggle(table: "categories" | "subcategories", id: string, value: boolean) {
    const { error } = await supabase.from(table).update({ is_active: value }).eq("id", id);
    if (error) return fail(error);
    await load();
    notifyCatalogChanged();
  }

  async function remove(table: "categories" | "subcategories", id: string, name: string, image: string | null) {
    if (!window.confirm(`"${name}" و هەموو کاڵاکانی ناوی دەسڕدرێنەوە. دڵنیایت؟`)) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return fail(error);
    await removeImages([image]);
    await load();
    notifyCatalogChanged();
  }

  return (
    <div>
      <form className="box" onSubmit={addCategory} noValidate>
        <h3>بەشی سەرەکی نوێ</h3>
        <label className={`field ${catErr ? "has-err" : ""}`}>
          <span>ناو (وەک کابۆ، بلوز)</span>
          <input
            id="cm-cat-name"
            type="text"
            value={catName}
            aria-invalid={!!catErr}
            onChange={(e) => {
              setCatName(e.target.value);
              setCatErr(null);
            }}
          />
          {catErr ? <small className="field-err">{catErr}</small> : null}
        </label>
        <div className="field">
          <span>وێنە (ئارەزوومەندانە)</span>
          <PhotoPicker
            preview={catPrev}
            onPick={(f) => {
              setCatFile(f);
              setCatPrev(URL.createObjectURL(f));
              putFile("cat:new", f);
            }}
          />
        </div>
        {catMsg ? <div className={`toast ${catMsg.t}`} role="status">{catMsg.m}</div> : null}
        <button className="btn btn-primary" disabled={busy}>
          زیادکردن
        </button>
        {catName || catFile ? (
          <button
            type="button"
            className="btn btn-clear"
            onClick={() => {
              clearCatName();
              setCatFile(null);
              setCatPrev(null);
              setCatErr(null);
              putFile("cat:new", null);
            }}
          >
            سڕینەوەی فۆڕم
          </button>
        ) : null}
      </form>

      <form className="box" onSubmit={addSub} noValidate>
        <h3>بەشی لاوەکی نوێ</h3>
        <label className={`field ${subErr.cat ? "has-err" : ""}`}>
          <span>بەشی سەرەکی</span>
          <select
            id="cm-sub-cat"
            value={subCat}
            aria-invalid={!!subErr.cat}
            onChange={(e) => {
              setSubCat(e.target.value);
              setSubErr((x) => ({ ...x, cat: undefined }));
            }}
          >
            <option value="">هەڵبژێرە...</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {subErr.cat ? <small className="field-err">{subErr.cat}</small> : null}
        </label>
        <label className={`field ${subErr.name ? "has-err" : ""}`}>
          <span>ناو</span>
          <input
            id="cm-sub-name"
            type="text"
            value={subName}
            aria-invalid={!!subErr.name}
            onChange={(e) => {
              setSubName(e.target.value);
              setSubErr((x) => ({ ...x, name: undefined }));
            }}
          />
          {subErr.name ? <small className="field-err">{subErr.name}</small> : null}
        </label>
        {subMsg ? <div className={`toast ${subMsg.t}`} role="status">{subMsg.m}</div> : null}
        <button className="btn btn-primary" disabled={busy}>
          زیادکردن
        </button>
        {subName || subCat ? (
          <button
            type="button"
            className="btn btn-clear"
            onClick={() => {
              clearSubName();
              clearSubCat();
              setSubErr({});
            }}
          >
            سڕینەوەی فۆڕم
          </button>
        ) : null}
      </form>

      <div className="box">
        <h3>بەشەکان</h3>
        {msg ? <div className={`toast ${msg.t}`} role="status">{msg.m}</div> : null}
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
