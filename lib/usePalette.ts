"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PRESET_COLORS, colorKey, readColorCache, writeColorCache, type ColorOption } from "@/lib/colors";

/** Built-in colours + the admin's saved colours (from Supabase, cached locally). */
export function usePalette() {
  const [customColors, setCustomColors] = useState<ColorOption[]>(() =>
    typeof window === "undefined" ? [] : readColorCache()
  );

  useEffect(() => {
    supabase
      .from("custom_colors")
      .select("id,name,hex")
      .order("created_at", { ascending: false })
      .then(({ data, error }: any) => {
        if (error || !data) return; // keep the cached list on a network hiccup
        const list: ColorOption[] = data.map((c: any) => ({ id: c.id, name: c.name, hex: c.hex, custom: true }));
        setCustomColors(list);
        writeColorCache(list);
      });
  }, []);

  const palette = useMemo(() => {
    const seen = new Set(PRESET_COLORS.map((c) => colorKey(c.name)));
    return [...customColors.filter((c) => !seen.has(colorKey(c.name))), ...PRESET_COLORS];
  }, [customColors]);

  const addCustomColor = useCallback((c: ColorOption) => {
    setCustomColors((list) => {
      const next = [c, ...list.filter((x) => x.id !== c.id)];
      writeColorCache(next);
      return next;
    });
  }, []);

  return { palette, addCustomColor };
}
