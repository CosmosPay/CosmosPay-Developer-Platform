import { useEffect } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { IcX } from "../icons";

export function Modal({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, []);
  const content = (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <button className="modal-x" onClick={onClose} aria-label="Close"><IcX /></button>
        {children}
      </div>
    </div>
  );
  // Portal to <body> so the fixed overlay can never be trapped by an ancestor's
  // transform/animation (e.g. .dash-body's viewIn) and always covers the viewport,
  // above the sidebar and topbar.
  return typeof document !== "undefined" ? createPortal(content, document.body) : content;
}
