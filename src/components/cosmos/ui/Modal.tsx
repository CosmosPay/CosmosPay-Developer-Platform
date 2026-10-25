import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { IcX } from "@/components/cosmos/icons";

/* Accessible modal: role=dialog + aria-modal, an accessible name via `label`, Escape to
   close, a focus trap (Tab cycles inside), initial focus moved into the dialog, and focus
   returned to the triggering element on close. Closing from inside (X, the backdrop, Escape)
   plays a short exit before `onClose` unmounts it; a parent closing it directly skips that. */
const EXIT_MS = 160;
export function Modal({ onClose, children, label = "Dialog" }: { onClose: () => void; children: ReactNode; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [closing, setClosing] = useState(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestClose = () => {
    if (timer.current) return;
    setClosing(true);
    timer.current = setTimeout(() => closeRef.current(), EXIT_MS);
  };
  const requestRef = useRef(requestClose);
  requestRef.current = requestClose;
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { requestRef.current(); return; }
      if (e.key === "Tab") {
        const root = ref.current;
        if (!root) return;
        const f = root.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])',
        );
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Move focus into the dialog: a form field if there is one, otherwise the dialog itself
    // (never auto-focus an action button; that avoids accidental confirm of destructive dialogs).
    const root = ref.current;
    const field = root?.querySelector<HTMLElement>("input,textarea,select");
    (field ?? root)?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      prevFocus?.focus?.();
    };
  }, []);
  const content = (
    <div className="modal-overlay" data-state={closing ? "closing" : "open"} onClick={requestClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        ref={ref}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-x" onClick={requestClose} aria-label="Close"><IcX /></button>
        {children}
      </div>
    </div>
  );
  // Portal to <body> so the fixed overlay can never be trapped by an ancestor's
  // transform/animation (e.g. .dash-body's viewIn) and always covers the viewport,
  // above the sidebar and topbar.
  return typeof document !== "undefined" ? createPortal(content, document.body) : content;
}
