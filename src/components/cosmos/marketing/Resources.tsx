/* Resources.tsx: /07 del deck, las cuatro piezas de contenido como lista editorial 2x2, sin
   miniaturas. Each one is a page of the public documentation that exists today; the targets
   live here by position (the catalogs carry the labels, in the same order in every language). */
import { IcChevSm, DOCS } from "@/components/cosmos/shared";
import { useT } from "@/lib/i18n/index";
import { RESOURCE_DOCS } from "@/components/cosmos/marketing/data";

const RESOURCE_HREFS = RESOURCE_DOCS.map((path) => `${DOCS}${path}`);

export function Resources() {
  const t = useT();
  const r = t.landing.resources;
  return (
    <section className="lp-panel resources" data-panel="white" id="resources">
      <div className="wrap">
        <div className="section-head reveal">
          <h2 data-num="/07">{r.title}</h2>
          <p>{r.lede}</p>
        </div>
        <div className="news-list">
          {r.items.map((n, i) => (
            <a className="news-item reveal" key={n.t} href={RESOURCE_HREFS[i]} style={{ transitionDelay: `${(i % 2) * 0.06}s` }}>
              <span className="news-tag">{n.tag}</span>
              <h3>{n.t}</h3>
              <p>{n.d}</p>
              <span className="card-link">{r.readMore} <IcChevSm /></span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
