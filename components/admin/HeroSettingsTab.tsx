"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { uploadImage, removeImages } from "@/lib/image";
import { getFile, putFile, readDraft, removeDraft, writeDraft } from "@/lib/draft";
import { HERO_DEFAULTS, HERO_KEY, HERO_LIMITS, mergeHero } from "@/lib/hero";
import PhotoPicker from "./PhotoPicker";

type Fields = { eyebrow: string; title: string; lead: string; btn1: string; btn2: string };
type Saved = Fields & { image_url: string | null };
type Draft = Fields & { removeImage: boolean };

const EMPTY: Fields = { eyebrow: "", title: "", lead: "", btn1: "", btn2: "" };
const DRAFT_KEY = "hero-settings";
const FILE_KEY = "hero:image";

const LABELS: { k: keyof Fields; label: string; multiline?: boolean }[] = [
  { k: "eyebrow", label: "سەردێڕی بچووکی سەرەوە" },
  { k: "title", label: "ناونیشانی گەورەی سەرەکی", multiline: true },
  { k: "lead", label: "دەقی وەسفی ژێر ناونیشان", multiline: true },
  { k: "btn1", label: "دەقی دوگمەی یەکەم (دەچێت بۆ دوکان)" },
  { k: "btn2", label: "دەقی دوگمەی دووەم (دەچێت بۆ نوێترینەکان)" },
];

const same = (a: Fields, b: Fields) => (Object.keys(EMPTY) as (keyof Fields)[]).every((k) => a[k] === b[k]);

/** Admin tab: edit the home page banner texts and photo (saved in site_settings). */
export default function HeroSettingsTab() {
  const [saved, setSaved] = useState<Saved | null>(null);
  const [form, setForm] = useState<Fields>(EMPTY);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [restored, setRestored] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ t: "ok" | "err"; m: string } | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  async function load() {
    setLoadErr(null);
    const { data, error } = await supabase.from("site_settings").select("value").eq("key", HERO_KEY).maybeSingle();
    if (error) {
      setLoadErr(error.message);
      return;
    }
    const v = (data?.value ?? {}) as Record<string, unknown>;
    const s: Saved = {
      eyebrow: String(v.eyebrow ?? ""),
      title: String(v.title ?? ""),
      lead: String(v.lead ?? ""),
      btn1: String(v.btn1 ?? ""),
      btn2: String(v.btn2 ?? ""),
      image_url: (v.image_url as string) || null,
    };
    setSaved(s);
    // Unsaved typing from before a reload wins over the database values.
    const d = readDraft<Draft | null>(DRAFT_KEY, null);
    const f = await getFile(FILE_KEY);
    if (d || f) {
      const { removeImage: rm, ...fields } = d ?? { ...s, removeImage: false };
      setForm({ ...EMPTY, ...fields });
      setRemoveImage(!!rm);
      if (f) {
        setFile(f);
        setFilePreview(URL.createObjectURL(f));
      }
      setRestored(!!f || !!rm || !same({ ...EMPTY, ...fields }, s));
    } else {
      setForm({ eyebrow: s.eyebrow, title: s.title, lead: s.lead, btn1: s.btn1, btn2: s.btn2 });
    }
    setLoaded(true);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (loaded) writeDraft(DRAFT_KEY, { ...form, removeImage } satisfies Draft);
  }, [loaded, form, removeImage]);

  const set = (k: keyof Fields, v: string) => {
    setMsg(null);
    setForm((f) => ({ ...f, [k]: v.slice(0, HERO_LIMITS[k]) }));
  };

  async function discard() {
    removeDraft(DRAFT_KEY);
    await putFile(FILE_KEY, null);
    setFile(null);
    setFilePreview(null);
    setRestored(false);
    setLoaded(false);
    await load();
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!saved) return;
    setBusy(true);
    setMsg(null);
    try {
      const newUrl = file ? await uploadImage(file, "site") : null;
      const image_url = newUrl ?? (removeImage ? null : saved.image_url);
      const value = {
        eyebrow: form.eyebrow.trim(),
        title: form.title.trim(),
        lead: form.lead.trim(),
        btn1: form.btn1.trim(),
        btn2: form.btn2.trim(),
        image_url,
      };
      const { error } = await supabase.from("site_settings").upsert({ key: HERO_KEY, value }, { onConflict: "key" });
      if (error) {
        if (newUrl) await removeImages([newUrl]); // don't leave an unused upload behind
        throw error;
      }
      if (saved.image_url && saved.image_url !== image_url) await removeImages([saved.image_url]);
      removeDraft(DRAFT_KEY);
      await putFile(FILE_KEY, null);
      setSaved(value);
      setForm({ eyebrow: value.eyebrow, title: value.title, lead: value.lead, btn1: value.btn1, btn2: value.btn2 });
      setFile(null);
      setFilePreview(null);
      setRemoveImage(false);
      setRestored(false);
      setMsg({ t: "ok", m: "پاشەکەوت کرا ✅ ئێستا لە پەڕەی سەرەکیدا دەردەکەوێت." });
    } catch (err: any) {
      // Nothing typed is lost; the draft stays.
      setMsg({ t: "err", m: err?.message ?? "پاشەکەوتکردن سەرکەوتوو نەبوو" });
    } finally {
      setBusy(false);
    }
  }

  if (loadErr)
    return (
      <div className="empty">
        ڕێکخستنەکان بار نەبوون.{" "}
        <button type="button" className="link link-btn" onClick={load}>
          دووبارە هەوڵبدەرەوە
        </button>
      </div>
    );
  if (!loaded || !saved) return <div className="empty">...</div>;

  const shown = mergeHero({ ...form, image_url: removeImage ? null : saved.image_url });
  const previewImg = filePreview ?? shown.image_url;
  const currentImg = filePreview ?? (removeImage ? null : saved.image_url);
  const dirty = !!file || removeImage || !same(form, saved);

  return (
    <form onSubmit={save} noValidate>
      {restored ? (
        <div className="toast ok" style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
          <span>گۆڕانکارییە پاشەکەوتنەکراوەکانت گەڕێندرانەوە</span>
          <button type="button" className="btn btn-sm" onClick={discard}>
            فڕێدانیان
          </button>
        </div>
      ) : null}

      <div className="box">
        <h3>ڕێکخستنی دەقەکانی پێشەکی پەڕەی سەرەکی</h3>
        <p className="field-note">هەر خانەیەک بەتاڵ بێت، دەقە بنەڕەتییەکە (ئەوەی بە کاڵی دیارە) لە پەڕەی سەرەکیدا دەردەکەوێت.</p>
        {LABELS.map(({ k, label, multiline }) => (
          <label key={k} className="field">
            <span>
              {label}
              <small className="hero-count">
                {form[k].length}/{HERO_LIMITS[k]}
              </small>
            </span>
            {multiline ? (
              <textarea rows={k === "lead" ? 3 : 2} value={form[k]} placeholder={HERO_DEFAULTS[k]} onChange={(e) => set(k, e.target.value)} />
            ) : (
              <input type="text" value={form[k]} placeholder={HERO_DEFAULTS[k]} onChange={(e) => set(k, e.target.value)} />
            )}
          </label>
        ))}
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => {
            setForm(EMPTY);
            setMsg(null);
          }}
        >
          گەڕاندنەوەی دەقە بنەڕەتییەکان
        </button>
      </div>

      <div className="box">
        <h3>وێنەی پێشەکی (ئارەزوومەندانە)</h3>
        <PhotoPicker
          preview={currentImg}
          label="وێنە"
          onPick={(f) => {
            putFile(FILE_KEY, f);
            setFile(f);
            setFilePreview(URL.createObjectURL(f));
            setRemoveImage(false);
            setMsg(null);
          }}
        />
        {currentImg ? (
          <button
            type="button"
            className="btn btn-sm btn-clear"
            onClick={() => {
              putFile(FILE_KEY, null);
              setFile(null);
              setFilePreview(null);
              setRemoveImage(!!saved.image_url);
            }}
          >
            لابردنی وێنە
          </button>
        ) : null}
        <p className="field-note">بەبێ وێنەی تایبەت، وێنەی نوێترین کاڵا بەکاردێت.</p>
      </div>

      <div className="box">
        <h3>پێشبینین</h3>
        <div className="hero-preview">
          <div className={`hero-panel ${previewImg ? "" : "no-img"}`} dir="ltr">
            <div className="hero-copy" dir="rtl">
              <p className="eyebrow">{shown.eyebrow}</p>
              <h1>{shown.title}</h1>
              <p className="hero-lead">{shown.lead}</p>
              <div className="hero-btns">
                <span className="btn-solid">{shown.btn1}</span>
                <span className="btn-line">{shown.btn2}</span>
              </div>
            </div>
            {previewImg ? (
              <div className="hero-media">
                <img src={previewImg} alt="" />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {msg ? (
        <div className={`toast ${msg.t}`} role="status">
          {msg.m}{" "}
          {msg.t === "ok" ? (
            <a href="/" target="_blank" rel="noopener noreferrer" className="link">
              بینینی پەڕەی سەرەکی
            </a>
          ) : null}
        </div>
      ) : null}
      <button type="submit" className="btn btn-primary" disabled={busy || !dirty}>
        {busy ? "پاشەکەوتکردن..." : dirty ? "پاشەکەوتکردن" : "هیچ گۆڕانکارییەک نییە"}
      </button>
    </form>
  );
}
