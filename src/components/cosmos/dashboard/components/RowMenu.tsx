/* RowMenu: a row's actions behind its "⋮" (product owner: every list has the three dots, as the
   overview's transactions). A disclosure: the button says whether it is open, Escape or a click
   elsewhere closes it and focus returns to the button; opening it focuses the first action. It
   is portaled and fixed, as the previews are, so a table's scroller never clips it, and opens
   upwards near the bottom of the window. An action that does not apply to this row stays in its
   place, disabled, saying why (`hint`), so a row's menu reads the same as its neighbours'. */
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePresence } from "@/components/cosmos/dashboard/hooks";

export type RowAction = {
  key: string;
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  /* A link (`external`: another site, a new tab) instead of an action. */
  href?: string | null;
  external?: boolean;
  disabled?: boolean;
  hint?: string;
  danger?: boolean;
};

const MENU_H = 280;

export function RowMenu({ label, items }: { label: string; items: RowAction[] }) {
  const id = useId();
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [at, setAt] = useState<{ right: number; top?: number; bottom?: number } | null>(null);
  const last = useRef(at);
  if (at) last.current = at;
  const menu = usePresence(!!at, 120);
  const place = () => {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    const right = Math.max(8, window.innerWidth - r.right);
    setAt(r.bottom + 6 + MENU_H > window.innerHeight && r.top > MENU_H ? { right, bottom: window.innerHeight - r.top + 6 } : { right, top: r.bottom + 6 });
  };
  const close = (refocus = false) => { setAt(null); if (refocus) btn.current?.focus(); };
  useEffect(() => {
    if (!at) return;
    const outside = (e: MouseEvent) => {
      const n = e.target as Node;
      if (!btn.current?.contains(n) && !list.current?.contains(n)) close();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); close(true); } };
    const away = () => close();
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", away, true);
    window.addEventListener("resize", away);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", away, true);
      window.removeEventListener("resize", away);
    };
  }, [at]);
  // The first action that can be taken gets focus once the list is in the page, so the keyboard
  // lands inside.
  useEffect(() => {
    if (at && menu.mounted) list.current?.querySelector<HTMLElement>("a, button:not(:disabled)")?.focus();
  }, [!!at, menu.mounted]);
  const pos = at || last.current;
  const run = (a: RowAction) => () => { close(true); a.onClick?.(); };
  return (
    <span className="row-menu-wrap" onClick={(e) => e.stopPropagation()}>
      <button
        ref={btn} type="button" className="hub-kebab" aria-label={label} aria-haspopup="true"
        aria-expanded={!!at} aria-controls={id} onClick={() => (at ? close() : place())}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="12" cy="19" r="1.7" /></svg>
      </button>
      {menu.mounted && pos && createPortal(
        <ul ref={list} id={id} role="list" className={`row-menu${pos.bottom !== undefined ? " up" : ""}`} data-state={menu.state} style={{ right: pos.right, top: pos.top, bottom: pos.bottom }}>
          {items.map((a) => (
            <li key={a.key}>
              {a.href && !a.disabled ? (
                <a href={a.href} className={a.danger ? "danger" : undefined} onClick={() => close()} {...(a.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                  {a.icon}<span>{a.label}</span>
                </a>
              ) : (
                <button type="button" className={a.danger ? "danger" : undefined} disabled={a.disabled} title={a.disabled ? a.hint : undefined} onClick={run(a)}>
                  {a.icon}<span>{a.label}{a.disabled && a.hint && <small className="row-menu-hint">{a.hint}</small>}</span>
                </button>
              )}
            </li>
          ))}
        </ul>,
        document.body,
      )}
    </span>
  );
}
