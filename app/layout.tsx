import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Bodoni_Moda, Noto_Naskh_Arabic, Vazirmatn } from "next/font/google";
import { STORE_NAME, STORE_TAGLINE } from "@/lib/config";
import "./globals.css";

// Kurdish (Sorani) body text.
const body = Vazirmatn({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-body",
});

// Serif for Kurdish headlines.
const serifKu = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  weight: ["500", "600", "700"],
  display: "swap",
  variable: "--font-serif-ku",
});

// Serif for the ERAM STORE wordmark.
const serifLogo = Bodoni_Moda({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-logo",
});

export const metadata: Metadata = {
  title: `ERAM STORE | ${STORE_NAME}`,
  description: STORE_TAGLINE,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

// Runs before paint: saved choice (localStorage "theme"), otherwise the system setting.
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("theme");if(t!=="dark"&&t!=="light"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}var d=document.documentElement;d.dataset.theme=t;d.style.colorScheme=t}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="ckb"
      dir="rtl"
      data-theme="light"
      className={`${body.variable} ${serifKu.variable} ${serifLogo.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
