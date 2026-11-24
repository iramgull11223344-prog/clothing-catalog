"use client";

import { memo, useCallback, useLayoutEffect, useRef, useState } from "react";

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

// Same curve as the CSS transform transition: cubic-bezier(0.22, 1, 0.36, 1).
const GLIDE_MS = 450;
function bezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    let t = x;
    for (let i = 0; i < 6; i++) {
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= (sx(t) - x) / d;
    }
    return sy(Math.min(1, Math.max(0, t)));
  };
}
const ease = bezier(0.22, 1, 0.36, 1);

function CategoryTabs({ tabs, active, onSelect, label = "بەشەکان" }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const drawn = useRef<{ width: number; half: number } | null>(null);
  const tween = useRef(0);
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

  // Draw the wave. Its position glides with the CSS transform; its width (labels differ)
  // morphs over the same 0.45s with the same curve, so nothing jumps.
  useLayoutEffect(() => {
    const path = pathRef.current;
    if (!geo || !path) return;
    cancelAnimationFrame(tween.current);
    const from = drawn.current;
    // (The track width can change by a few px when the active label turns bold; that is
    // fine to apply at once — only the arch width needs to morph.)
    if (!ready || !from || Math.abs(from.half - geo.half) < 0.5) {
      path.setAttribute("d", wavePath(geo.width, geo.half));
      drawn.current = { width: geo.width, half: geo.half };
      return;
    }
    const start = performance.now();
    const h0 = from.half;
    const h1 = geo.half;
    const step = (now: number) => {
      const k = ease(Math.min(1, (now - start) / GLIDE_MS));
      const h = h0 + (h1 - h0) * k;
      path.setAttribute("d", wavePath(geo.width, h));
      drawn.current = { width: geo.width, half: h };
      if (k < 1) tween.current = requestAnimationFrame(step);
    };
    tween.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(tween.current);
  }, [geo, ready]);

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
  // Note: this component stays mounted while tabs change; only the transform value and the
  // path's width are updated, so the wave visibly travels from the old tab to the new one.

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
              <path ref={pathRef} className="ltabs-line" />
              <circle className="ltabs-dot" cx={geo.width} cy={TOP} r="3.2" />
            </svg>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// Memoised: re-renders only when the tab list or the active tab changes, not on every grid update.
export default memo(CategoryTabs);
