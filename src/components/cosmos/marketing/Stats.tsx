/* Stats.jsx — stats band section. */
import { useT } from "@/lib/i18n/index";
import { STAT_VALUES } from "./data";

export function Stats() {
  const t = useT();
  return (
    <section className="stats"><div className="wrap"><div className="stats-band reveal">
      {STAT_VALUES.map((s, i) => (<div className="stat" key={i}><div className="num">{s.n}<span className="u">{s.u}</span></div><div className="lbl">{t.landing.stats.items[i]}</div></div>))}
    </div></div></section>
  );
}
