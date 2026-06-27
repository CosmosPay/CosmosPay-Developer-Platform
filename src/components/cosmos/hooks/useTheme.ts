import { useState, useEffect } from "react";
import type { Theme } from "@/components/cosmos/lib/types";

/* Persisted light/dark theme, reflected onto <html data-theme>. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    try { return (localStorage.getItem("cosmospay-theme") as Theme) || "light"; } catch (e) { return "light"; }
  });
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("cosmospay-theme", theme); } catch (e) {}
  }, [theme]);
  return [theme, setTheme] as const;
}
