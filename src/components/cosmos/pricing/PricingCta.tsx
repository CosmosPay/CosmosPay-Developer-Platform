import { IcArrow, ctaProps } from "@/components/cosmos/shared";
import { useT } from "@/lib/i18n/index";

export function PricingCta({ user }) {
  const t = useT();
  const p = t.pricing;
  return (
    <section className="cta"><div className="wrap"><div className="cta-card reveal">
      <div className="deco" />
      <h2>{p.ctaTitle}</h2>
      <p>{p.ctaDesc}</p>
      <div className="row">
        <a className="btn btn-white" href="#">{p.contactSales} <IcArrow /></a>
        <a className="btn btn-outline-w" {...ctaProps(user)}>{p.openDashboard}</a>
      </div>
    </div></div></section>
  );
}
