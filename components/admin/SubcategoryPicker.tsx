"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { makeSlug } from "@/lib/format";
import { nameKey } from "@/lib/catalog";
import { useDraft } from "@/lib/useDraft";
import { notifyCatalogChanged } from "@/lib/catalogEvents";

export type SubOption = { id: string; name: string; sort_order?: number; is_active?: boolean };

type Props = {
  catId: string;
  subs: SubOption[];
  value: string;
  onPick: (id: string) => void;
  /** A sub-category was created (or found) on the server; add it to the list. */
  onCreated: (s: SubOption) => void;
  invalid?: boolean;
};

/**
 * Existing sub-categories of the chosen main category as one-click buttons (the default),
 * plus a separate "create new" form that never creates a duplicate name.
 */
export default function SubcategoryPicker({ catId, subs, value, onPick, onCreated, invalid }: Props) {
  const [form, setForm, clearForm] = useDraft(`new-sub:${catId || "none"}`, { open: false, name: "" });
  const [err, setErr] = useState<string | null>(null);
  const [dup, setDup] = useState<SubOption | null>(null);
  const [saving, setSaving] = useState(false);

  if (!catId) return <div className="subpick-hint">سەرەتا بەشی سەرەکی هەڵبژێرە.</div>;

  const sorted = [...subs].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  async function create() {
    const name = form.name.trim().replace(/\s+/g, " ");
    setDup(null);
    if (!name) return setErr("ناوی بەشە لاوەکییەکە بنووسە");
    // Same name already in this category (case/space-insensitive) → use it, never duplicate.
    const existing = subs.find((s) => nameKey(s.name) === nameKey(name));
    if (existing) {
      setDup(existing);
      return setErr(`«${existing.name}» پێشتر لەم بەشەدا هەیە.`);
    }
    setSaving(true);
    setErr(null);
    const { data, error } = await supabase
      .from("subcategories")
      .insert({ category_id: catId, name, slug: makeSlug(name), sort_order: subs.length })
      .select("id,name,sort_order,is_active")
      .single();
    setSaving(false);
    if (error) {
      if (error.code === "23505") {
        // Created meanwhile (another tab/device): fetch it and select it instead.
        const { data: rows } = await supabase.from("subcategories").select("id,name,sort_order,is_active").eq("category_id", catId);
        const found = (rows ?? []).find((s: any) => nameKey(s.name) === nameKey(name));
        if (found) {
          onCreated(found);
          onPick(found.id);
          clearForm();
          notifyCatalogChanged();
          return;
        }
      }
      return setErr(error.message);
    }
    onCreated(data);
    onPick(data.id);
    clearForm();
    notifyCatalogChanged();
  }

  return (
    <div className={`subpick ${invalid ? "is-err" : ""}`}>
      {sorted.length > 0 ? (
        <div className="subpick-list" role="radiogroup" aria-label="بەشی لاوەکی">
          {sorted.map((s) => (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={value === s.id}
              className={`subchip ${value === s.id ? "on" : ""}`}
              onClick={() => onPick(s.id)}
            >
              {s.name}
              {s.is_active === false ? <small> (شاراوە)</small> : null}
            </button>
          ))}
        </div>
      ) : (
        <div className="subpick-hint">هێشتا هیچ بەشێکی لاوەکی لەم بەشەدا نییە، یەکێک دروست بکە.</div>
      )}

      {form.open ? (
        <div className="cpick-form">
          <input
            type="text"
            placeholder="ناوی بەشی لاوەکی (وەک Jeans)"
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
                create();
              }
            }}
          />
          {err ? (
            <small className="field-err">
              {err}{" "}
              {dup ? (
                <button
                  type="button"
                  className="link link-btn"
                  onClick={() => {
                    onPick(dup.id);
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
            <button type="button" className="btn btn-sm btn-ink" disabled={saving} onClick={create}>
              {saving ? "..." : "پاشەکەوتکردن و هەڵبژاردن"}
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => {
                clearForm();
                setErr(null);
                setDup(null);
              }}
            >
              پاشگەزبوونەوە
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn btn-sm subpick-new" onClick={() => setForm((f) => ({ ...f, open: true }))}>
          + دروستکردنی بەشی لاوەکی نوێ
        </button>
      )}
    </div>
  );
}
