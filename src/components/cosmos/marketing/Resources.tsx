/* Resources.tsx: /06 del deck, las cuatro piezas de contenido como lista
   editorial 2x2, sin miniaturas. */
import { IcChevSm } from "@/components/cosmos/shared";
import { useT } from "@/lib/i18n/index";

export function Resources() {
  const t = useT();
  const r = t.landing.resources;
  return (
    <section className="lp-panel resources" data-panel="white" id="resources">
      <div className="wrap">
        <div className="section-head reveal">
          <h2>{r.title}<span className="num" aria-hidden="true">/08</span></h2>
          <p>{r.lede}</p>
        </div>
        <div className="news-list">
          {r.items.map((n, i) => (
            <a className="news-item reveal" href="#" key={n.t} style={{ transitionDelay: `${(i % 2) * 0.06}s` }}>
              <div className="news-tag">{n.tag}</div>
              <h4>{n.t}</h4>
              <p>{n.d}</p>
              <span className="card-link">{r.readMore} <IcChevSm /></span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
