"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { readDraft, removeDraft, writeDraft } from "@/lib/draft";

/**
 * useState that is saved to localStorage on every change and restored on reload.
 * Admin forms only render in the browser (after the login check), so reading
 * localStorage in the initialiser is safe and avoids any flash of an empty form.
 */
export function useDraft<T>(key: string, initial: T) {
  const initialRef = useRef(initial);
  const [value, setValue] = useState<T>(() => (typeof window === "undefined" ? initial : readDraft(key, initial)));

  useEffect(() => {
    writeDraft(key, value);
  }, [key, value]);

  const clear = useCallback(() => {
    removeDraft(key);
    setValue(initialRef.current);
  }, [key]);

  return [value, setValue, clear] as const;
}
