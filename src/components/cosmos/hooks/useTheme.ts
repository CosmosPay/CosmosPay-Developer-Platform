import { useState, useEffect, useRef } from "react";
import type { Theme } from "@/components/cosmos/lib/types";

const STORAGE_KEY = "cosmospay-theme";

/* Persisted light/dark theme, reflected onto <html data-theme>. Without a saved choice it
   starts from what the layout's pre-paint script already set (light on the site and the
   platform, the system theme on payment pages), so hydrating never flips it, and it is
   saved only once the visitor picks one; until then a payment page keeps following the
   system. */
export function useTheme() {
  const saved = useRef(false);
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
      saved.current = !!stored;
      return stored || (document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");
    } catch (e) { return "light"; }
  });
  const first = useRef(true);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    if (first.current && !saved.current) { first.current = false; return; }
    first.current = false;
    try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) {}
  }, [theme]);
  return [theme, setTheme] as const;
}
