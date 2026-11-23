"use client";

import { useRef } from "react";
import type { ChangeEvent } from "react";

export default function PhotoPicker({
  preview,
  onPick,
  label = "وێنە",
}: {
  preview: string | null;
  onPick: (file: File) => void;
  label?: string;
}) {
  const cam = useRef<HTMLInputElement>(null);
  const gal = useRef<HTMLInputElement>(null);

  const handle = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onPick(f);
    e.target.value = "";
  };

  return (
    <div className="photo">
      <div className="photo-box" onClick={() => cam.current?.click()}>
        {preview ? <img src={preview} alt="" /> : <span>{label}</span>}
      </div>
      <div className="photo-btns">
        <button type="button" className="btn btn-sm" onClick={() => cam.current?.click()}>
          📷 کامێرا
        </button>
        <button type="button" className="btn btn-sm" onClick={() => gal.current?.click()}>
          🖼️ گاڵەری
        </button>
      </div>
      <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={handle} />
      <input ref={gal} type="file" accept="image/*" hidden onChange={handle} />
    </div>
  );
}
