"use client";

import { useEffect, useState } from "react";

// The initial theme is set before paint by the inline script in app/layout.tsx.
export const THEME_KEY = "theme";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.dataset.theme === "dark");
  }, []);

  function toggle() {
    const next = dark ? "light" : "dark";
    const root = document.documentElement;
    root.classList.add("theme-anim");
    root.dataset.theme = next;
    root.style.colorScheme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}
    setDark(!dark);
    window.setTimeout(() => root.classList.remove("theme-anim"), 400);
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
