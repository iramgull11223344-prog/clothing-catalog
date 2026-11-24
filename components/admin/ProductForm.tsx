"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { uploadImage } from "@/lib/image";
import { loadDraft, saveDraft, clearDraft, putFile, getFile, clearScroll } from "@/lib/draft";
import PhotoPicker from "./PhotoPicker";
import ColorCard, { newColor, type ColorRow } from "./ColorCard";
import SubcategoryPicker, { type SubOption } from "./SubcategoryPicker";
import { onCatalogChanged, notifyProductsChanged, onProductsChanged } from "@/lib/catalogEvents";
import ProductPicker, { productPath, colorNames } from "./ProductPicker";
import { usePalette } from "@/lib/usePalette";
import { nameKey } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { colorsToRows, comboKey, isUsedColor, loadAdminProducts, type AdminProduct } from "@/lib/adminProducts";
import { removeDraft } from "@/lib/draft";

type Cat = { id: string; name: string; is_active?: boolean; subcategories: SubOption[] };
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
  const [errs, setErrs] = useState<Partial<Record<"name" | "sub" | "price" | "photo" | "colors", string>>>({});
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const clearErr = (k: keyof typeof errs) => setErrs((e) => (e[k] ? { ...e, [k]: undefined } : e));
  const [loaded, setLoaded] = useState(false);
  const { palette, addCustomColor } = usePalette();

  // Existing products: to spot a name that already exists, and to add colours to one.
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const loadProducts = useCallback(() => {
    loadAdminProducts().then((list) => {
      if (!list) return;
      setProducts(list);
      setProductsLoaded(true);
    });
  }, []);
  useEffect(() => {
    loadProducts();
    return onProductsChanged(loadProducts);
  }, [loadProducts]);
  const [mergeInto, setMergeInto] = useState<string>("");
  const [picking, setPicking] = useState(false);
  const target = mergeInto ? products.find((p) => p.id === mergeInto) : undefined;
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
        setMergeInto(d.mergeInto || "");

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
      mergeInto: mergeInto || undefined,
    });
  }, [loaded, catId, subId, name, desc, price, colors, mergeInto]);

  // The product chosen in a restored draft may have been deleted meanwhile.
  useEffect(() => {
    if (productsLoaded && mergeInto && !products.some((p) => p.id === mergeInto)) {
      setMergeInto("");
      setStaleNote("ئەو کاڵایەی ڕەنگەکانت بۆ زیاد دەکرد ئیتر نەماوە.");
    }
  }, [productsLoaded, mergeInto, products]);

  // Same name already in the chosen sub-category → offer to add the colours to it instead.
  const dupProduct =
    !mergeInto && subId && name.trim()
      ? products.find((p) => p.subcategory_id === subId && nameKey(p.name) === nameKey(name))
      : undefined;

  function startMerge(id: string) {
    setMergeInto(id);
    setPicking(false);
    setErrs({});
    setSubmitErr(null);
    setMsg(null);
    document.getElementById("pf-top")?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  // Categories are reloaded whenever another admin tab changes them (and on refocus).
  const [catsLoaded, setCatsLoaded] = useState(false);
  const [staleNote, setStaleNote] = useState<string | null>(null);
  const loadCats = useCallback(() => {
    supabase
      .from("categories")
      .select("id,name,is_active,subcategories(id,name,sort_order,is_active)")
      .order("sort_order")
      .order("created_at")
      .then(({ data, error }: any) => {
        if (error || !data) return;
        setCats(data);
        setCatsLoaded(true);
      });
  }, []);
  useEffect(() => {
    loadCats();
    return onCatalogChanged(loadCats);
  }, [loadCats]);

  // A restored draft may point to a category that was deleted meanwhile: clear it, with a note.
  useEffect(() => {
    if (!catsLoaded || !loaded) return;
    const cat = cats.find((c) => c.id === catId);
    if (catId && !cat) {
      setCatId("");
      setSubId("");
      setStaleNote("بەشی هەڵبژێردراوی ڕەشنووسەکە ئیتر نەماوە، دووبارە هەڵیبژێرە.");
    } else if (cat && subId && !cat.subcategories.some((x) => x.id === subId)) {
      setSubId("");
      setStaleNote("بەشە لاوەکییەکەی ڕەشنووسەکە ئیتر نەماوە، دووبارە هەڵیبژێرە.");
    }
  }, [catsLoaded, loaded, cats, catId, subId]);

  const subs = cats.find((c) => c.id === catId)?.subcategories ?? [];

  const addSubLocally = useCallback(
    (sub: SubOption) =>
      setCats((list) =>
        list.map((c) =>
          c.id === catId && !c.subcategories.some((x) => x.id === sub.id) ? { ...c, subcategories: [...c.subcategories, sub] } : c
        )
      ),
    [catId]
  );

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
    setMergeInto("");
    setRestored(false);
    clearDraft();
    clearScroll();
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    setSubmitErr(null);

    const priceNum = Number(price);
    const used = colors.filter(isUsedColor);

    if (target) return saveIntoExisting(target, used);

    const found: typeof errs = {};
    if (!name.trim()) found.name = "ناوی کاڵا بنووسە";
    else if (dupProduct)
      found.name = `«${dupProduct.name}» پێشتر لەم بەشەدا هەیە. بۆ ئەوەی دوو کارت دروست نەبێت، ڕەنگەکان بۆ ئەو کاڵایە زیاد بکە.`;
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
      notifyProductsChanged();
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

  /** Adds the colour cards to an existing product as new variants (no new product card). */
  async function saveIntoExisting(p: AdminProduct, used: ColorRow[]) {
    if (!used.length) {
      setErrs({ colors: "لانی کەم یەک ڕەنگ (ناو، قەبارە یان وێنە) زیاد بکە" });
      return;
    }
    setErrs({});
    setBusy(true);
    try {
      setStep("پشکنین...");
      const { data: existing, error: e0 } = await supabase
        .from("product_variants")
        .select("color_name,color_hex,size,image_url,sort_order")
        .eq("product_id", p.id);
      if (e0) throw e0;
      const have = new Set((existing ?? []).map((v: any) => comboKey(v.color_name, v.color_hex, v.size)));
      const colorImage = new Map<string, string>();
      for (const v of (existing ?? []) as any[]) {
        const k = comboKey(v.color_name, v.color_hex, null);
        if (v.image_url && !colorImage.has(k)) colorImage.set(k, v.image_url);
      }
      const maxOrder = Math.max(-1, ...(existing ?? []).map((v: any) => v.sort_order ?? 0));
      const base = (Math.floor(maxOrder / 100) + 1) * 100;

      // Work out what is really new before uploading anything.
      const draftRows = colorsToRows(used, p.id, () => null, base);
      const fresh = draftRows.filter((r) => !have.has(comboKey(r.color_name, r.color_hex, r.size)));
      const skipped = draftRows.length - fresh.length;
      if (!fresh.length) {
        setErrs({ colors: `هەموو ئەم ڕەنگ و قەبارانە پێشتر لە «${p.name}»دا هەن.` });
        return;
      }

      setStep("وێنەکان بەرزدەکرێنەوە...");
      const urls: (string | null)[] = [];
      for (const c of used) urls.push(c.file ? await uploadImage(c.file, "products") : null);

      const rows = colorsToRows(
        used,
        p.id,
        (c, i) => urls[i] ?? colorImage.get(comboKey(c.name.trim() || null, c.hex, null)) ?? p.main_image_url,
        base
      ).filter((r) => !have.has(comboKey(r.color_name, r.color_hex, r.size)));

      setStep("پاشەکەوتکردن...");
      const { error } = await supabase.from("product_variants").insert(rows);
      if (error) throw error;
      const firstUrl = urls.find(Boolean);
      if (!p.main_image_url && firstUrl) await supabase.from("products").update({ main_image_url: firstUrl }).eq("id", p.id);

      const productName = p.name;
      reset(true);
      notifyProductsChanged();
      setMsg({
        t: "ok",
        m: `${rows.length} ڕەنگ/قەبارەی نوێ بۆ «${productName}» زیادکرا ✅` + (skipped ? ` (${skipped} دانە پێشتر هەبوون و دووبارە نەکرانەوە)` : ""),
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
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

      <div className="box merge-box" id="pf-top">
        {target ? (
          <>
            <div className="merge-head">
              <span className="th">{target.main_image_url ? <img src={target.main_image_url} alt="" /> : null}</span>
              <div className="meta">
                <small>ڕەنگ و وێنەی نوێ بۆ ئەم کاڵایە زیاد دەکەیت:</small>
                <b>{target.name}</b>
                <small>
                  {productPath(target)} · {formatPrice(target.price)}
                </small>
                <span className="ppick-dots">
                  {colorNames(target).map((c) => (
                    <span key={c.name + c.hex} className="cdot" style={{ background: c.hex }} title={c.name} />
                  ))}
                </span>
              </div>
            </div>
            <p className="field-note">
              ڕەنگە نوێیەکان دەچنە ناو هەمان کارتی «{target.name}» لە دوکاندا. ناو و نرخ وەک خۆیان دەمێننەوە (لە تابی «کاڵاکان» دەتوانیت بیانگۆڕیت).
            </p>
            <div className="cpick-form-btns">
              <button type="button" className="btn btn-sm" onClick={() => setPicking(true)}>
                گۆڕینی کاڵا
              </button>
              <button type="button" className="btn btn-sm" onClick={() => setMergeInto("")}>
                نا، کاڵای نوێ دروست دەکەم
              </button>
            </div>
          </>
        ) : !picking ? (
          <button type="button" className="btn merge-open" onClick={() => setPicking(true)}>
            + زیادکردنی ڕەنگ/وێنەی نوێ بۆ کاڵایەکی پێشوو
          </button>
        ) : null}
        {picking ? (
          <ProductPicker products={products} onPick={startMerge} onCancel={() => setPicking(false)} />
        ) : null}
      </div>

      {target ? null : (
      <>
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
          {dupProduct ? (
            <div className="dup-note">
              {errs.name ? null : (
                <span>
                  «{dupProduct.name}» پێشتر لەم بەشەدا هەیە ({colorNames(dupProduct).map((c) => c.name || "—").join("، ")}).
                </span>
              )}
              <button type="button" className="btn btn-sm btn-ink" onClick={() => startMerge(dupProduct.id)}>
                زیادکردنی ئەم ڕەنگانە بۆ ئەو کاڵایە
              </button>
            </div>
          ) : null}
        </label>
        <label className="field">
          <span>بەشی سەرەکی</span>
          <select
            value={catId}
            onChange={(e) => {
              setCatId(e.target.value);
              setSubId("");
              setStaleNote(null);
            }}
            aria-invalid={!!errs.sub && !catId}
          >
            <option value="">هەڵبژێرە...</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.is_active === false ? " (شاراوە)" : ""}
              </option>
            ))}
          </select>
        </label>
        <div className={`field ${errs.sub ? "has-err" : ""}`} id="pf-sub">
          <span>بەشی لاوەکی</span>
          <SubcategoryPicker
            key={catId || "none"}
            catId={catId}
            subs={subs}
            value={subId}
            invalid={!!errs.sub}
            onPick={(id) => {
              setSubId(id);
              clearErr("sub");
              setStaleNote(null);
            }}
            onCreated={addSubLocally}
          />
          {errs.sub ? <small className="field-err">{errs.sub}</small> : null}
          {staleNote && !errs.sub ? <small className="field-note">{staleNote}</small> : null}
        </div>
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
      </>
      )}

      <div className={`box ${errs.colors ? "has-err" : ""}`} id="pf-colors">
        <h3>{target ? "ڕەنگ و قەبارە نوێیەکان" : "ڕەنگ و قەبارەکان"}</h3>
        {errs.colors ? <small className="field-err">{errs.colors}</small> : null}
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
        {busy ? step || "کاردەکات..." : target ? `زیادکردنی ڕەنگەکان بۆ «${target.name}»` : "پاشەکەوتکردنی کاڵا"}
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
