import Link from "next/link";
import type { NavCat } from "@/lib/catalog";

type Props = {
  back?: string;
  /** When given, the category pill tabs and the search box are shown. */
  cats?: NavCat[];
  /** "all" for the home page, or the id of the current category. */
  active?: string;
  q?: string;
};

export default function Header({ back, cats, active, q }: Props) {
  return (
    <header className="header">
      <div className="container header-top">
        {back ? (
          <Link href={back} className="back" aria-label="گەڕانەوە">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        ) : null}

        <Link href="/" className="logo" dir="ltr">
          ERAM STORE
        </Link>

        {cats ? (
          <form action="/search" method="get" role="search" className="search">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input type="search" name="q" defaultValue={q} placeholder="گەڕان بۆ کاڵا" aria-label="گەڕان بۆ کاڵا" enterKeyHint="search" />
          </form>
        ) : null}
      </div>

      {cats && cats.length > 0 ? (
        <nav className="container pills" aria-label="بەشەکان">
          <Link href="/" className={`pill ${active === "all" ? "on" : ""}`} aria-current={active === "all" ? "page" : undefined}>
            هەموو
          </Link>
          {cats.map((c) => (
            <Link
              key={c.id}
              href={`/c/${c.id}`}
              className={`pill ${active === c.id ? "on" : ""}`}
              aria-current={active === c.id ? "page" : undefined}
            >
              {c.name}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
