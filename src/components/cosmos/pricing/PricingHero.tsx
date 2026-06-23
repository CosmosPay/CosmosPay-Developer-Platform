import { useT } from "@/lib/i18n/index";

export function PricingHero({ billing, setBilling }) {
  const t = useT();
  const p = t.pricing;
  return (
    <section className="pricing-hero">
      <div className="wrap">
        <span className="kicker">{p.kicker}</span>
        <h1>{p.title}</h1>
        <p>{p.lede}</p>
        <div className="seg">
          <button className={billing === "monthly" ? "on" : ""} onClick={() => setBilling("monthly")}>{p.monthly}</button>
          <button className={billing === "annual" ? "on" : ""} onClick={() => setBilling("annual")}>{p.annual}<span className="save">{p.save}</span></button>
        </div>
      </div>
    </section>
  );
}
