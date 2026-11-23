import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Noto_Sans_Arabic } from "next/font/google";
import { STORE_NAME, STORE_TAGLINE } from "@/lib/config";
import "./globals.css";

const font = Noto_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: STORE_NAME,
  description: STORE_TAGLINE,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#faf7f2",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ckb" dir="rtl">
      <body className={font.className}>{children}</body>
    </html>
  );
}
