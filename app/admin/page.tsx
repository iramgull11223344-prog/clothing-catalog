"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import Header from "@/components/Header";
import ProductForm from "@/components/admin/ProductForm";
import ProductList from "@/components/admin/ProductList";
import CatalogManager from "@/components/admin/CatalogManager";
import QrTab from "@/components/admin/QrTab";
import HeroSettingsTab from "@/components/admin/HeroSettingsTab";
import { supabase } from "@/lib/supabase";
import { ADMIN_TAB_KEY, loadScroll, saveScroll } from "@/lib/draft";

type Tab = "new" | "products" | "catalog" | "hero" | "qr";

const TABS: { id: Tab; label: string }[] = [
  { id: "new", label: "کاڵای نوێ" },
  { id: "products", label: "کاڵاکان" },
  { id: "catalog", label: "بەشەکان" },
  { id: "hero", label: "پێشەکی" },
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

// Admin status is cached per user for this browser tab, so a session refresh or a reload
// never swaps the panel for a loading screen (which used to wipe every form).
const adminCacheKey = (uid: string) => `admin-ok:${uid}`;
function readAdminCache(uid: string): boolean | null {
  try {
    const v = sessionStorage.getItem(adminCacheKey(uid));
    return v === "1" ? true : v === "0" ? false : null;
  } catch {
    return null;
  }
}
function writeAdminCache(uid: string, ok: boolean) {
  try {
    sessionStorage.setItem(adminCacheKey(uid), ok ? "1" : "0");
  } catch {}
}

function readTab(): Tab {
  try {
    const t = sessionStorage.getItem(ADMIN_TAB_KEY);
    if (t && TABS.some((x) => x.id === t)) return t as Tab;
  } catch {}
  return "new";
}

export default function AdminPage() {
  // Only the user id matters. Supabase emits a new session object on every token refresh
  // (e.g. when the page regains focus after the camera); reacting to that object used to
  // unmount the whole panel. A string id that did not change does not re-render anything.
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checkFailed, setCheckFailed] = useState(false);
  const [tab, setTab] = useState<Tab>("new");
  const [visited, setVisited] = useState<Set<Tab>>(() => new Set<Tab>());
  const tabRef = useRef<Tab>("new");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const checkAdmin = useCallback((uid: string) => {
    setCheckFailed(false);
    supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", uid)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          // Keep a cached answer on a network hiccup; otherwise offer a retry.
          if (readAdminCache(uid) === null) setCheckFailed(true);
          return;
        }
        writeAdminCache(uid, !!data);
        setIsAdmin(!!data);
      });
  }, []);

  useEffect(() => {
    if (!userId) {
      setIsAdmin(null);
      return;
    }
    const cached = readAdminCache(userId);
    setIsAdmin(cached);
    checkAdmin(userId);
  }, [userId, checkAdmin]);

  // Restore the last admin tab (sessionStorage) once.
  useEffect(() => {
    const t = readTab();
    tabRef.current = t;
    setTab(t);
    setVisited(new Set<Tab>([t]));
  }, []);

  const ready = !!userId && isAdmin === true;

  // ---- scroll: one position per tab, restored after reloads and tab switches
  const restoring = useRef(false);
  useEffect(() => {
    if (!ready) return;
    const prev = history.scrollRestoration;
    history.scrollRestoration = "manual";
    let raf = 0;
    const onScroll = () => {
      if (restoring.current) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => saveScroll(window.scrollY, tabRef.current));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      history.scrollRestoration = prev;
    };
  }, [ready]);

  useLayoutEffect(() => {
    if (!ready) return;
    const target = loadScroll(tab) ?? 0;
    restoring.current = true;
    let raf = 0;
    const started = performance.now();
    const stop = () => {
      cancelAnimationFrame(raf);
      restoring.current = false;
    };
    // Content may still be growing (draft photos, lists from Supabase): retry for up to 2s.
    const tick = () => {
      window.scrollTo(0, target);
      if (Math.abs(window.scrollY - target) <= 2 || performance.now() - started > 2000) return stop();
      raf = requestAnimationFrame(tick);
    };
    tick();
    window.addEventListener("touchstart", stop, { passive: true, once: true });
    window.addEventListener("wheel", stop, { passive: true, once: true });
    return () => {
      stop();
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("wheel", stop);
    };
  }, [tab, ready]);

  function switchTab(t: Tab) {
    if (t === tab) return;
    saveScroll(window.scrollY, tab);
    tabRef.current = t;
    try {
      sessionStorage.setItem(ADMIN_TAB_KEY, t);
    } catch {}
    setVisited((v) => (v.has(t) ? v : new Set(v).add(t)));
    setTab(t);
  }

  const logout = () => {
    if (userId) {
      try {
        sessionStorage.removeItem(adminCacheKey(userId));
      } catch {}
    }
    supabase.auth.signOut();
  };

  const PANELS: Record<Tab, () => ReactNode> = {
    new: () => <ProductForm />,
    products: () => <ProductList />,
    catalog: () => <CatalogManager />,
    hero: () => <HeroSettingsTab />,
    qr: () => <QrTab />,
  };

  return (
    <>
      <Header back="/" />
      <main className="container admin">
        {userId === undefined ? (
          <div className="empty">...</div>
        ) : !userId ? (
          <Login />
        ) : isAdmin === null ? (
          checkFailed ? (
            <div className="empty">
              پەیوەندی بە سێرڤەرەوە نەکرا.{" "}
              <button type="button" className="link link-btn" onClick={() => checkAdmin(userId)}>
                دووبارە هەوڵبدەرەوە
              </button>
            </div>
          ) : (
            <div className="empty">...</div>
          )
        ) : !isAdmin ? (
          <div className="login box">
            <h1>ئەم ئەکاونتە ئەدمین نییە</h1>
            <p style={{ color: "var(--muted)", marginBottom: 12 }}>ئەم ID ـە بخە ناو خشتەی admins:</p>
            <div className="mono">{userId}</div>
            <button className="btn" style={{ marginTop: 14 }} onClick={logout}>
              چوونەدەرەوە
            </button>
          </div>
        ) : (
          <>
            <div className="tabs" role="tablist">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  className={`tab ${tab === t.id ? "active" : ""}`}
                  onClick={() => switchTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
              <button type="button" className="tab" onClick={logout}>
                چوونەدەرەوە
              </button>
            </div>
            {/* Visited tabs stay mounted (just hidden), so switching tabs never loses typing. */}
            {TABS.map((t) =>
              visited.has(t.id) ? (
                <div key={t.id} role="tabpanel" hidden={tab !== t.id}>
                  {PANELS[t.id]()}
                </div>
              ) : null
            )}
          </>
        )}
      </main>
    </>
  );
}
