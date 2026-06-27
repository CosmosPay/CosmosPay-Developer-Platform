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
   Texts are passed in (already localized); `danger` styles the confirm button red. */
export function ConfirmModal({ title, body, confirmLabel, cancelLabel = "Cancel", onConfirm, onClose, danger = true }: ConfirmModalProps) {
  return (
    <Modal onClose={onClose} label={title}>
      <div className="modal-body">
        <h3>{title}</h3>
        {body && <p>{body}</p>}
        <div className="modal-actions">
          <button className={`btn ${danger ? "btn-danger" : "btn-violet"}`} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</button>
          <button className="btn btn-soft" onClick={onClose}>{cancelLabel}</button>
        </div>
      </div>
    </Modal>
  );
}
