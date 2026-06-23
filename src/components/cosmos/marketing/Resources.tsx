/* Resources.jsx — resources / news grid section. */
import { IcChevSm } from "@/components/cosmos/shared";
import { useT } from "@/lib/i18n/index";

export function Resources() {
  const t = useT();
  const r = t.landing.resources;
  return (
    <section className="lp" id="resources">
      <div className="wrap">
        <div className="section-head reveal">
          <span className="kicker">{r.kicker}</span>
          <h2>{r.title}</h2>
          <p>{r.lede}</p>
        </div>
        <div className="news-grid">
          {r.items.map((n, i) => (
            <a className="news-card reveal" href="#" key={n.t} style={{ transitionDelay: `${(i % 4) * 0.06}s` }}>
              <div className="nthumb" />
              <div className="nbody">
                <div className="news-tag">{n.tag}</div>
                <h4>{n.t}</h4>
                <p>{n.d}</p>
                <span className="card-link">{r.readMore} <IcChevSm /></span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
