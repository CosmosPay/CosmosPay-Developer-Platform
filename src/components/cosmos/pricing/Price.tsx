export function Price({ plan, meta, billing, t }) {
  let amt = plan.amt, per = "", txt = plan.txt;
  if (meta.mo != null) {
    amt = "$" + (billing === "annual" ? meta.ann : meta.mo);
    per = t.pricing.perMo;
  }
  return (
    <div className="price-block">
      <div className="price">{meta.from && <span className="from">{t.pricing.from}</span>}<span className="amt">{amt}</span>{per && <span className="per">{per}</span>}</div>
      {txt && <div className="ptxt">{txt}</div>}
    </div>
  );
}
