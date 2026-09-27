/* PricingHero.tsx: la portada de precios con el gesto de la landing. Panel
   negro, titular Light a la izquierda y la numeracion /01 del deck en lugar
   del kicker en mayusculas que usaba el sitio viejo. */
import { useT } from "@/lib/i18n/index";

export function PricingHero({ billing, setBilling }) {
  const t = useT();
  const p = t.pricing;
  return (
    <section className="lp-panel pricing-hero" data-panel="black">
      <div className="wrap">
        <h1>{p.title}<span className="num" aria-hidden="true">/01</span></h1>
        <p>{p.lede}</p>
        <div className="seg">
          <button className={billing === "monthly" ? "on" : ""} onClick={() => setBilling("monthly")}>{p.monthly}</button>
          <button className={billing === "annual" ? "on" : ""} onClick={() => setBilling("annual")}>{p.annual}<span className="save">{p.save}</span></button>
        </div>
      </div>
    </section>
  );
}
