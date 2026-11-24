"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { uploadImage, uid } from "@/lib/image";
import { loadDraft, saveDraft, clearDraft, putFile, getFile, clearScroll } from "@/lib/draft";
import PhotoPicker from "./PhotoPicker";
import ColorPicker from "./ColorPicker";
import { PRESET_COLORS, readColorCache, writeColorCache, colorKey, type ColorOption } from "@/lib/colors";
import { removeDraft } from "@/lib/draft";

type Cat = { id: string; name: string; subcategories: { id: string; name: string }[] };
type ColorRow = {
  id: string;
  name: string;
  hex: string;
  file: File | null;
  preview: string | null;
  sizes: string[];
  custom: string; // text typed in "قەبارەی تر" but not added yet
};


const SIZES = ["S", "M", "L", "XL", "XXL", "3XL"];

function rank(s: string) {
  const i = SIZES.indexOf(s);
  if (i >= 0) return i;
  const n = Number(s);
  return Number.isNaN(n) ? 100 : 200 + n;
}

function newColor(sizes: string[] = []): ColorRow {
  return { id: uid(), name: "", hex: "#111111", file: null, preview: null, sizes, custom: "" };
}

function ColorCard({
  color,
  onChange,
  onRemove,
  canRemove,
  palette,
  onColorCreated,
}: {
  color: ColorRow;
  onChange: (patch: Partial<ColorRow>) => void;
  onRemove: () => void;
  canRemove: boolean;
  palette: ColorOption[];
  onColorCreated: (c: ColorOption) => void;
}) {
  const custom = color.custom;
  const setCustom = (v: string) => onChange({ custom: v });

  const toggle = (s: string) => {
    const next = color.sizes.includes(s) ? color.sizes.filter((x) => x !== s) : [...color.sizes, s];
    onChange({ sizes: next.sort((a, b) => rank(a) - rank(b)) });
  };

  const addCustom = () => {
    const v = custom.trim();
    if (v && !color.sizes.includes(v)) onChange({ sizes: [...color.sizes, v].sort((a, b) => rank(a) - rank(b)), custom: "" });
    else setCustom("");
  };

  return (
    <div className="color-card">
      <ColorPicker
        draftKey={color.id}
        palette={palette}
        selected={{ name: color.name, hex: color.hex }}
        onPick={(c) => onChange({ name: c.name, hex: c.hex })}
        onCreated={onColorCreated}
      />

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
  // Validation errors shown next to their field; the form is never emptied on an error.
  const [errs, setErrs] = useState<Partial<Record<"name" | "sub" | "price" | "photo", string>>>({});
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const clearErr = (k: keyof typeof errs) => setErrs((e) => (e[k] ? { ...e, [k]: undefined } : e));
  const [loaded, setLoaded] = useState(false);
  // Custom colours from Supabase (cached locally so the list is complete instantly).
  const [customColors, setCustomColors] = useState<ColorOption[]>(() => readColorCache());
  const palette = useMemo(() => {
    const seen = new Set(PRESET_COLORS.map((c) => colorKey(c.name)));
    return [...customColors.filter((c) => !seen.has(colorKey(c.name))), ...PRESET_COLORS];
  }, [customColors]);
  const addCustomColor = useCallback((c: ColorOption) => {
    setCustomColors((list) => {
      const next = [c, ...list.filter((x) => x.id !== c.id)];
      writeColorCache(next);
      return next;
    });
  }, []);

  useEffect(() => {
    supabase
      .from("custom_colors")
      .select("id,name,hex")
      .order("created_at", { ascending: false })
      .then(({ data, error }: any) => {
        if (error || !data) return; // keep the cached list on a network hiccup
        const list: ColorOption[] = data.map((c: any) => ({ id: c.id, name: c.name, hex: c.hex, custom: true }));
        setCustomColors(list);
        writeColorCache(list);
      });
  }, []);
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
            rows.push({ ...c, custom: c.custom ?? "", file: f, preview: f ? URL.createObjectURL(f) : null });
          }
          if (alive) setColors(rows);
        }
        const hasContent =
          !!(d.name || d.desc || d.price || main) ||
          (d.colors ?? []).some((c) => c.name || c.sizes?.length || c.custom);
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
      colors: colors.map(({ id, name, hex, sizes, custom }) => ({ id, name, hex, sizes, custom })),
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
    removeDraft(`new-color:${id}`);
    setColors((cs) => cs.filter((x) => x.id !== id));
  };

  const pickMain = (f: File) => {
    clearErr("photo");
    putFile("main", f);
    setMainFile(f);
    setMainPreview(URL.createObjectURL(f));
  };

  /** Empties the form. After a successful save the chosen category is kept for the next product. */
  const reset = (keepCategory = false) => {
    if (!keepCategory) {
      setCatId("");
      setSubId("");
    }
    setErrs({});
    setSubmitErr(null);
    setName("");
    setDesc("");
    setPrice("");
    setMainFile(null);
    setMainPreview(null);
    setColors([newColor()]);
    setRestored(false);
    clearDraft();
    clearScroll();
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    setSubmitErr(null);

    const priceNum = Number(price);
    const used = colors.filter((c) => c.name.trim() || c.file || c.sizes.length);

    const found: typeof errs = {};
    if (!name.trim()) found.name = "ناوی کاڵا بنووسە";
    if (!subId) found.sub = catId ? "بەشی لاوەکی هەڵبژێرە" : "بەشی سەرەکی و لاوەکی هەڵبژێرە";
    if (price === "" || Number.isNaN(priceNum) || priceNum < 0) found.price = "نرخ دروست نییە (تەنها ژمارە)";
    if (!mainFile && !used.some((c) => c.file)) found.photo = "لانی کەم یەک وێنە زیاد بکە";
    setErrs(found);
    const first = (["photo", "name", "sub", "price"] as const).find((k) => found[k]);
    if (first) {
      // Bring only the first wrong field into view (no jump to the top), and focus it.
      const el = document.getElementById(`pf-${first}`);
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.top < 80 || r.bottom > window.innerHeight) el.scrollIntoView({ block: "center", behavior: "smooth" });
        el.querySelector<HTMLElement>("input,select,textarea,button")?.focus({ preventScroll: true });
      }
      return;
    }

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

      reset(true);
      setMsg({ t: "ok", m: "کاڵا بە سەرکەوتوویی زیادکرا ✅" });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      // Upload/save failed: everything typed stays; the error is shown next to the button.
      setSubmitErr(err?.message ?? "هەڵەیەک ڕوویدا، دووبارە هەوڵبدەرەوە");
    } finally {
      setBusy(false);
      setStep("");
    }
  }

  return (
    // noValidate: our own Kurdish messages next to each field instead of the browser popup.
    <form onSubmit={submit} noValidate>
      {msg ? <div className={`toast ${msg.t}`}>{msg.m}</div> : null}

      {restored ? (
        <div className="toast ok" style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
          <span>ڕەشنووسی پێشوو گەڕێندرایەوە</span>
          <button type="button" className="btn btn-sm" onClick={() => setRestored(false)}>
            باشە
          </button>
        </div>
      ) : null}

      <div className={`box ${errs.photo ? "has-err" : ""}`} id="pf-photo">
        <h3>وێنەی سەرەکی</h3>
        <PhotoPicker
          preview={mainPreview}
          label="وێنە بگرە"
          onPick={pickMain}
        />
        {errs.photo ? <small className="field-err">{errs.photo}</small> : null}
      </div>

      <div className="box">
        <h3>زانیاری</h3>
        <label className={`field ${errs.name ? "has-err" : ""}`} id="pf-name">
          <span>ناوی کاڵا</span>
          <input
            type="text"
            value={name}
            aria-invalid={!!errs.name}
            onChange={(e) => {
              setName(e.target.value);
              clearErr("name");
            }}
          />
          {errs.name ? <small className="field-err">{errs.name}</small> : null}
        </label>
        <label className="field">
          <span>بەشی سەرەکی</span>
          <select
            value={catId}
            onChange={(e) => {
              setCatId(e.target.value);
              setSubId("");
            }}
            aria-invalid={!!errs.sub && !catId}
          >
            <option value="">هەڵبژێرە...</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className={`field ${errs.sub ? "has-err" : ""}`} id="pf-sub">
          <span>بەشی لاوەکی</span>
          <select
            value={subId}
            aria-invalid={!!errs.sub}
            onChange={(e) => {
              setSubId(e.target.value);
              clearErr("sub");
            }}
            disabled={!catId}
          >
            <option value="">هەڵبژێرە...</option>
            {subs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {errs.sub ? <small className="field-err">{errs.sub}</small> : null}
        </label>
        <label className={`field ${errs.price ? "has-err" : ""}`} id="pf-price">
          <span>نرخ (دینار)</span>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            value={price}
            aria-invalid={!!errs.price}
            onChange={(e) => {
              setPrice(e.target.value);
              clearErr("price");
            }}
          />
          {errs.price ? <small className="field-err">{errs.price}</small> : null}
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
            palette={palette}
            onColorCreated={addCustomColor}
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

      {submitErr ? <div className="toast err" role="alert">{submitErr}</div> : null}
      {Object.values(errs).some(Boolean) ? (
        <div className="toast err" role="alert">هەندێک خانە پێویستیان بە چاکردنەوەیە (بە سوور دیاریکراون).</div>
      ) : null}
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? step || "کاردەکات..." : "پاشەکەوتکردنی کاڵا"}
      </button>
      <button
        type="button"
        className="btn btn-clear"
        disabled={busy}
        onClick={() => {
          if (window.confirm("هەموو زانیارییەکانی ئەم فۆڕمە دەسڕدرێنەوە. دڵنیایت؟")) reset(false);
        }}
      >
        سڕینەوەی فۆڕم
      </button>
    </form>
  );
}
