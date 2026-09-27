import { IcArrow, ctaProps } from "@/components/cosmos/shared";
import { useT } from "@/lib/i18n/index";

/* El cierre de precios usa el mismo bloque que el cierre de la landing
   (.cta-panel): panel navy, titular Light a la izquierda y los dos botones. */
export function PricingCta({ user }) {
  const t = useT();
  const p = t.pricing;
  return (
    <section className="lp-panel cta" data-panel="navy">
      <div className="wrap">
        <div className="cta-panel reveal">
          <h2>{p.ctaTitle}<span className="num" aria-hidden="true">/04</span></h2>
          <p>{p.ctaDesc}</p>
          <div className="row">
            <a className="btn btn-white" href="#">{p.contactSales} <IcArrow /></a>
            <a className="btn btn-outline-w" {...ctaProps(user)}>{p.openDashboard}</a>
          </div>
        </div>
      </div>
    </section>
  );
}
