import type { Theme, SetTheme } from "@/components/cosmos/lib/types";
import { IcSun, IcMoon } from "@/components/cosmos/icons";

export function ThemeToggle({ theme, setTheme }: { theme: Theme; setTheme: SetTheme }) {
  return (
    <button className="theme-btn" aria-label="Toggle dark mode" title="Toggle theme" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
      {theme === "dark" ? <IcSun /> : <IcMoon />}
    </button>
  );
}
