/* RecordLink: a reference on screen (a record's id, an account, an endpoint, a key) as one thing
   that opens, copies and previews (product owner: every reference in the dashboard has its copy
   button, and everything that can be previewed is).
   - Opening: `href` makes it a link (a plain click calls `onOpen` in place when given, a modified
     one follows the address to a new tab; `external` opens another site in a new tab); `onOpen`
     alone makes it a button (a record with no address of its own, such as a webhook endpoint).
   - `copy`: the value its copy button copies (the full reference, not the shortened text).
   - `preview`: a card while a pointer rests on it or it has keyboard focus. WCAG 1.4.13: the card
     can be hovered without closing, stays while it is, Escape closes it. It is portaled and fixed,
     so a table's scroller never clips it, and closes when the page scrolls. A function, so a card
     is only built for the reference being previewed.
   Inside a clickable row the reference is its own target: the row does not open as well. */
import { useEffect, useId, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useT, fmt } from "@/lib/i18n/index";
import { useCopy } from "@/components/cosmos/hooks/useCopy";
import { IcCheck, IcCopy } from "@/components/cosmos/icons";

const CARD_W = 300;
const CARD_H = 240;

/* The copy button beside a reference: names what it copies for assistive tech. */
export function CopyRef({ value }: { value: string }) {
  const t = useT();
  const [done, copy] = useCopy();
  return (
    <button
      type="button" className={`copy-mini ref-copy${done ? " done" : ""}`}
      onClick={(e) => { e.stopPropagation(); copy(value, t.toasts.copied); }}
      title={t.dash.common.copy} aria-label={fmt(t.dash.common.copyValue, { value })}
    >
      {done ? <IcCheck /> : <IcCopy />}
    </button>
  );
}

export function RecordLink({ href, external = false, onOpen, preview, copy, title, children, className = "" }: {
  href?: string | null;
  external?: boolean;
  onOpen?: () => void;
  preview?: () => ReactNode;
  copy?: string | null;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  const ref = useRef<HTMLElement>(null);
  const [at, setAt] = useState<{ left: number; top: number; up: boolean } | null>(null);
  const showT = useRef<number>(0);
  const hideT = useRef<number>(0);
  const place = () => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const up = r.bottom + 8 + CARD_H > window.innerHeight && r.top > CARD_H;
    setAt({ left: Math.max(8, Math.min(r.left, window.innerWidth - CARD_W - 8)), top: up ? r.top - 8 : r.bottom + 8, up });
  };
  const show = (delay: number) => {
    if (!preview) return;
    window.clearTimeout(hideT.current);
    window.clearTimeout(showT.current);
    showT.current = window.setTimeout(place, delay);
  };
  const hide = (delay = 140) => {
    window.clearTimeout(showT.current);
    window.clearTimeout(hideT.current);
    hideT.current = window.setTimeout(() => setAt(null), delay);
  };
  useEffect(() => {
    if (!at) return;
    const close = () => setAt(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setAt(null); };
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [at]);
  useEffect(() => () => { window.clearTimeout(showT.current); window.clearTimeout(hideT.current); }, []);
  const click = (e: MouseEvent) => {
    e.stopPropagation();
    if (!onOpen || external) return;
    if (href && (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) return;
    e.preventDefault();
    setAt(null);
    onOpen();
  };
  const hover = {
    onMouseEnter: () => show(280), onMouseLeave: () => hide(), onFocus: () => show(0), onBlur: () => hide(0),
    "aria-describedby": at ? id : undefined,
  };
  const cls = `rec-link${className ? ` ${className}` : ""}`;
  // The card already shows the full value: a native tooltip would stack on it.
  const tip = preview ? undefined : title;
  const trigger = href
    ? <a ref={ref as any} href={href} className={cls} title={tip} onClick={click} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} {...hover}>{children}</a>
    : onOpen
      ? <button ref={ref as any} type="button" className={`${cls} as-btn`} title={tip} onClick={click} {...hover}>{children}</button>
      // Nothing to open: still focusable, so its preview reaches the keyboard too.
      : <span ref={ref as any} className={`${cls} as-text`} title={tip} tabIndex={preview ? 0 : undefined} {...hover}>{children}</span>;
  return (
    <span className="ref">
      {trigger}
      {copy ? <CopyRef value={copy} /> : null}
      {at && preview && createPortal(
        <div
          id={id} role="tooltip" className={`rec-preview${at.up ? " up" : ""}`} style={{ left: at.left, top: at.top }}
          onMouseEnter={() => window.clearTimeout(hideT.current)} onMouseLeave={() => hide()}
        >
          {preview()}
        </div>,
        document.body,
      )}
    </span>
  );
}
