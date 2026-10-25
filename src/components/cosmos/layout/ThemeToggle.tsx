import type { Theme, SetTheme } from "@/components/cosmos/lib/types";
import { useT } from "@/lib/i18n/index";
import { IcSun, IcMoon } from "@/components/cosmos/icons";
import { useMounted } from "@/components/cosmos/hooks";

/* El icono depende del tema guardado en localStorage, que el servidor no ve: si
   se pinta en el SSR, React encuentra la luna donde el cliente pone el sol y tira
   el subarbol entero del Nav en cada carga en oscuro. Se dibuja despues del mount,
   dejando el hueco reservado para que el nav no salte.
   A toggle: its name is the setting ("Dark mode"), aria-pressed says whether it is on. */
export function ThemeToggle({ theme, setTheme }: { theme: Theme; setTheme: SetTheme }) {
  const mounted = useMounted();
  const t = useT();
  return (
    <button type="button" className="theme-btn" aria-label={t.nav.theme} aria-pressed={mounted ? theme === "dark" : undefined} title={t.nav.theme} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
      {mounted ? (theme === "dark" ? <IcSun /> : <IcMoon />) : <span className="ic-slot" aria-hidden="true" />}
    </button>
  );
}
