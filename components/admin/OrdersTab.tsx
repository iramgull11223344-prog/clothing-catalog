"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatPriceKu, toKuDigits } from "@/lib/format";
import { ORDER_STATUSES, type Order, type OrderStatus } from "@/lib/orders";
import { ORDERS_CHANGED, notifyOrdersChanged } from "@/lib/catalogEvents";

type Filter = "all" | OrderStatus;

/** Iraqi number → wa.me / tel format (0750… → 964750…). */
export function phoneDigits(phone: string): string {
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = "964" + d.slice(1);
  else if (d.length === 10 && d.startsWith("7")) d = "964" + d;
  return d;
}

function when(iso: string) {
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  const rel =
    mins < 1 ? "ئێستا" : mins < 60 ? `${toKuDigits(mins)} خولەک لەمەوبەر` : mins < 1440 ? `${toKuDigits(Math.round(mins / 60))} کاتژمێر لەمەوبەر` : `${toKuDigits(Math.round(mins / 1440))} ڕۆژ لەمەوبەر`;
  const abs = toKuDigits(
    `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
  );
  return { rel, abs };
}

/** Admin: every order, newest first, with customer details, items, totals and status. */
export default function OrdersTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(300);
    if (error) setErr(error.message);
    else {
      setErr(null);
      setOrders((data as Order[]) ?? []);
    }
    setLoading(false);
  }, []);

  // Fresh list on open, every minute, when coming back to the page, and after changes.
  useEffect(() => {
    load();
    const t = window.setInterval(load, 60000);
    const vis = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", vis);
    window.addEventListener(ORDERS_CHANGED, load);
    return () => {
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", vis);
      window.removeEventListener(ORDERS_CHANGED, load);
    };
  }, [load]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: orders.length, new: 0, contacted: 0, delivered: 0, cancelled: 0 };
    for (const o of orders) c[o.status]++;
    return c;
  }, [orders]);
  const shown = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  async function setStatus(o: Order, status: OrderStatus) {
    if (o.status === status) return;
    setBusy(o.id);
    const prev = o.status;
    setOrders((list) => list.map((x) => (x.id === o.id ? { ...x, status } : x))); // instant
    const { error } = await supabase.from("orders").update({ status }).eq("id", o.id);
    setBusy(null);
    if (error) {
      setOrders((list) => list.map((x) => (x.id === o.id ? { ...x, status: prev } : x)));
      setErr(error.message);
      return;
    }
    notifyOrdersChanged();
  }

  async function remove(o: Order) {
    if (!window.confirm(`داواکاری #${o.order_no} (${o.customer_name}) بە یەکجاری دەسڕدرێتەوە. دڵنیایت؟`)) return;
    setBusy(o.id);
    const { error } = await supabase.from("orders").delete().eq("id", o.id);
    setBusy(null);
    if (error) return setErr(error.message);
    setOrders((list) => list.filter((x) => x.id !== o.id));
    notifyOrdersChanged();
  }

  async function copy(o: Order) {
    try {
      await navigator.clipboard.writeText(o.phone);
      setCopied(o.id);
      window.setTimeout(() => setCopied((c) => (c === o.id ? null : c)), 1600);
    } catch {
      setErr("کۆپیکردن سەرکەوتوو نەبوو؛ ژمارەکە دەستی هەڵبژێرە.");
    }
  }

  if (loading) return <div className="empty">...</div>;

  return (
    <div className="orders">
      <div className="ord-filters" role="group" aria-label="دۆخی داواکارییەکان">
        {([{ id: "all", label: "هەموو" }, ...ORDER_STATUSES] as { id: Filter; label: string }[]).map((f) => (
          <button key={f.id} type="button" className={`ord-chip ${filter === f.id ? "on" : ""} st-${f.id}`} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.label} <span>{toKuDigits(counts[f.id])}</span>
          </button>
        ))}
      </div>

      {err ? (
        <div className="toast err" role="alert">
          {err}{" "}
          <button type="button" className="link link-btn" onClick={load}>
            دووبارە هەوڵبدەرەوە
          </button>
        </div>
      ) : null}

      {shown.length === 0 ? (
        <div className="empty">{orders.length ? "هیچ داواکارییەک بەم دۆخە نییە." : "هێشتا هیچ داواکارییەک نەگەیشتووە."}</div>
      ) : null}

      {shown.map((o) => {
        const t = when(o.created_at);
        const pieces = o.items.reduce((n, i) => n + i.qty, 0);
        return (
          <article key={o.id} className={`ord box st-${o.status}`}>
            <header className="ord-head">
              <div>
                <b className="ord-no" dir="ltr">
                  #{toKuDigits(o.order_no)}
                </b>
                <span className="ord-time" title={t.abs}>
                  {t.rel} · {t.abs}
                </span>
              </div>
              <span className={`ord-badge st-${o.status}`}>{ORDER_STATUSES.find((s) => s.id === o.status)?.label}</span>
            </header>

            <section className="ord-customer">
              <div className="ord-name">{o.customer_name}</div>
              <div className="ord-phone">
                <span dir="ltr">{o.phone}</span>
                <a className="btn btn-sm btn-ink" href={`tel:+${phoneDigits(o.phone)}`}>
                  پەیوەندی
                </a>
                <a className="btn btn-sm" href={`https://wa.me/${phoneDigits(o.phone)}`} target="_blank" rel="noopener noreferrer">
                  واتسئاپ
                </a>
                <button type="button" className="btn btn-sm" onClick={() => copy(o)}>
                  {copied === o.id ? "کۆپی کرا ✓" : "کۆپیکردن"}
                </button>
              </div>
              <div className="ord-addr">{o.address}</div>
              {o.note ? <div className="ord-note">تێبینی: {o.note}</div> : null}
            </section>

            <ul className="ord-items">
              {o.items.map((i, k) => (
                <li key={k}>
                  <a className="cart-th" href={`/p/${i.product_id}`} target="_blank" rel="noopener noreferrer">
                    {i.image ? <img src={i.image} alt="" /> : null}
                  </a>
                  <div className="ord-item-info">
                    <b>{i.name}</b>
                    <span className="cart-opts">
                      {i.color ? (
                        <span>
                          {i.color_hex ? <span className="dot" style={{ background: i.color_hex }} /> : null}
                          {i.color}
                        </span>
                      ) : null}
                      {i.size ? <span>قەبارە {i.size}</span> : null}
                    </span>
                    <span className="ord-line">
                      {toKuDigits(i.qty)} × {formatPriceKu(i.unit_price)} = <b>{formatPriceKu(i.line_total)}</b>
                    </span>
                  </div>
                </li>
              ))}
            </ul>

            <div className="ord-total">
              <span>کۆی گشتی ({toKuDigits(pieces)} پارچە)</span>
              <b>{formatPriceKu(o.total)}</b>
            </div>

            <footer className="ord-actions">
              <div className="ord-status" role="group" aria-label="گۆڕینی دۆخ">
                {ORDER_STATUSES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`ord-st st-${s.id} ${o.status === s.id ? "on" : ""}`}
                    aria-pressed={o.status === s.id}
                    disabled={busy === o.id}
                    onClick={() => setStatus(o, s.id)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <button type="button" className="btn btn-sm btn-danger" disabled={busy === o.id} onClick={() => remove(o)}>
                سڕینەوە
              </button>
            </footer>
          </article>
        );
      })}
    </div>
  );
}
