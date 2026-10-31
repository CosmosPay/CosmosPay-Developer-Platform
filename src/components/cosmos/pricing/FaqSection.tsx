import { useT, fmt } from "@/lib/i18n/index";
import { PLAN_IDS, swapFeePct } from "@/lib/plans.ts";
import { FaqItem } from "@/components/cosmos/pricing/FaqItem";

/* Las preguntas son el respiro negro de la pagina: sin un panel oscuro en el
   medio, /pricing quedaba blanca de punta a punta y no se leia como la home. */
export function FaqSection() {
  const t = useT();
  const p = t.pricing;
  // The swap answer quotes each plan's commission and the public one's, from the specs.
  const rates = { ...Object.fromEntries(PLAN_IDS.map((id) => [id, swapFeePct(id)])), public: swapFeePct("community") };
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
