"use client";

import { useState, type FormEvent } from "react";
import { whatsappUrl } from "@/lib/whatsapp";

// There is no mailing-list backend, so the address is sent to the store on WhatsApp.
export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "err" | "done">("idle");

  function submit(e: FormEvent) {
    e.preventDefault();
    const v = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      setState("err");
      return;
    }
    const url = whatsappUrl(`سڵاو، دەمەوێت ببم بە ئەندامی نووسراوەکەتان لە eram-store.\nئیمەیڵ: ${v}`);
    const win = window.open(url, "_blank");
    if (win) win.opener = null;
    else window.location.href = url;
    setState("done");
    setEmail("");
  }

  return (
    <form className="nl-form" onSubmit={submit} noValidate>
      <div className="nl-row">
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          dir="ltr"
          placeholder="name@email.com"
          aria-label="ئیمەیڵ"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state !== "idle") setState("idle");
          }}
        />
        <button type="submit" className="btn-solid">
          ئابۆنەبوون
        </button>
      </div>
      <p className={`nl-note ${state === "err" ? "err" : ""}`} role="status">
        {state === "err"
          ? "ئیمەیڵەکە دروست نییە، دووبارە بینووسەرەوە."
          : state === "done"
            ? "سوپاس! ئیمەیڵەکەت لە واتسئاپدا ئامادەیە، تەنها بینێرە."
            : "ئیمەیڵەکەت لە ڕێگەی واتسئاپ بۆ دوکان دەنێردرێت."}
      </p>
    </form>
  );
}
