/* Cta.jsx — closing call-to-action section. */
import { IcArrow, ctaProps, PRICING } from "@/components/cosmos/shared";
import { useT } from "@/lib/i18n/index";

export function Cta({ user }) {
  const t = useT();
  const c = t.landing.cta;
  return (
    <section className="cta"><div className="wrap">
      <div className="cta-card reveal">
        <div className="deco" />
        <h2>{c.title}</h2>
        <p>{c.desc}</p>
        <div className="row">
          <a className="btn btn-white" {...ctaProps(user)}>{c.getKeys} <IcArrow /></a>
          <a className="btn btn-outline-w" href="#">{c.talk}</a>
        </div>
      </div>
      <div className="cta-helpers reveal">
        <a className="cta-help" href={PRICING}>
          <span className="chi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12l-8 8-9-9V3h8z" /><circle cx="7.5" cy="7.5" r="1.4" fill="currentColor" /></svg></span>
          <span><b>{c.helpers[0].b}</b><span>{c.helpers[0].s}</span></span>
          <span className="chg"><IcArrow /></span>
        </a>
        <a className="cta-help" href="#api">
          <span className="chi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13 5l-2 14" /></svg></span>
          <span><b>{c.helpers[1].b}</b><span>{c.helpers[1].s}</span></span>
          <span className="chg"><IcArrow /></span>
        </a>
      </div>
    </div></section>
  );
}
