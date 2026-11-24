import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { WHATSAPP_NUMBER } from "@/lib/config";
import { toKuDigits } from "@/lib/format";

export const metadata = { title: "دەربارە | ERAM STORE" };

const STEPS = [
  { t: "کاڵاکەت هەڵبژێرە", d: "لە دوکان کاڵایەک بدۆزەرەوە و ڕەنگ و قەبارەکەی دیاری بکە." },
  { t: "زانیارییەکانت بنووسە", d: "ناو، ژمارەی مۆبایل و ناونیشانەکەت پڕ بکەرەوە." },
  { t: "داواکارییەکەت بنێرە", d: "داواکارییەکەت ڕاستەوخۆ لە ماڵپەڕەکەوە دەگاتە دوکان و پەیوەندیت پێوە دەکەین." },
];

export default function AboutPage() {
  return (
    <>
      <Header active="about" />
      <main className="container page about">
        <div className="page-head">
          <p className="eyebrow">دەربارە</p>
          <h1>ERAM STORE</h1>
        </div>
        <p className="about-lead">
          دوکانێکی جلوبەرگی مۆدێرنین. جلی بنەڕەتی و شێوازی شەقام بە ڕەنگ و قەبارەی جیاواز، بۆ ژیانی ڕۆژانە.
        </p>

        <h2 className="sec-title-sm">چۆن داوا بکەیت</h2>
        <ol className="steps">
          {STEPS.map((s, i) => (
            <li key={s.t}>
              <span className="step-n">{toKuDigits(i + 1)}</span>
              <h3>{s.t}</h3>
              <p>{s.d}</p>
            </li>
          ))}
        </ol>

        <div className="hero-btns">
          <Link href="/shop" className="btn-solid">
            بچۆ بۆ دوکان
          </Link>
          <a href={`https://wa.me/${WHATSAPP_NUMBER}`} className="btn-line" target="_blank" rel="noopener noreferrer">
            پەیوەندی لە واتسئاپ
          </a>
        </div>
      </main>
      <Footer />
    </>
  );
}
