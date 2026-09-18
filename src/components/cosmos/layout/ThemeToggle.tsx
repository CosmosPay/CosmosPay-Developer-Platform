import type { Theme, SetTheme } from "@/components/cosmos/lib/types";
import { IcSun, IcMoon } from "@/components/cosmos/icons";
import { useMounted } from "@/components/cosmos/hooks";

/* El icono depende del tema guardado en localStorage, que el servidor no ve: si
   se pinta en el SSR, React encuentra la luna donde el cliente pone el sol y tira
   el subarbol entero del Nav en cada carga en oscuro. Se dibuja despues del mount,
   dejando el hueco reservado para que el nav no salte. */
export function ThemeToggle({ theme, setTheme }: { theme: Theme; setTheme: SetTheme }) {
  const mounted = useMounted();
  return (
    <button className="theme-btn" aria-label="Toggle dark mode" title="Toggle theme" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
      {mounted ? (theme === "dark" ? <IcSun /> : <IcMoon />) : <span className="ic-slot" aria-hidden="true" />}
    </button>
  );
}
