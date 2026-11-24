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
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ckb" dir="rtl" className={`${body.variable} ${serifKu.variable} ${serifLogo.variable}`}>
      <body>{children}</body>
    </html>
  );
}
