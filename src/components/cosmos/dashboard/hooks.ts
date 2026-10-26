/* Dashboard hooks: visibility-aware polling, table row animation, client-side
   pagination, list filters kept in the URL, and the dropdown outside-click helper. */
import { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import { PAGE_SIZE, PAGE_SIZES } from "@/components/cosmos/dashboard/data";
import { activeCount, readFilters, writeFilters, type Allowed, type Filters } from "@/lib/dashboard-filters";

/* Polling that pauses while the browser tab is hidden (saves resources). Fires once on
   mount, then every `ms` only while visible; refires immediately when the tab returns. A view
   that loads on its own passes `{ immediate: false }`, or every mount would ask twice at once. */
export function usePolling(cb, ms, { immediate = true } = {}) {
  const saved = useRef(cb);
  saved.current = cb;
  useEffect(() => {
    let id = null;
    const tick = () => { try { saved.current(); } catch (e) {} };
    const start = () => { if (id == null) id = setInterval(() => { if (!document.hidden) tick(); }, ms); };
    const stop = () => { if (id != null) { clearInterval(id); id = null; } };
    const onVis = () => { if (document.hidden) stop(); else { tick(); start(); } };
    if (immediate) tick();
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
    // The empty rows that keep a short page's height stay still.
    const rows = el.querySelectorAll("tbody > tr:not(.row-fill)");
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

/* Rows per page, one choice for every table (PAGE_SIZES, at most 50), kept in this browser. Read
   after mount, so the first render matches the server's; a change reaches every table on screen. */
const ROWS_KEY = "cosmospay-rows";
const ROWS_EVENT = "dash:rows";
export function useRowsPerPage(): [number, (n: number) => void] {
  const [size, setSize] = useState(PAGE_SIZE);
  useEffect(() => {
    try { const n = Number(localStorage.getItem(ROWS_KEY)); if (PAGE_SIZES.includes(n)) setSize(n); } catch (e) {}
    const on = (e: Event) => { const n = Number((e as CustomEvent).detail); if (PAGE_SIZES.includes(n)) setSize(n); };
    window.addEventListener(ROWS_EVENT, on);
    return () => window.removeEventListener(ROWS_EVENT, on);
  }, []);
  const choose = (n: number) => {
    if (!PAGE_SIZES.includes(n)) return;
    try { localStorage.setItem(ROWS_KEY, String(n)); } catch (e) {}
    window.dispatchEvent(new CustomEvent(ROWS_EVENT, { detail: n }));
  };
  return [size, choose];
}

/* Client-side pager over an array, at the viewer's rows per page. `resetKey` (e.g. the search
   query) snaps back to page 1, and so does another page size. `size` and `setSize` feed
   Pagination's picker; `size - count` is how many empty rows keep a short page's height. */
export function usePaged(rows, resetKey) {
  const [pageSize, setSize] = useRowsPerPage();
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [resetKey, pageSize]);
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const cur = Math.min(page, pages);
  const start = (cur - 1) * pageSize;
  const slice = rows.slice(start, start + pageSize);
  return { page: cur, setPage, pages, total, slice, start, count: slice.length, size: pageSize, setSize };
}

/* A list's filters, kept in the URL so a reload or a shared link shows the same list. Values the
   view does not accept fall back to their defaults (src/lib/dashboard-filters.ts); the shell
   drops them when another view opens. */
/* Dispatched on window after something outside a list wrote its filters to the URL (the top
   bar's search does): a list already on screen reads them again. */
export const FILTERS_EVENT = "dash:filters";

/* Opens a view already filtered (a figure, a count or a notice that names a list): `go` drops the
   last view's filters, then these are written to the URL, where the list reads them when it mounts
   or, already on screen, on FILTERS_EVENT. Keys are the view's own (useListFilters); a value it
   does not accept falls back to its default. */
export function goFiltered(go: (view: string) => void, view: string, params: Record<string, string> = {}) {
  go(view);
  try {
    const url = new URL(window.location.href);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    window.history.replaceState(window.history.state, "", url);
    window.dispatchEvent(new Event(FILTERS_EVENT));
  } catch (e) {}
}

/* A record on a view of its own (product owner: a payment opens on its own page, not a dialog):
   `openRecord("payment", id)` asks the shell to show it at an address of its own
   (`recordHref`) with a history entry, so Back returns to the list it came from. An event, so any
   view or widget can open a record without the shell's functions passed down to it. */
export const OPEN_RECORD_EVENT = "dash:open-record";
export function openRecord(view: string, id: string) {
  window.dispatchEvent(new CustomEvent(OPEN_RECORD_EVENT, { detail: { view, id } }));
}
export const recordHref = (view: string, id: string) => `/dashboard?view=${view}&id=${encodeURIComponent(id)}`;

/* A one-off request in the URL, written by goFiltered from elsewhere: `open=<id>` (show that record)
   or `create=1` (open the create dialog). Read after mount (and on FILTERS_EVENT, when the view is
   already on screen), then dropped from the URL, so a reload or closing the dialog leaves the list. */
export function useUrlRequest(key: string): [string | null, () => void] {
  const [value, setValue] = useState<string | null>(null);
  useEffect(() => {
    const read = () => {
      try {
        const url = new URL(window.location.href);
        const v = url.searchParams.get(key);
        if (!v) return;
        setValue(v);
        url.searchParams.delete(key);
        window.history.replaceState(window.history.state, "", url);
      } catch (e) {}
    };
    read();
    window.addEventListener(FILTERS_EVENT, read);
    return () => window.removeEventListener(FILTERS_EVENT, read);
  }, [key]);
  return [value, () => setValue(null)];
}

export function useListFilters(defaults: Filters, allowed: Allowed = {}) {
  // The first render matches the server's (no URL there): the URL's filters arrive right after.
  const [filters, setFilters] = useState<Filters>(defaults);
  const skipFirstWrite = useRef(true);
  useEffect(() => {
    const read = () => { try { setFilters(readFilters(window.location.search, defaults, allowed)); } catch (e) {} };
    read();
    window.addEventListener(FILTERS_EVENT, read);
    return () => window.removeEventListener(FILTERS_EVENT, read);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    // Writing the defaults on mount would erase the URL's filters before they are read.
    if (skipFirstWrite.current) { skipFirstWrite.current = false; return; }
    try {
      const url = new URL(window.location.href);
      writeFilters(url.searchParams, filters, defaults);
      window.history.replaceState(window.history.state, "", url);
    } catch (e) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);
  const set = (key: string, value: string) => setFilters((f) => ({ ...f, [key]: value }));
  const reset = () => setFilters(defaults);
  return { filters, set, reset, active: activeCount(filters, defaults) };
}

/* The popups' closing animation: the shared hook (src/components/cosmos/hooks/usePresence.ts). */
export { usePresence } from "@/components/cosmos/hooks/usePresence";

/* ---------------- dropdown shell ---------------- */
export function useOutside(cb) {
  const ref = useRef(null);
  useEffect(() => { const h = (e) => { if (ref.current && !ref.current.contains(e.target)) cb(); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  return ref;
}
