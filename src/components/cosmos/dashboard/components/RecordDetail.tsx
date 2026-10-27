/* A row's detail, as every list opens it (product owner, 2026-10-27: every list is the Payments
   table, and its row opens a detail): an eyebrow naming what it is, its name, its fields as label
   and value (the empty ones left out), then its actions, the main one first and a removal last. */
import type { ReactNode } from "react";
import { Modal } from "@/components/cosmos/shared";

export type RecordAction = {
  key: string;
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  /* A link instead of a button (an explorer): opened in another tab. */
  href?: string | null;
  kind?: "dark" | "soft" | "danger";
  disabled?: boolean;
  hint?: string;
};

export function RecordDetail({ eyebrow, title, fields, actions = [], onClose, children = null }: {
  eyebrow: string;
  title: string;
  fields: [string, ReactNode][];
  actions?: RecordAction[];
  onClose: () => void;
  children?: ReactNode;
}) {
  const cls = (a: RecordAction) => `btn ${a.kind === "dark" ? "btn-dark" : a.kind === "danger" ? "btn-soft danger-soft" : "btn-soft"} btn-sm`;
  return (
    <Modal onClose={onClose} label={title}>
      <div className="modal-body">
        <div className="modal-eyebrow">{eyebrow}</div>
        <h3>{title}</h3>
        <div className="paylink-fields" style={{ marginBottom: 18 }}>
          {fields.filter(([, v]) => v !== null && v !== undefined && v !== "").map(([k, v]) => (
            <div className="paylink-field" key={k}><span className="pf-k">{k}</span><span className="pf-v">{v}</span></div>
          ))}
        </div>
        {children}
        {actions.length > 0 && (
          <div className="paylink-actions">
            {actions.map((a) => (a.href
              ? <a key={a.key} className={cls(a)} href={a.href} target="_blank" rel="noopener noreferrer">{a.icon} {a.label}</a>
              : <button key={a.key} type="button" className={cls(a)} onClick={a.onClick} disabled={a.disabled} title={a.disabled ? a.hint : undefined}>{a.icon} {a.label}</button>))}
          </div>
        )}
      </div>
    </Modal>
  );
}
