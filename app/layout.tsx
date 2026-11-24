import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Bodoni_Moda, Noto_Naskh_Arabic, Vazirmatn } from "next/font/google";
import { cookies } from "next/headers";
import { STORE_NAME, STORE_TAGLINE } from "@/lib/config";
import { THEME_KEY, THEME_SCRIPT, isTheme } from "@/lib/theme";
import CartRoot from "@/components/CartRoot";
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


export default async function RootLayout({ children }: { children: ReactNode }) {
  // A saved choice is rendered by the server too, so the HTML already has the right theme.
  const saved = (await cookies()).get(THEME_KEY)?.value;
  const theme = isTheme(saved) ? saved : "light";

  return (
    <html
      lang="ckb"
      dir="rtl"
      data-theme={theme}
      style={{ colorScheme: theme }}
      className={`${body.variable} ${serifKu.variable} ${serifLogo.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        {children}
        {/* Shopping bag: one instance for the whole site, kept across page changes. */}
        <CartRoot />
      </body>
    </html>
  );
}
