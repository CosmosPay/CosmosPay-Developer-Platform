/* Dashboard hooks: visibility-aware polling, table row animation, client-side
   pagination, and the dropdown outside-click helper. */
import { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import { PAGE_SIZE } from "./data";

/* Polling that pauses while the browser tab is hidden (saves resources). Fires once on
   mount, then every `ms` only while visible; refires immediately when the tab returns. */
export function usePolling(cb, ms) {
  const saved = useRef(cb);
  saved.current = cb;
  useEffect(() => {
    let id = null;
    const tick = () => { try { saved.current(); } catch (e) {} };
    const start = () => { if (id == null) id = setInterval(() => { if (!document.hidden) tick(); }, ms); };
    const stop = () => { if (id != null) { clearInterval(id); id = null; } };
    const onVis = () => { if (document.hidden) stop(); else { tick(); start(); } };
    tick();
    start();
    document.addEventListener("visibilitychange", onVis);
    return () => { stop(); document.removeEventListener("visibilitychange", onVis); };
  }, [ms]);
}

/* Animate a table's rows whenever `dep` changes (e.g. the page number).
   While animating we add `is-animating` to the scroll container so its scrollbar
   is suppressed (the row transforms would otherwise flash one in mid-animation). */
export function useGsapRows(ref, dep) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rows = el.querySelectorAll("tbody > tr");
    if (!rows.length) return;
    el.classList.add("is-animating");
    const done = () => el.classList.remove("is-animating");
    const anim = gsap.fromTo(
      rows,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.34, stagger: 0.035, ease: "power2.out", overwrite: "auto", clearProps: "opacity,transform", onComplete: done },
    );
    return () => { anim.kill(); done(); };
  }, [dep]);
}

/* Client-side pager over an array. `resetKey` (e.g. the search query) snaps back to page 1. */
export function usePaged(rows, resetKey, pageSize = PAGE_SIZE) {
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [resetKey]);
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const cur = Math.min(page, pages);
  const start = (cur - 1) * pageSize;
  const slice = rows.slice(start, start + pageSize);
  return { page: cur, setPage, pages, total, slice, start, count: slice.length };
}

/* ---------------- dropdown shell ---------------- */
export function useOutside(cb) {
  const ref = useRef(null);
  useEffect(() => { const h = (e) => { if (ref.current && !ref.current.contains(e.target)) cb(); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  return ref;
}
