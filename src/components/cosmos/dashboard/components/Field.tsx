import { useId } from "react";

export function Field({ label, hint, ...p }) {
  const id = useId();
  return (<div className="fld"><label className="field-l" htmlFor={id}>{label}{hint && <span className="field-hint"> {hint}</span>}</label><input id={id} className="field" {...p} /></div>);
}

export function Sel({ label, value, onChange, options, labels }) {
  const id = useId();
  return (<div className="fld"><label className="field-l" htmlFor={id}>{label}</label><select id={id} className="field" value={value} onChange={(e) => onChange(e.target.value)}>{options.map((o) => <option key={o} value={o}>{labels ? (labels[o] || o) : o}</option>)}</select></div>);
}
