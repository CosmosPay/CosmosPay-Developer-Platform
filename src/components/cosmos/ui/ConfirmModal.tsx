import type { ReactNode } from "react";
import { Modal } from "./Modal";

interface ConfirmModalProps {
  title: string;
  body?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
  danger?: boolean;
}

/* Generic confirmation dialog for destructive actions (delete/revoke/…).
   Texts are passed in (already localized); `danger` styles the confirm button red. It opens with
   its mark (a bin in the danger red for a destructive action, a warning otherwise), so what is
   asked reads before the words (product owner, 2026-10-27: a flat warning with no icon). */
export function ConfirmModal({ title, body, confirmLabel, cancelLabel = "Cancel", onConfirm, onClose, danger = true }: ConfirmModalProps) {
  return (
    <Modal onClose={onClose} label={title}>
      <div className="modal-body cfm">
        <div className={`cfm-mark${danger ? " danger" : ""}`} aria-hidden="true">
          {danger ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M10 11v6M14 11v6M5.5 7l1 12a2 2 0 0 0 2 1.8h7a2 2 0 0 0 2-1.8l1-12M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><circle cx="12" cy="12" r="9.5" /><path d="M12 7.5v5.5M12 16.4v.1" /></svg>
          )}
        </div>
        <h3>{title}</h3>
        {body && <p className="cfm-body">{body}</p>}
        <div className="modal-actions">
          <button className={`btn ${danger ? "btn-danger" : "btn-violet"}`} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</button>
          <button className="btn btn-soft" onClick={onClose}>{cancelLabel}</button>
        </div>
      </div>
    </Modal>
  );
}
