/* Stats.tsx: el momento de marca a mitad de pagina. Panel navy liso a sangre: el rotulo del
   deck y la respuesta a "what is Cosmos Pay?" a la izquierda, las cuatro cifras en 2x2 a la
   derecha. Every figure is a product fact from the code (data.ts: STAT_VALUES), never a
   volume, an uptime or a customer count. */
import { useT, fmt } from "@/lib/i18n/index";
import { STAT_VALUES, STAT_VARS } from "@/components/cosmos/marketing/data";

export function Stats() {
  const t = useT();
  const st = t.landing.stats;
  /* "Simple. Seguro. Sin limites." va una frase por linea, como en el deck: one text node with
     newlines (white-space: pre-line), so the sentences never run together in extracted text. */
  const title = st.title.split(". ").map((s: string) => (s.endsWith(".") ? s : s + ".")).join("\n");
  return (
    <section className="lp-panel stats" data-panel="navy">
      <div className="wrap">
        <div className="stats-grid reveal">
          <div className="stats-copy">
            <h2 className="stats-title">{title}</h2>
            {/* What Cosmos Pay is, in a few sentences a reader (or an AI answer) can quote alone. */}
            <div className="stats-about">
              <h3>{st.question}</h3>
              <p>{st.answer}</p>
            </div>
          </div>
          <div className="stats-figs">
            {STAT_VALUES.map((s, i) => (<div className="stat" key={i}><div className="num">{s.n}<span className="u">{s.u}</span></div><div className="lbl">{fmt(st.items[i], STAT_VARS)}</div></div>))}
          </div>
        </div>
      </div>
    </section>
  );
}
