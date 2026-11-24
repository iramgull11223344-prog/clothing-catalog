"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { uploadImage, uid } from "@/lib/image";
import { loadDraft, saveDraft, clearDraft, putFile, getFile } from "@/lib/draft";
import PhotoPicker from "./PhotoPicker";

type Cat = { id: string; name: string; subcategories: { id: string; name: string }[] };
type ColorRow = {
  id: string;
  name: string;
  hex: string;
  file: File | null;
  preview: string | null;
  sizes: string[];
};

const PRESETS: { name: string; hex: string }[] = [
  { name: "ڕەش", hex: "#111111" },
  { name: "سپی", hex: "#ffffff" },
  { name: "سوور", hex: "#d62828" },
  { name: "شین", hex: "#1d4ed8" },
  { name: "سەوز", hex: "#16a34a" },
  { name: "زەرد", hex: "#facc15" },
  { name: "پەمەیی", hex: "#f472b6" },
  { name: "نارنجی", hex: "#f97316" },
  { name: "مۆر", hex: "#7c3aed" },
  { name: "قاوەیی", hex: "#7c4a2d" },
  { name: "خۆڵەمێشی", hex: "#9ca3af" },
  { name: "کرێم", hex: "#f5e9d4" },
  { name: "شینی تۆخ", hex: "#1e3a5f" },
];

const SIZES = ["S", "M", "L", "XL", "XXL", "3XL"];

function rank(s: string) {
  const i = SIZES.indexOf(s);
  if (i >= 0) return i;
  const n = Number(s);
  return Number.isNaN(n) ? 100 : 200 + n;
}

function newColor(sizes: string[] = []): ColorRow {
  return { id: uid(), name: "", hex: "#111111", file: null, preview: null, sizes };
}

function ColorCard({
  color,
  onChange,
  onRemove,
  canRemove,
}: {
  color: ColorRow;
  onChange: (patch: Partial<ColorRow>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const [custom, setCustom] = useState("");

  const toggle = (s: string) => {
    const next = color.sizes.includes(s) ? color.sizes.filter((x) => x !== s) : [...color.sizes, s];
    onChange({ sizes: next.sort((a, b) => rank(a) - rank(b)) });
  };

  const addCustom = () => {
    const v = custom.trim();
    if (v && !color.sizes.includes(v)) onChange({ sizes: [...color.sizes, v].sort((a, b) => rank(a) - rank(b)) });
    setCustom("");
  };

  return (
    <div className="color-card">
      <div className="presets">
        {PRESETS.map((p) => (
          <button
            key={p.hex}
            type="button"
            title={p.name}
            className="preset"
            style={{ background: p.hex }}
            onClick={() => onChange({ name: p.name, hex: p.hex })}
          />
        ))}
      </div>

      <div className="color-head">
        <input type="color" value={color.hex} onChange={(e) => onChange({ hex: e.target.value })} />
        <input
          type="text"
          placeholder="ناوی ڕەنگ"
          value={color.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
        {canRemove ? (
          <button type="button" className="btn btn-sm btn-danger" onClick={onRemove}>
            ✕
          </button>
        ) : null}
      </div>

      <div className="field">
        <span>وێنەی ئەم ڕەنگە</span>
        <PhotoPicker
          preview={color.preview}
          label="وێنە"
          onPick={(f) => onChange({ file: f, preview: URL.createObjectURL(f) })}
        />
      </div>

      <div className="field">
        <span>قەبارەکانی ئەم ڕەنگە</span>
        <div className="size-chips">
          {SIZES.map((s) => (
            <button
              key={s}
              type="button"
              className={`size-chip ${color.sizes.includes(s) ? "on" : ""}`}
              onClick={() => toggle(s)}
            >
              {s}
            </button>
          ))}
          {color.sizes
            .filter((s) => !SIZES.includes(s))
            .map((s) => (
              <button key={s} type="button" className="size-chip on" onClick={() => toggle(s)}>
                {s}
              </button>
            ))}
        </div>
        <div className="row">
          <input
            type="text"
            placeholder="قەبارەی تر (وەک 38 یان Free)"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
          />
          <button type="button" className="btn" onClick={addCustom}>
            زیادکردن
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProductForm() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [catId, setCatId] = useState("");
  const [subId, setSubId] = useState("");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");
  const [mainFile, setMainFile] = useState<File | null>(null);
  const [mainPreview, setMainPreview] = useState<string | null>(null);
  const [colors, setColors] = useState<ColorRow[]>([newColor()]);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState("");
  const [msg, setMsg] = useState<{ t: "ok" | "err"; m: string } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [restored, setRestored] = useState(false);

  // Restore the auto-saved draft (text from localStorage, photos from IndexedDB).
  useEffect(() => {
    let alive = true;
    (async () => {
      const d = loadDraft();
      if (d) {
        setCatId(d.catId || "");
        setSubId(d.subId || "");
        setName(d.name || "");
        setDesc(d.desc || "");
        setPrice(d.price || "");

        const main = await getFile("main");
        if (main && alive) {
          setMainFile(main);
          setMainPreview(URL.createObjectURL(main));
        }
        if (d.colors?.length) {
          const rows: ColorRow[] = [];
          for (const c of d.colors) {
            const f = await getFile(`color:${c.id}`);
            rows.push({ ...c, file: f, preview: f ? URL.createObjectURL(f) : null });
          }
          if (alive) setColors(rows);
        }
        const hasContent =
          !!(d.name || d.desc || d.price || main) ||
          (d.colors ?? []).some((c) => c.name || c.sizes?.length);
        if (alive && hasContent) setRestored(true);
      }
      if (alive) setLoaded(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Auto-save every change.
  useEffect(() => {
    if (!loaded) return;
    saveDraft({
      catId,
      subId,
      name,
      desc,
      price,
      colors: colors.map(({ id, name, hex, sizes }) => ({ id, name, hex, sizes })),
    });
  }, [loaded, catId, subId, name, desc, price, colors]);

  useEffect(() => {
    supabase
      .from("categories")
      .select("id,name,subcategories(id,name)")
      .order("sort_order")
      .order("created_at")
      .then(({ data }) => setCats((data as any) ?? []));
  }, []);

  const subs = cats.find((c) => c.id === catId)?.subcategories ?? [];

  const patchColor = (id: string, patch: Partial<ColorRow>) => {
    if (patch.file) putFile(`color:${id}`, patch.file);
    setColors((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const removeColor = (id: string) => {
    putFile(`color:${id}`, null);
    setColors((cs) => cs.filter((x) => x.id !== id));
  };

  const pickMain = (f: File) => {
    putFile("main", f);
    setMainFile(f);
    setMainPreview(URL.createObjectURL(f));
  };

  const reset = () => {
    setName("");
    setDesc("");
    setPrice("");
    setMainFile(null);
    setMainPreview(null);
    setColors([newColor()]);
    setRestored(false);
    clearDraft();
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);

    const priceNum = Number(price);
    const used = colors.filter((c) => c.name.trim() || c.file || c.sizes.length);

    if (!name.trim()) return setMsg({ t: "err", m: "ناوی کاڵا بنووسە" });
    if (!subId) return setMsg({ t: "err", m: "بەشی لاوەکی هەڵبژێرە" });
    if (price === "" || Number.isNaN(priceNum) || priceNum < 0) return setMsg({ t: "err", m: "نرخ دروست نییە" });
    if (!mainFile && !used.some((c) => c.file)) return setMsg({ t: "err", m: "لانی کەم یەک وێنە زیاد بکە" });

    setBusy(true);
    try {
      setStep("وێنەکان بەرزدەکرێنەوە...");
      const mainUrl = mainFile ? await uploadImage(mainFile, "products") : null;
      const colorUrls: (string | null)[] = [];
      for (const c of used) colorUrls.push(c.file ? await uploadImage(c.file, "products") : null);

      setStep("پاشەکەوتکردن...");
      const { data: prod, error } = await supabase
        .from("products")
        .insert({
          subcategory_id: subId,
          name: name.trim(),
          description: desc.trim() || null,
          price: priceNum,
          main_image_url: mainUrl ?? colorUrls.find(Boolean) ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;

      const rows = used.flatMap((c, ci) =>
        (c.sizes.length ? c.sizes : [null]).map((s, si) => ({
          product_id: prod.id,
          color_name: c.name.trim() || null,
          color_hex: c.hex,
          size: s,
          image_url: colorUrls[ci] ?? mainUrl,
          is_available: true,
          sort_order: ci * 100 + si,
        }))
      );
      if (rows.length) {
        const { error: e2 } = await supabase.from("product_variants").insert(rows);
        if (e2) throw e2;
      }

      reset();
      setMsg({ t: "ok", m: "کاڵا بە سەرکەوتوویی زیادکرا ✅" });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setMsg({ t: "err", m: err?.message ?? "هەڵەیەک ڕوویدا" });
    } finally {
      setBusy(false);
      setStep("");
    }
  }

  return (
    <form onSubmit={submit}>
      {msg ? <div className={`toast ${msg.t}`}>{msg.m}</div> : null}

      {restored ? (
        <div className="toast ok" style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
          <span>ڕەشنووسی پێشوو گەڕێندرایەوە</span>
          <button type="button" className="btn btn-sm" onClick={reset}>
            سڕینەوە
          </button>
        </div>
      ) : null}

      <div className="box">
        <h3>وێنەی سەرەکی</h3>
        <PhotoPicker
          preview={mainPreview}
          label="وێنە بگرە"
          onPick={pickMain}
        />
      </div>

      <div className="box">
        <h3>زانیاری</h3>
        <label className="field">
          <span>ناوی کاڵا</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">
          <span>بەشی سەرەکی</span>
          <select
            value={catId}
            onChange={(e) => {
              setCatId(e.target.value);
              setSubId("");
            }}
          >
            <option value="">هەڵبژێرە...</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>بەشی لاوەکی</span>
          <select value={subId} onChange={(e) => setSubId(e.target.value)} disabled={!catId}>
            <option value="">هەڵبژێرە...</option>
            {subs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>نرخ (دینار)</span>
          <input type="number" inputMode="numeric" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
        </label>
        <label className="field">
          <span>وەسف (ئارەزوومەندانە)</span>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} />
        </label>
      </div>

      <div className="box">
        <h3>ڕەنگ و قەبارەکان</h3>
        {colors.map((c) => (
          <ColorCard
            key={c.id}
            color={c}
            canRemove={colors.length > 1}
            onChange={(patch) => patchColor(c.id, patch)}
            onRemove={() => removeColor(c.id)}
          />
        ))}
        <button
          type="button"
          className="btn"
          onClick={() => setColors((cs) => [...cs, newColor(cs[cs.length - 1]?.sizes ?? [])])}
        >
          + ڕەنگێکی تر
        </button>
      </div>

      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? step || "کاردەکات..." : "پاشەکەوتکردنی کاڵا"}
      </button>
    </form>
  );
}
