"use client";

import { uid } from "@/lib/image";
import PhotoPicker from "./PhotoPicker";
import ColorPicker from "./ColorPicker";
import type { ColorOption } from "@/lib/colors";
import { isValidPriceInput } from "@/lib/variantPrice";

export type ColorRow = {
  id: string;
  name: string;
  hex: string;
  file: File | null;
  preview: string | null;
  sizes: string[];
  custom: string; // text typed in "قەبارەی تر" but not added yet
  /** Photo already uploaded (editing an existing product). A new `file` replaces it. */
  imageUrl?: string | null;
  /** Sizes marked as not available in the database (kept as they are when editing). */
  unavailable?: string[];
  /** Own price for this colour ("" = use the product's price). */
  price?: string;
};


export const SIZES = ["S", "M", "L", "XL", "XXL", "3XL"];

export function rank(s: string) {
  const i = SIZES.indexOf(s);
  if (i >= 0) return i;
  const n = Number(s);
  return Number.isNaN(n) ? 100 : 200 + n;
}

export function newColor(sizes: string[] = []): ColorRow {
  return { id: uid(), name: "", hex: "#111111", file: null, preview: null, sizes, custom: "", price: "" };
}

export default function ColorCard({
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

      <label className={`field ${isValidPriceInput(color.price) ? "" : "has-err"}`}>
        <span>نرخی تایبەت بۆ ئەم ڕەنگە (ئارەزوومەندانە)</span>
        <input
          type="number"
          inputMode="numeric"
          min="0"
          placeholder="بەتاڵ = نرخی گشتیی کاڵاکە"
          value={color.price ?? ""}
          aria-invalid={!isValidPriceInput(color.price)}
          onChange={(e) => onChange({ price: e.target.value })}
        />
        {isValidPriceInput(color.price) ? null : <small className="field-err">نرخ دروست نییە (تەنها ژمارە)</small>}
      </label>

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
              className={`size-chip ${color.sizes.includes(s) ? "on" : ""} ${color.unavailable?.includes(s) ? "sold" : ""}`}
              title={color.unavailable?.includes(s) ? "ئەم قەبارەیە لە دوکاندا وەک «نەماوە» دیارە" : undefined}
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
