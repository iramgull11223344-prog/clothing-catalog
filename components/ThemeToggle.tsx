"use client";

import { useEffect, useState } from "react";
import { THEME_COOKIE_MAX_AGE, THEME_KEY, type Theme } from "@/lib/theme";

function apply(theme: Theme, animate: boolean) {
  const root = document.documentElement;
  if (animate) {
    root.classList.add("theme-anim");
    window.setTimeout(() => root.classList.remove("theme-anim"), 400);
  }
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}

function save(theme: Theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {}
  document.cookie = `${THEME_KEY}=${theme}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; samesite=lax`;
  delete document.documentElement.dataset.themeAuto;
}

// The first theme is set before paint by the inline script in app/layout.tsx.
export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.dataset.theme === "dark");

    // Visitors who never chose follow their device setting live.
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;
    const onChange = (e: MediaQueryListEvent) => {
      if (document.documentElement.dataset.themeAuto !== "1") return;
      apply(e.matches ? "dark" : "light", true);
      setDark(e.matches);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function toggle() {
    const next: Theme = dark ? "light" : "dark";
    apply(next, true);
    save(next);
    setDark(!dark);
  }

  return (
    <button
      type="button"
      className="icon-btn theme-btn"
      onClick={toggle}
      aria-label="دۆخی تاریک"
      aria-pressed={dark}
      title={dark ? "دۆخی ڕووناک" : "دۆخی تاریک"}
    >
      {/* CSS shows the moon in light mode and the sun in dark mode. */}
      <svg className="ic-moon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
      </svg>
      <svg className="ic-sun" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
      </svg>
    </button>
  );
}
