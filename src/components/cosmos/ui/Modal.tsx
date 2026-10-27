import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { IcX } from "@/components/cosmos/icons";
import { useT } from "@/lib/i18n/index";

/* Accessible modal: role=dialog + aria-modal, an accessible name via `label`, Escape to
   close, a focus trap (Tab cycles inside), initial focus moved into the dialog, and focus
   returned to the triggering element on close. Closing from inside (X, the backdrop, Escape)
   plays a short exit before `onClose` unmounts it; a parent closing it directly skips that. */
const EXIT_MS = 160;
/* The dialogs open, oldest first. Only the top one answers Escape and keeps Tab inside it, so a
   dialog opened from another (a token picker in the swap form, a confirmation from a detail)
   closes alone and the one under it stays. */
const open: object[] = [];
export function Modal({ onClose, children, label }: { onClose: () => void; children: ReactNode; label?: string }) {
  const t = useT();
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
    const self = {};
    open.push(self);
    const onKey = (e: KeyboardEvent) => {
      if (open[open.length - 1] !== self) return;
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
    // The scroll is locked on the root, as the mobile menu does: there the root's scrollbar-gutter
    // keeps the scrollbar's room, so the page behind does not widen and reflow (on <body> Chrome
    // drops the gutter).
    const page = document.documentElement;
    const prev = page.style.overflow;
    page.style.overflow = "hidden";
    // Move focus into the dialog: a form field if there is one, otherwise the dialog itself
    // (never auto-focus an action button; that avoids accidental confirm of destructive dialogs).
    const root = ref.current;
    const field = root?.querySelector<HTMLElement>("input,textarea,select");
    (field ?? root)?.focus();
    return () => {
      const at = open.indexOf(self);
      if (at >= 0) open.splice(at, 1);
      document.removeEventListener("keydown", onKey);
      page.style.overflow = prev;
      prevFocus?.focus?.();
    };
  }, []);
  const content = (
    <div className="modal-overlay" data-state={closing ? "closing" : "open"} onClick={requestClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={label || t.ui.dialog}
        tabIndex={-1}
        ref={ref}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-x" onClick={requestClose} aria-label={t.ui.close}><IcX /></button>
        {children}
      </div>
    </div>
  );
  // Portal to <body> so the fixed overlay can never be trapped by an ancestor's
  // transform/animation (e.g. .dash-body's viewIn) and always covers the viewport,
  // above the sidebar and topbar.
  return typeof document !== "undefined" ? createPortal(content, document.body) : content;
}
