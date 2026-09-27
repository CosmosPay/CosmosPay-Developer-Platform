/* Stats.tsx: el momento de marca a mitad de pagina. Panel navy liso a sangre,
   el rotulo del deck a la izquierda y las cuatro cifras en 2x2 a la derecha. */
import { useT } from "@/lib/i18n/index";
import { STAT_VALUES } from "./data";

export function Stats() {
  const t = useT();
  /* "Simple. Seguro. Sin limites." va una frase por linea, como en el deck */
  const lines = t.landing.stats.title.split(". ").map((s: string) => (s.endsWith(".") ? s : s + "."));
  return (
    <section className="lp-panel stats" data-panel="navy">
      <div className="wrap">
        <div className="stats-grid reveal">
          <h2 className="stats-title">
            {lines.map((l: string, i: number) => (<span key={i}>{l}{i < lines.length - 1 && <br />}</span>))}
          </h2>
          <div className="stats-figs">
            {STAT_VALUES.map((s, i) => (<div className="stat" key={i}><div className="num">{s.n}<span className="u">{s.u}</span></div><div className="lbl">{t.landing.stats.items[i]}</div></div>))}
          </div>
        </div>
      </div>
    </section>
  );
}
