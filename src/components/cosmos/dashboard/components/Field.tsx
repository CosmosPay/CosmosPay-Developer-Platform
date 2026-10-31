import { useId } from "react";
import { Select } from "@/components/cosmos/dashboard/components/Select";

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

/* A labelled choice, on the dashboard's dropdown (Select). */
export function Sel({ label, value, onChange, options, labels = undefined, hint = undefined }) {
  const id = useId();
  const helpId = hint ? `${id}-help` : undefined;
  return (
    <div className="fld">
      <span className="field-l" id={`${id}-l`}>{label}</span>
      <Select value={value} onChange={onChange} labelledBy={`${id}-l`} describedBy={helpId} options={options.map((o) => ({ value: o, label: labels ? (labels[o] || o) : o }))} />
      {hint && <p className="field-help" id={helpId}>{hint}</p>}
    </div>
  );
}
