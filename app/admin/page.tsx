"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import Header from "@/components/Header";
import ProductForm from "@/components/admin/ProductForm";
import ProductList from "@/components/admin/ProductList";
import CatalogManager from "@/components/admin/CatalogManager";
import QrTab from "@/components/admin/QrTab";
import { supabase } from "@/lib/supabase";

type Tab = "new" | "products" | "catalog" | "qr";

const TABS: { id: Tab; label: string }[] = [
  { id: "new", label: "کاڵای نوێ" },
  { id: "products", label: "کاڵاکان" },
  { id: "catalog", label: "بەشەکان" },
  { id: "qr", label: "QR" },
];

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setErr("ئیمەیڵ یان وشەی نهێنی هەڵەیە");
    setBusy(false);
  }

  return (
    <form className="login box" onSubmit={submit}>
      <h1>چوونەژوورەوەی ئەدمین</h1>
      {err ? <div className="toast err">{err}</div> : null}
      <label className="field">
        <span>ئیمەیڵ</span>
        <input type="email" dir="ltr" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="field">
        <span>وشەی نهێنی</span>
        <input
          type="password"
          dir="ltr"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <button className="btn btn-primary" disabled={busy}>
        {busy ? "..." : "چوونەژوورەوە"}
      </button>
    </form>
  );
}

export default function AdminPage() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("new");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setIsAdmin(null);
    if (!session) return;
    supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [session]);

  const logout = () => supabase.auth.signOut();

  return (
    <>
      <Header back="/" />
      <main className="container admin">
        {session === undefined ? (
          <div className="empty">...</div>
        ) : !session ? (
          <Login />
        ) : isAdmin === null ? (
          <div className="empty">...</div>
        ) : !isAdmin ? (
          <div className="login box">
            <h1>ئەم ئەکاونتە ئەدمین نییە</h1>
            <p style={{ color: "var(--muted)", marginBottom: 12 }}>ئەم ID ـە بخە ناو خشتەی admins:</p>
            <div className="mono">{session.user.id}</div>
            <button className="btn" style={{ marginTop: 14 }} onClick={logout}>
              چوونەدەرەوە
            </button>
          </div>
        ) : (
          <>
            <div className="tabs">
              {TABS.map((t) => (
                <button key={t.id} className={`tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
                  {t.label}
                </button>
              ))}
              <button className="tab" onClick={logout}>
                چوونەدەرەوە
              </button>
            </div>
            {tab === "new" ? <ProductForm /> : null}
            {tab === "products" ? <ProductList /> : null}
            {tab === "catalog" ? <CatalogManager /> : null}
            {tab === "qr" ? <QrTab /> : null}
          </>
        )}
      </main>
    </>
  );
}
