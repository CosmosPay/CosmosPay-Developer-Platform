import { useT } from "@/lib/i18n/index";
import { FaqItem } from "./FaqItem";

export function FaqSection() {
  const t = useT();
  const p = t.pricing;
  return (
    <section className="faq">
      <h2>{p.faqTitle}</h2>
      {p.faqs.map((f) => <FaqItem key={f.q} q={f.q} a={f.a} />)}
    </section>
  );
}
