/* PricingHero.tsx: la portada de precios con el gesto de la landing. Panel
   negro, titular Light a la izquierda y la numeracion /01 del deck en lugar
   del kicker en mayusculas que usaba el sitio viejo. */
import { useT, fmt } from "@/lib/i18n/index";
import { pricingCopyVars } from "@/lib/plans.ts";

export function PricingHero({ billing, setBilling }) {
  const t = useT();
  const p = t.pricing;
  return (
    <section className="lp-panel pricing-hero" data-panel="black">
      <div className="wrap">
        <h1 data-num="/01">{p.title}</h1>
        {/* Names what a payment costs ({starterRate}), from the specs. */}
        <p>{fmt(p.lede, pricingCopyVars())}</p>
        <div className="seg">
          <button className={billing === "monthly" ? "on" : ""} onClick={() => setBilling("monthly")}>{p.monthly}</button>
          <button className={billing === "annual" ? "on" : ""} onClick={() => setBilling("annual")}>{p.annual}<span className="save">{p.save}</span></button>
        </div>
      </div>
    </section>
  );
}
