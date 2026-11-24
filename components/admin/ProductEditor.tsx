"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { uploadImage, removeImages } from "@/lib/image";
import { clearFiles, getFile, putFile, readDraft, removeDraft, writeDraft } from "@/lib/draft";
import { notifyProductsChanged, onCatalogChanged } from "@/lib/catalogEvents";
import { nameKey } from "@/lib/catalog";
import { usePalette } from "@/lib/usePalette";
import {
  ADMIN_PRODUCT_SELECT,
  colorPricesValid,
  colorsToRows,
  isUsedColor,
  variantsToColors,
  type AdminProduct,
} from "@/lib/adminProducts";
import PhotoPicker from "./PhotoPicker";
import ColorCard, { newColor, type ColorRow } from "./ColorCard";
import SubcategoryPicker, { type SubOption } from "./SubcategoryPicker";

type Cat = { id: string; name: string; is_active?: boolean; subcategories: SubOption[] };

type EditDraft = {
  name: string;
  price: string;
  desc: string;
  catId: string;
  subId: string;
  mainUrl: string | null;
  colors: Omit<ColorRow, "file" | "preview">[];
};

type Props = { productId: string; onClose: () => void };

/**
 * Full edit of an existing product: name, price, description, sub-category, main photo,
 * its colours (photos, sizes) and new colours. Unsaved changes are kept as a draft
 * (text in localStorage, new photos in IndexedDB) until saved or discarded.
 */
export default function ProductEditor({ productId, onClose }: Props) {
  const draftKey = `edit-product:${productId}`;
  const fileKey = (k: string) => `edit:${productId}:${k}`;

  const { palette, addCustomColor } = usePalette();
  const [orig, setOrig] = useState<AdminProduct | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [cats, setCats] = useState<Cat[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [desc, setDesc] = useState("");
  const [catId, setCatId] = useState("");
  const [subId, setSubId] = useState("");
  const [mainUrl, setMainUrl] = useState<string | null>(null);
  const [mainFile, setMainFile] = useState<File | null>(null);
  const [mainPreview, setMainPreview] = useState<string | null>(null);
  const [colors, setColors] = useState<ColorRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [restored, setRestored] = useState(false);
  const [errs, setErrs] = useState<Partial<Record<"name" | "sub" | "price" | "photo" | "colors", string>>>({});
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState("");
  const [others, setOthers] = useState<{ id: string; name: string; subcategory_id: string }[]>([]);

  const loadCats = useCallback(() => {
    supabase
      .from("categories")
      .select("id,name,is_active,subcategories(id,name,sort_order,is_active)")
      .order("sort_order")
      .order("created_at")
      .then(({ data, error }: any) => !error && data && setCats(data));
  }, []);
  useEffect(() => {
    loadCats();
    return onCatalogChanged(loadCats);
  }, [loadCats]);

  // Load the product, then lay a saved draft (if any) over it.
  const load = useCallback(
    async (useDraft: boolean) => {
      setLoaded(false);
      const [{ data, error }, { data: rest }] = await Promise.all([
        supabase.from("products").select(ADMIN_PRODUCT_SELECT).eq("id", productId).maybeSingle(),
        supabase.from("products").select("id,name,subcategory_id"),
      ]);
      if (error) {
        setSubmitErr(error.message);
        return;
      }
      if (!data) {
        setNotFound(true);
        return;
      }
      const p = data as any as AdminProduct;
      setOrig(p);
      setOthers(((rest as any[]) ?? []).filter((x) => x.id !== productId));
      const d = useDraft ? readDraft<EditDraft | null>(draftKey, null) : null;
      if (d) {
        setName(d.name);
        setPrice(d.price);
        setDesc(d.desc);
        setCatId(d.catId);
        setSubId(d.subId);
        setMainUrl(d.mainUrl);
        const mf = await getFile(fileKey("main"));
        setMainFile(mf);
        setMainPreview(mf ? URL.createObjectURL(mf) : d.mainUrl);
        const rows: ColorRow[] = [];
        for (const c of d.colors) {
          const f = await getFile(fileKey(`color:${c.id}`));
          rows.push({ ...c, price: c.price ?? "", file: f, preview: f ? URL.createObjectURL(f) : c.imageUrl ?? null });
        }
        setColors(rows.length ? rows : [newColor()]);
        setRestored(true);
      } else {
        setName(p.name);
        setPrice(String(Number(p.price)));
        setDesc(p.description ?? "");
        setCatId(p.subcategories?.category_id ?? "");
        setSubId(p.subcategory_id);
        setMainUrl(p.main_image_url);
        setMainFile(null);
        setMainPreview(p.main_image_url);
        const cs = variantsToColors(p.product_variants ?? []);
        setColors(cs.length ? cs : [newColor()]);
        setRestored(false);
      }
      setErrs({});
      setLoaded(true);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [productId]
  );
  useEffect(() => {
    load(true);
  }, [load]);

  // Auto-save every change as a draft for this product.
  useEffect(() => {
    if (!loaded) return;
    writeDraft(draftKey, {
      name,
      price,
      desc,
      catId,
      subId,
      mainUrl,
      colors: colors.map(({ file, preview, ...rest }) => rest),
    } satisfies EditDraft);
  }, [loaded, draftKey, name, price, desc, catId, subId, mainUrl, colors]);

  const subs = cats.find((c) => c.id === catId)?.subcategories ?? [];
  const addSubLocally = (sub: SubOption) =>
    setCats((list) =>
      list.map((c) => (c.id === catId && !c.subcategories.some((x) => x.id === sub.id) ? { ...c, subcategories: [...c.subcategories, sub] } : c))
    );

  const patchColor = (id: string, patch: Partial<ColorRow>) => {
    if (patch.file) putFile(fileKey(`color:${id}`), patch.file);
    setColors((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };
  const removeColor = (id: string) => {
    putFile(fileKey(`color:${id}`), null);
    removeDraft(`new-color:${id}`);
    setColors((cs) => cs.filter((x) => x.id !== id));
  };

  async function discard() {
    if (!window.confirm("گۆڕانکارییە پاشەکەوتنەکراوەکانی ئەم کاڵایە فڕێدەدرێن. دڵنیایت؟")) return;
    removeDraft(draftKey);
    await clearFiles(`edit:${productId}:`);
    await load(false);
  }

  async function close() {
    onClose();
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!orig) return;
    setSubmitErr(null);
    const priceNum = Number(price);
    const used = colors.filter(isUsedColor);
    const found: typeof errs = {};
    const dup = subId ? others.find((o) => o.subcategory_id === subId && nameKey(o.name) === nameKey(name)) : undefined;
    if (!name.trim()) found.name = "ناوی کاڵا بنووسە";
    else if (dup) found.name = `کاڵایەکی تر بە ناوی «${dup.name}» لەم بەشەدا هەیە. بۆ یەکخستنیان، لە لیستی کاڵاکان «یەکخستن» بەکاربهێنە.`;
    if (!subId) found.sub = "بەشی لاوەکی هەڵبژێرە";
    if (price.trim() === "" || Number.isNaN(priceNum) || priceNum < 0) found.price = "نرخ دروست نییە (تەنها ژمارە)";
    if (!mainFile && !mainUrl && !used.some((c) => c.file || c.imageUrl)) found.photo = "لانی کەم یەک وێنە پێویستە";
    if (!colorPricesValid(used)) found.colors = "نرخی تایبەتی یەکێک لە ڕەنگەکان دروست نییە";
    setErrs(found);
    const first = (["photo", "name", "sub", "price", "colors"] as const).find((k) => found[k]);
    if (first) {
      const el = document.getElementById(`pe-${first}`);
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
      el?.querySelector<HTMLElement>("input,select,textarea,button")?.focus({ preventScroll: true });
      return;
    }

    setBusy(true);
    try {
      setStep("وێنەکان بەرزدەکرێنەوە...");
      const newMain = mainFile ? await uploadImage(mainFile, "products") : null;
      const urls: (string | null)[] = [];
      for (const c of used) urls.push(c.file ? await uploadImage(c.file, "products") : null);
      const finalMain = newMain ?? mainUrl ?? urls.find(Boolean) ?? used.find((c) => c.imageUrl)?.imageUrl ?? null;

      setStep("پاشەکەوتکردن...");
      const { error: e1 } = await supabase
        .from("products")
        .update({ name: name.trim(), price: priceNum, description: desc.trim() || null, subcategory_id: subId, main_image_url: finalMain })
        .eq("id", orig.id);
      if (e1) throw e1;

      // Replace the variants safely: insert the new set first, then delete the old rows,
      // so a failure never leaves the product without colours.
      const oldIds = (orig.product_variants ?? []).map((v) => v.id).filter(Boolean) as string[];
      const rows = colorsToRows(used, orig.id, (c, i) => urls[i] ?? c.imageUrl ?? finalMain);
      if (rows.length) {
        const { error: e2 } = await supabase.from("product_variants").insert(rows);
        if (e2) throw e2;
      }
      if (oldIds.length) {
        const { error: e3 } = await supabase.from("product_variants").delete().in("id", oldIds);
        if (e3) throw e3;
      }

      // Photos no longer used by this product are removed from storage.
      const keep = new Set<string>([finalMain, ...rows.map((r) => r.image_url)].filter(Boolean) as string[]);
      const before = [orig.main_image_url, ...(orig.product_variants ?? []).map((v) => v.image_url)].filter(Boolean) as string[];
      await removeImages(Array.from(new Set(before.filter((u) => !keep.has(u)))));

      removeDraft(draftKey);
      await clearFiles(`edit:${productId}:`);
      notifyProductsChanged();
      onClose();
    } catch (err: any) {
      setSubmitErr(err?.message ?? "هەڵەیەک ڕوویدا، دووبارە هەوڵبدەرەوە");
    } finally {
      setBusy(false);
      setStep("");
    }
  }

  if (notFound)
    return (
      <div className="box">
        <p>ئەم کاڵایە ئیتر نەماوە.</p>
        <button type="button" className="btn" onClick={() => { removeDraft(draftKey); onClose(); }}>
          گەڕانەوە بۆ لیست
        </button>
      </div>
    );
  if (!loaded) return <div className="empty">...</div>;

  return (
    <form onSubmit={save} noValidate>
      <div className="editor-bar">
        <button type="button" className="btn btn-sm" onClick={close}>
          → گەڕانەوە بۆ لیست
        </button>
        <b>دەستکاریکردنی «{orig?.name}»</b>
      </div>

      {restored ? (
        <div className="toast ok" style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
          <span>گۆڕانکارییە پاشەکەوتنەکراوەکانت گەڕێندرانەوە</span>
          <button type="button" className="btn btn-sm" onClick={discard}>
            فڕێدانیان
          </button>
        </div>
      ) : null}

      <div className={`box ${errs.photo ? "has-err" : ""}`} id="pe-photo">
        <h3>وێنەی سەرەکی</h3>
        <PhotoPicker
          preview={mainPreview}
          label="وێنە"
          onPick={(f) => {
            putFile(fileKey("main"), f);
            setMainFile(f);
            setMainPreview(URL.createObjectURL(f));
            setErrs((x) => ({ ...x, photo: undefined }));
          }}
        />
        {errs.photo ? <small className="field-err">{errs.photo}</small> : null}
      </div>

      <div className="box">
        <h3>زانیاری</h3>
        <label className={`field ${errs.name ? "has-err" : ""}`} id="pe-name">
          <span>ناوی کاڵا</span>
          <input
            type="text"
            value={name}
            aria-invalid={!!errs.name}
            onChange={(e) => {
              setName(e.target.value);
              setErrs((x) => ({ ...x, name: undefined }));
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
        <div className={`field ${errs.sub ? "has-err" : ""}`} id="pe-sub">
          <span>بەشی لاوەکی</span>
          <SubcategoryPicker
            key={catId || "none"}
            catId={catId}
            subs={subs}
            value={subId}
            invalid={!!errs.sub}
            onPick={(id) => {
              setSubId(id);
              setErrs((x) => ({ ...x, sub: undefined }));
            }}
            onCreated={addSubLocally}
          />
          {errs.sub ? <small className="field-err">{errs.sub}</small> : null}
        </div>
        <label className={`field ${errs.price ? "has-err" : ""}`} id="pe-price">
          <span>نرخی گشتی (دینار)</span>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            value={price}
            aria-invalid={!!errs.price}
            onChange={(e) => {
              setPrice(e.target.value);
              setErrs((x) => ({ ...x, price: undefined }));
            }}
          />
          {errs.price ? <small className="field-err">{errs.price}</small> : null}
        </label>
        <label className="field">
          <span>وەسف (ئارەزوومەندانە)</span>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} />
        </label>
      </div>

      <div className={`box ${errs.colors ? "has-err" : ""}`} id="pe-colors">
        <h3>ڕەنگ و قەبارەکان ({colors.filter(isUsedColor).length})</h3>
        <p className="field-note">ئەگەر ڕەنگێک نرخی تایبەتی نەبێت، نرخی گشتیی کاڵاکە ({price || "—"} د.ع) بەکاردێت.</p>
        {errs.colors ? <small className="field-err">{errs.colors}</small> : null}
        {colors.map((c) => (
          <ColorCard
            key={c.id}
            color={c}
            canRemove={colors.length > 1}
            onChange={(patch) => patchColor(c.id, patch)}
            onRemove={() => {
              if (!c.imageUrl || window.confirm(`ڕەنگی «${c.name || "بێ ناو"}» لەم کاڵایە لادەبرێت (دوای پاشەکەوتکردن). دڵنیایت؟`)) removeColor(c.id);
            }}
            palette={palette}
            onColorCreated={addCustomColor}
          />
        ))}
        <button type="button" className="btn" onClick={() => setColors((cs) => [...cs, newColor()])}>
          + زیادکردنی ڕەنگی نوێ
        </button>
      </div>

      {submitErr ? <div className="toast err" role="alert">{submitErr}</div> : null}
      {Object.values(errs).some(Boolean) ? (
        <div className="toast err" role="alert">هەندێک خانە پێویستیان بە چاکردنەوەیە (بە سوور دیاریکراون).</div>
      ) : null}
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? step || "کاردەکات..." : "پاشەکەوتکردنی گۆڕانکارییەکان"}
      </button>
      <button type="button" className="btn btn-clear" disabled={busy} onClick={close}>
        داخستن (گۆڕانکارییەکان وەک ڕەشنووس دەمێننەوە)
      </button>
    </form>
  );
}
