import { useId } from "react";

/* A labelled field: the label above, the input, and its help under it (read with the input
   through aria-describedby). */
export function Field({ label, hint = undefined, ...p }) {
  const id = useId();
  const helpId = hint ? `${id}-help` : undefined;
  return (
    <div className="fld">
      <label className="field-l" htmlFor={id}>{label}</label>
      <input id={id} className="field" aria-describedby={helpId} {...p} />
      {hint && <p className="field-help" id={helpId}>{hint}</p>}
    </div>
  );
}

export function Sel({ label, value, onChange, options, labels = undefined, hint = undefined }) {
  const id = useId();
  const helpId = hint ? `${id}-help` : undefined;
  return (
    <div className="fld">
      <label className="field-l" htmlFor={id}>{label}</label>
      <select id={id} className="field" value={value} onChange={(e) => onChange(e.target.value)} aria-describedby={helpId}>
        {options.map((o) => <option key={o} value={o}>{labels ? (labels[o] || o) : o}</option>)}
      </select>
      {hint && <p className="field-help" id={helpId}>{hint}</p>}
    </div>
  );
}
