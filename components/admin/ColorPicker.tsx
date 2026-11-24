"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { colorKey, matchesColor, sameHex, type ColorOption } from "@/lib/colors";
import { useDraft } from "@/lib/useDraft";

type Props = {
  /** Draft key prefix for this colour card (keeps the half-filled "new colour" form). */
  draftKey: string;
  palette: ColorOption[];
  selected: { name: string; hex: string };
  onPick: (c: { name: string; hex: string }) => void;
  onCreated: (c: ColorOption) => void;
};

export default function ColorPicker({ draftKey, palette, selected, onPick, onCreated }: Props) {
  const [q, setQ] = useState("");
  // The "new colour" form is part of the auto-saved draft.
  const [form, setForm, clearForm] = useDraft(`new-color:${draftKey}`, { open: false, name: "", hex: "#7a1f2b" });
  const [err, setErr] = useState<string | null>(null);
  const [dup, setDup] = useState<ColorOption | null>(null);
  const [saving, setSaving] = useState(false);

  const shown = useMemo(() => palette.filter((c) => matchesColor(c, q)), [palette, q]);

  function openForm(prefillName = "") {
    setErr(null);
    setDup(null);
    setForm((f) => ({ ...f, open: true, name: prefillName || f.name }));
  }

  async function save() {
    const name = form.name.trim().replace(/\s+/g, " ");
    setDup(null);
    if (!name) return setErr("ناوی ڕەنگەکە بنووسە");
    if (name.length > 40) return setErr("ناوەکە زۆر درێژە (زۆرترین ٤٠ پیت)");
    const existing = palette.find((c) => colorKey(c.name) === colorKey(name));
    if (existing) {
      setDup(existing);
      return setErr(`ڕەنگێک بە ناوی «${existing.name}» پێشتر هەیە.`);
    }
    setSaving(true);
    setErr(null);
    const { data, error } = await supabase
      .from("custom_colors")
      .insert({ name, hex: form.hex.toUpperCase() })
      .select("id,name,hex")
      .single();
    setSaving(false);
    if (error) {
      // 23505 = same name already saved (maybe from another device)
      return setErr(error.code === "23505" ? "ئەم ناوە پێشتر پاشەکەوت کراوە." : error.message);
    }
    const created: ColorOption = { id: data.id, name: data.name, hex: data.hex, custom: true };
    onCreated(created);
    onPick({ name: created.name, hex: created.hex });
    clearForm();
    setQ("");
  }

  return (
    <div className="cpick">
      <div className="cpick-top">
        <input
          type="search"
          className="cpick-search"
          placeholder="گەڕان بەدوای ڕەنگدا..."
          aria-label="گەڕان بەدوای ڕەنگدا"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault(); // never submit the product form from here
              if (shown.length === 1) onPick({ name: shown[0].name, hex: shown[0].hex });
            }
          }}
        />
        <button type="button" className="btn btn-sm cpick-new" onClick={() => (form.open ? clearForm() : openForm(q))}>
          {form.open ? "داخستن" : "+ دروستکردنی ڕەنگی نوێ"}
        </button>
      </div>

      {form.open ? (
        <div className="cpick-form">
          <div className="cpick-form-row">
            <input
              type="color"
              value={form.hex}
              aria-label="هەڵبژاردنی پلەی ڕەنگ"
              onChange={(e) => setForm((f) => ({ ...f, hex: e.target.value }))}
            />
            <input
              type="text"
              placeholder="ناوی ڕەنگ بە کوردی (وەک: مارۆنی)"
              value={form.name}
              aria-invalid={!!err}
              onChange={(e) => {
                setForm((f) => ({ ...f, name: e.target.value }));
                setErr(null);
                setDup(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  save();
                }
              }}
            />
          </div>
          <div className="cpick-preview">
            <span className="cdot" style={{ background: form.hex }} />
            <span dir="ltr">{form.hex.toUpperCase()}</span>
          </div>
          {err ? (
            <small className="field-err">
              {err}{" "}
              {dup ? (
                <button
                  type="button"
                  className="link link-btn"
                  onClick={() => {
                    onPick({ name: dup.name, hex: dup.hex });
                    clearForm();
                    setErr(null);
                    setDup(null);
                  }}
                >
                  ئەوە هەڵبژێرە
                </button>
              ) : null}
            </small>
          ) : null}
          <div className="cpick-form-btns">
            <button type="button" className="btn btn-sm btn-ink" disabled={saving} onClick={save}>
              {saving ? "..." : "پاشەکەوتکردنی ڕەنگ"}
            </button>
            <button type="button" className="btn btn-sm" onClick={clearForm}>
              پاشگەزبوونەوە
            </button>
          </div>
        </div>
      ) : null}

      <div className="cpick-list" role="listbox" aria-label="ڕەنگەکان">
        {shown.map((c) => {
          const on = sameHex(c.hex, selected.hex) && colorKey(c.name) === colorKey(selected.name);
          return (
            <button
              key={(c.id ?? "p") + c.name}
              type="button"
              role="option"
              aria-selected={on}
              className={`cchip ${on ? "on" : ""} ${c.custom ? "is-custom" : ""}`}
              title={c.custom ? `${c.name} (ڕەنگی تایبەت)` : c.name}
              onClick={() => onPick({ name: c.name, hex: c.hex })}
            >
              <span className="cdot" style={{ background: c.hex }} />
              {c.name}
            </button>
          );
        })}
        {shown.length === 0 ? (
          <div className="cpick-empty">
            هیچ ڕەنگێک بە «{q}» نەدۆزرایەوە.{" "}
            <button type="button" className="link link-btn" onClick={() => openForm(q)}>
              دروستکردنی «{q}» وەک ڕەنگی نوێ
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
