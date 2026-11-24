"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

type Tab = { id: string; name: string };

type Props = {
  tabs: Tab[];
  active: string;
  onSelect: (id: string) => void;
  label?: string;
};

// Geometry of the glowing line (px, inside the SVG).
const H = 62; // bar height
const BASE = 54; // y of the flat line
const TOP = 9; // y of the wave crest
const PAD = 18; // space between the label and the wave's sides
const FOOT = 18; // length of the smooth "shoulder" where the wave leaves the line

/**
 * One long path: flat line + one wave in the middle. The path is twice the track
 * width and only its transform changes, so the wave glides (GPU, 60fps) and the
 * flat line always covers the whole track.
 */
function wavePath(width: number, half: number) {
  const c = width; // wave centre in path coordinates
  const a = half + PAD;
  return [
    `M0 ${BASE}`,
    `L${c - a - FOOT} ${BASE}`,
    `C${c - a + 2} ${BASE} ${c - a - 4} ${TOP} ${c} ${TOP}`,
    `C${c + a + 4} ${TOP} ${c + a - 2} ${BASE} ${c + a + FOOT} ${BASE}`,
    `L${width * 2} ${BASE}`,
  ].join(" ");
}

export default function CategoryTabs({ tabs, active, onSelect, label = "بەشەکان" }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef(new Map<string, HTMLButtonElement>());
  const [geo, setGeo] = useState<{ width: number; x: number; half: number } | null>(null);
  const [ready, setReady] = useState(false);

  const measure = useCallback(() => {
    const track = trackRef.current;
    const btn = btnRefs.current.get(active);
    if (!track || !btn) return;
    const lbl = btn.querySelector("span");
    const half = (lbl ? lbl.getBoundingClientRect().width : btn.offsetWidth) / 2;
    setGeo({ width: track.scrollWidth, x: btn.offsetLeft + btn.offsetWidth / 2, half });
  }, [active]);

  // Measure before paint on every change, and again when sizes or fonts change.
  useLayoutEffect(() => {
    measure();
    const track = trackRef.current;
    if (!track) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(track);
    document.fonts?.ready.then(() => measure());
    return () => ro.disconnect();
  }, [measure]);

  // Enable the glide only after the first placement (no slide-in on load).
  useLayoutEffect(() => {
    if (geo && !ready) {
      const id = requestAnimationFrame(() => setReady(true));
      return () => cancelAnimationFrame(id);
    }
  }, [geo, ready]);

  function pick(id: string) {
    onSelect(id);
    // Keep the chosen tab visible when the bar scrolls on small screens.
    btnRefs.current.get(id)?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }

  const all = [{ id: "all", name: "هەموو" }, ...tabs];

  return (
    <div className="ltabs" role="group" aria-label={label}>
      <div className="ltabs-scroll">
        <div className="ltabs-track" ref={trackRef}>
          {all.map((t) => (
            <button
              key={t.id}
              ref={(el) => {
                if (el) btnRefs.current.set(t.id, el);
                else btnRefs.current.delete(t.id);
              }}
              type="button"
              className={`ltab ${active === t.id ? "on" : ""}`}
              aria-pressed={active === t.id}
              onClick={() => pick(t.id)}
            >
              <span>{t.name}</span>
            </button>
          ))}

          {geo ? (
            <svg
              className={`ltabs-wave ${ready ? "glide" : ""}`}
              width={geo.width * 2}
              height={H}
              viewBox={`0 0 ${geo.width * 2} ${H}`}
              style={{ transform: `translate3d(${geo.x - geo.width}px,0,0)` }}
              aria-hidden="true"
              focusable="false"
            >
              <path className="ltabs-line" d={wavePath(geo.width, geo.half)} />
              <circle className="ltabs-dot" cx={geo.width} cy={TOP} r="3.2" />
            </svg>
          ) : null}
        </div>
      </div>
    </div>
  );
}
