import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Syne, Vazirmatn } from "next/font/google";
import { STORE_NAME, STORE_TAGLINE } from "@/lib/config";
import "./globals.css";

// Kurdish (Sorani) text.
const body = Vazirmatn({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-body",
});

// Wide display face for the ERAM STORE wordmark and prices.
const display = Syne({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: `ERAM STORE | ${STORE_NAME}`,
  description: STORE_TAGLINE,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fafafa",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ckb" dir="rtl" className={`${body.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
