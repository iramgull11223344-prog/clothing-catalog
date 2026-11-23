import { createClient } from "@supabase/supabase-js";

// Public values (URL + publishable key, protected by RLS). The fallbacks keep
// `next build` from crashing with "supabaseUrl is required" when the host
// (e.g. Netlify) has no env vars set.
const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://aiyzbkmwiqppqtbbuvwg.supabase.co";
const key =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_oQ1vl2SGCW0f-kHFJpsNAw_V6okBjmZ";
const isBrowser = typeof window !== "undefined";

export const supabase = createClient(url, key, {
  auth: {
    persistSession: isBrowser,
    autoRefreshToken: isBrowser,
    detectSessionInUrl: false,
  },
});

export const BUCKET = "product-images";
