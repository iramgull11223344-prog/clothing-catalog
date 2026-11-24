import Link from "next/link";
import Newsletter from "@/components/Newsletter";
import { WHATSAPP_NUMBER } from "@/lib/config";
import { toKuDigits } from "@/lib/format";

const FEATURES = [
  {
    title: "گەیاندنی خۆڕایی",
    text: "کاڵاکەت تا بەردەم ماڵەکەت دەگات.",
    icon: (
      <>
        <path d="M3 6.5h11v9H3z" />
        <path d="M14 9.5h3.6l3.4 3.4v2.6h-7" />
        <circle cx="7" cy="17.5" r="1.75" />
        <circle cx="17.5" cy="17.5" r="1.75" />
      </>
    ),
  },
  {
    title: "گەڕانەوەی ئاسان",
    text: "ئەگەر قەبارەکە گونجاو نەبوو، بە ئاسانی دەیگۆڕینەوە.",
    icon: (
      <>
        <path d="M4 12a8 8 0 1 0 2.4-5.7" />
        <path d="M4 4.5v4h4" />
      </>
    ),
  },
  {
    title: "پارەدانی پارێزراو",
    text: "پارەکە کاتی وەرگرتنی کاڵاکە دەدەیت.",
    icon: (
      <>
        <path d="M12 3.5l7 2.6v5.4c0 4.4-3 7.7-7 9-4-1.3-7-4.6-7-9V6.1z" />
        <path d="M9 12l2.2 2.2L15.5 10" />
      </>
    ),
  },
];

export default function Footer() {
  return (
    <footer className="ftr">
      <div className="container feats">
        {FEATURES.map((f) => (
          <div key={f.title} className="feat">
            <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              {f.icon}
            </svg>
            <h3>{f.title}</h3>
            <p>{f.text}</p>
          </div>
        ))}
      </div>

      <div className="nl">
        <div className="container nl-in">
          <div>
            <h2>ببە بە ئەندامی نووسراوەکەمان</h2>
            <p>یەکەم کەس بە کە کۆمەڵە نوێیەکان و داشکاندنەکان دەبینێت.</p>
          </div>
          <Newsletter />
        </div>
      </div>

      <div className="container ftr-bottom">
        <Link href="/" className="logo logo-sm" dir="ltr">
          ERAM STORE
        </Link>
        <nav className="ftr-links" aria-label="بەستەرەکان">
          <Link href="/shop">دوکان</Link>
          <Link href="/about">دەربارە</Link>
          <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer">
            واتسئاپ
          </a>
        </nav>
        <small>© {toKuDigits(new Date().getFullYear())} ERAM STORE</small>
      </div>
    </footer>
  );
}
