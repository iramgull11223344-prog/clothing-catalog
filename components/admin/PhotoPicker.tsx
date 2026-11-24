"use client";

import { useRef } from "react";
import type { ChangeEvent } from "react";
import { saveScroll } from "@/lib/draft";

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

  // Phones often reload the page while the camera/gallery is open, so remember where we were.
  const open = (input: HTMLInputElement | null) => {
    saveScroll();
    input?.click();
  };

  const handle = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onPick(f);
    e.target.value = "";
  };

  return (
    <div className="photo">
      <div className="photo-box" onClick={() => open(cam.current)}>
        {preview ? <img src={preview} alt="" /> : <span>{label}</span>}
      </div>
      <div className="photo-btns">
        <button type="button" className="btn btn-sm" onClick={() => open(cam.current)}>
          📷 کامێرا
        </button>
        <button type="button" className="btn btn-sm" onClick={() => open(gal.current)}>
          🖼️ گاڵەری
        </button>
      </div>
      <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={handle} />
      <input ref={gal} type="file" accept="image/*" hidden onChange={handle} />
    </div>
  );
}
