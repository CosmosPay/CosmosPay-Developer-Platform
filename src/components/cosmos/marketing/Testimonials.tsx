/* Testimonials.tsx: /05 del deck, tres columnas de texto sin tarjetas. Es el
   descanso visual antes de recursos y del cierre. */
import { useT } from "@/lib/i18n/index";
import { QUOTE_META } from "./data";

export function Testimonials() {
  const t = useT();
  const tt = t.landing.testimonials;
  return (
    <section className="lp-panel testimonials" data-panel="black">
      <div className="wrap">
        <div className="section-head reveal">
          <h2>{tt.title}<span className="num" aria-hidden="true">/05</span></h2>
        </div>
        <div className="q-grid">
          {QUOTE_META.map((q, i) => {
            const item = tt.items[q.av];
            return (
              <div className="quote reveal" key={q.av} style={{ transitionDelay: `${i * 0.07}s` }}>
                <div className="qmark" aria-hidden="true">“</div>
                <p>{item.q}</p>
                <div className="qp"><div className="qav">{q.av}</div><div className="qn"><b>{q.n}</b><span>{item.r}</span></div></div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
