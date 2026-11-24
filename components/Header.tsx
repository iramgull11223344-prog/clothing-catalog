import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

type NavKey = "home" | "shop" | "collection" | "about";

type Props = {
  /** Kept for compatibility with existing callers (e.g. /admin); not shown. */
  back?: string;
  active?: NavKey;
};

const NAV: { key: NavKey; href: string; label: string }[] = [
  { key: "home", href: "/", label: "ماڵەوە" },
  { key: "shop", href: "/shop", label: "دوکان" },
  { key: "collection", href: "/#collection", label: "کۆمەڵە" },
  { key: "about", href: "/about", label: "دەربارە" },
];

export default function Header({ active }: Props) {
  return (
    <header className="hdr">
      {/* Physical layout: logo left, menu centre, icons right. */}
      <div className="container hdr-row" dir="ltr">
        <Link href="/" className="logo">
          ERAM STORE
        </Link>

        <nav className="nav" dir="rtl" aria-label="مێنۆی سەرەکی">
          {NAV.map((n) => (
            <Link key={n.key} href={n.href} className={n.key === active ? "on" : ""} aria-current={n.key === active ? "page" : undefined}>
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="hdr-icons">
          <ThemeToggle />
          <Link href="/search" className="icon-btn" aria-label="گەڕان">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="6.5" />
              <path d="M20 20l-4.2-4.2" strokeLinecap="round" />
            </svg>
          </Link>
          <Link href="/admin" className="icon-btn" aria-label="هەژمار">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="8.5" r="3.75" />
              <path d="M4.75 20c.9-3.6 3.8-5.5 7.25-5.5s6.35 1.9 7.25 5.5" strokeLinecap="round" />
            </svg>
          </Link>
        </div>
      </div>
    </header>
  );
}
