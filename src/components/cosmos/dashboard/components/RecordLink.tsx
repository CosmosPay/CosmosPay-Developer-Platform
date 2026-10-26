/* RecordLink: a record's id as a link to it (a payment opens in Payments, a swap its detail...),
   previewed in a small card while a pointer rests on it or it has keyboard focus (product owner).
   A plain click opens the record in place (`onOpen`); a modified one follows `href` to a new tab.
   The card follows WCAG 1.4.13: it can be hovered without closing, stays while it is, and Escape
   closes it. It is portaled and fixed, so a table's scroller never clips it, and closes when the
   page scrolls. `preview` is a function, so a card is only built for the link being previewed. */
import { useEffect, useId, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";

const CARD_W = 300;
const CARD_H = 240;

export function RecordLink({ href, onOpen, preview, children, className = "" }: {
  href: string;
  onOpen?: () => void;
  preview?: () => ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  const ref = useRef<HTMLAnchorElement>(null);
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
  // Inside a clickable row the link is its own target: the row does not open as well.
  const click = (e: MouseEvent<HTMLAnchorElement>) => {
    e.stopPropagation();
    if (!onOpen || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    setAt(null);
    onOpen();
  };
  return (
    <>
      <a
        ref={ref} href={href} className={`rec-link${className ? ` ${className}` : ""}`} onClick={click}
        onMouseEnter={() => show(280)} onMouseLeave={() => hide()} onFocus={() => show(0)} onBlur={() => hide(0)}
        aria-describedby={at ? id : undefined}
      >
        {children}
      </a>
      {at && preview && createPortal(
        <div
          id={id} role="tooltip" className={`rec-preview${at.up ? " up" : ""}`} style={{ left: at.left, top: at.top }}
          onMouseEnter={() => window.clearTimeout(hideT.current)} onMouseLeave={() => hide()}
        >
          {preview()}
        </div>,
        document.body,
      )}
    </>
  );
}
