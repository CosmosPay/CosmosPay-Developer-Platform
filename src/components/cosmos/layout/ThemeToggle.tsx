import type { Theme, SetTheme } from "../lib/types";
import { IcSun, IcMoon } from "../icons";

export function ThemeToggle({ theme, setTheme }: { theme: Theme; setTheme: SetTheme }) {
  return (
    <button className="theme-btn" aria-label="Toggle dark mode" title="Toggle theme" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
      {theme === "dark" ? <IcSun /> : <IcMoon />}
    </button>
  );
}
