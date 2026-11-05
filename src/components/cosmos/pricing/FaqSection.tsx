import { useT, fmt } from "@/lib/i18n/index";
import { pricingCopyVars } from "@/lib/plans.ts";
import { FaqItem } from "@/components/cosmos/pricing/FaqItem";

/* Las preguntas son el respiro negro de la pagina: sin un panel oscuro en el
   medio, /pricing quedaba blanca de punta a punta y no se leia como la home. */
export function FaqSection() {
  const t = useT();
  const p = t.pricing;
  // The answers quote the rates from the specs: Starter's per payment, each plan's swap commission.
  const rates = pricingCopyVars();
  return (
    <section className="lp-panel faq-panel" data-panel="black">
      <div className="wrap">
        <div className="faq">
          <h2 data-num="/03">{p.faqTitle}</h2>
          {p.faqs.map((f) => <FaqItem key={f.q} q={f.q} a={fmt(f.a, rates)} />)}
        </div>
      </div>
    </section>
  );
}
