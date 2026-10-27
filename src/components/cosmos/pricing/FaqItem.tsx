import { useState } from "react";
import { IcPlus } from "@/components/cosmos/pricing/icons";

export function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item${open ? " open" : ""}`}>
      <button className="faq-q" onClick={() => setOpen((o) => !o)}>{q}<IcPlus /></button>
      <div className="faq-a"><p>{a}</p></div>
    </div>
  );
}
