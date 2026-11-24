// Shared by the server layout, the inline head script and the toggle.
export const THEME_KEY = "theme";
export type Theme = "light" | "dark";
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 2; // 2 years

export function isTheme(v: unknown): v is Theme {
  return v === "light" || v === "dark";
}

/**
 * Blocking script for <head>: runs before the first paint.
 * Order: localStorage -> cookie -> phone/computer setting (only if the visitor never chose).
 * Also re-writes both stores so they stay in sync and the cookie keeps being renewed.
 */
export const THEME_SCRIPT = `(function(){var K="${THEME_KEY}",d=document.documentElement,t=null;try{t=localStorage.getItem(K)}catch(e){}if(t!=="dark"&&t!=="light"){var m=document.cookie.match(/(?:^|; )${THEME_KEY}=(dark|light)/);t=m?m[1]:null}if(t==="dark"||t==="light"){try{localStorage.setItem(K,t)}catch(e){}document.cookie=K+"="+t+"; path=/; max-age=${THEME_COOKIE_MAX_AGE}; samesite=lax"}else{d.dataset.themeAuto="1";t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}d.dataset.theme=t;d.style.colorScheme=t})();`;
