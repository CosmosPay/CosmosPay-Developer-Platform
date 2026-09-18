import { useT } from "@/lib/i18n/index";
import { FaqItem } from "./FaqItem";

/* Las preguntas son el respiro negro de la pagina: sin un panel oscuro en el
   medio, /pricing quedaba blanca de punta a punta y no se leia como la home. */
export function FaqSection() {
  const t = useT();
  const p = t.pricing;
  return (
    <section className="lp-panel faq-panel" data-panel="black">
      <div className="wrap">
        <div className="faq">
          <h2>{p.faqTitle}<span className="num" aria-hidden="true">/03</span></h2>
          {p.faqs.map((f) => <FaqItem key={f.q} q={f.q} a={f.a} />)}
        </div>
      </div>
    </section>
  );
}
