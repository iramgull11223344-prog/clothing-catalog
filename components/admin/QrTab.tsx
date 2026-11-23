"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

export default function QrTab() {
  const [url, setUrl] = useState("");
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUrl(window.location.origin);
  }, []);

  function download() {
    const canvas = wrap.current?.querySelector("canvas");
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "catalog-qr.png";
    a.click();
  }

  return (
    <div className="box">
      <h3>QR Code ی کاتالۆگ</h3>
      <label className="field">
        <span>بەستەر</span>
        <input type="url" dir="ltr" value={url} onChange={(e) => setUrl(e.target.value)} />
      </label>
      <div className="qr-wrap" ref={wrap}>
        {url ? <QRCodeCanvas value={url} size={256} level="M" marginSize={2} /> : null}
      </div>
      <button className="btn btn-primary" onClick={download}>
        داگرتنی وێنەی QR
      </button>
    </div>
  );
}
