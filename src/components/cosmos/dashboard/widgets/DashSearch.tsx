import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { fmt, useT } from "@/lib/i18n/index";
import { DI } from "@/components/cosmos/dashboard/icons";
import { SIDE } from "@/components/cosmos/dashboard/data";
import { FILTERS_EVENT, usePresence } from "@/components/cosmos/dashboard/hooks";

/* The dashboard's search, in the top bar: a WAI-ARIA combobox over a listbox. It finds the
   dashboard's pages by name (and by their group's name), and with a query it offers to search
   the lists that take one (payments, swaps, liquidity): picking that opens the list with the
   query in its search (`q`, the list filters live in the URL). Ctrl K / Cmd K or "/" focus it. */

const SEARCHABLE = ["payments", "swaps", "liquidity"];

type Item = { id: string; kind: "page" | "search"; view: string; label: string; hint?: string };

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export function DashSearch({ go, view, visible }: { go: (v: string) => void; view: string; visible: (v: string) => boolean }) {
  const t = useT();
  const ds = t.dash.search;
  const id = useId();
  const listId = `${id}-list`;
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const { mounted, state } = usePresence(open);

  // Every page the viewer can open, with its group's name as the hint.
  const pages = useMemo(() => {
    const out: { view: string; group?: string }[] = [];
    for (const sec of SIDE) {
      for (const e of sec.entries) {
        if ("group" in e) e.views.filter(visible).forEach((v) => out.push({ view: v, group: t.dash.sidebar.groups[e.group] }));
        else if (visible(e.view)) out.push({ view: e.view });
      }
    }
    return out;
  }, [t, visible]);

  const items: Item[] = useMemo(() => {
    const words = fold(q.trim()).split(/\s+/).filter(Boolean);
    const matches = (s: string) => words.every((w) => fold(s).includes(w));
    const found = pages
      .filter((p) => !words.length || matches(`${t.dash.viewLabels[p.view]} ${p.group ?? ""}`))
      .slice(0, words.length ? 8 : 10)
      .map((p) => ({ id: `${id}-p-${p.view}`, kind: "page" as const, view: p.view, label: t.dash.viewLabels[p.view], hint: p.group && p.group !== t.dash.viewLabels[p.view] ? p.group : undefined }));
    const searches = q.trim()
      ? SEARCHABLE.filter(visible).map((v) => ({ id: `${id}-s-${v}`, kind: "search" as const, view: v, label: fmt(ds.searchIn, { place: t.dash.viewLabels[v], q: q.trim() }) }))
      : [];
    // Pages first (where to go), then the lists to search.
    return [...found, ...searches];
  }, [q, pages, t, ds, id, visible]);

  useEffect(() => { setAt(0); }, [q]);

  // Ctrl K / Cmd K anywhere, or "/" outside a field, focuses the search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
      if ((e.key === "k" || e.key === "K") && (e.ctrlKey || e.metaKey)) { e.preventDefault(); input.current?.focus(); setOpen(true); }
      else if (e.key === "/" && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); input.current?.focus(); setOpen(true); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // A click outside closes it.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (root.current && !root.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const choose = (it: Item) => {
    setOpen(false);
    setQ("");
    input.current?.blur();
    go(it.view);
    if (it.kind !== "search") return;
    // The list reads its filters from the URL when it mounts; one already on screen re-reads
    // them on FILTERS_EVENT.
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("q", q.trim());
      window.history.replaceState(window.history.state, "", url);
      if (it.view === view) window.dispatchEvent(new Event(FILTERS_EVENT));
    } catch (e) {}
  };

  const onKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      if (!items.length) return;
      setAt((i) => (i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length);
    } else if (e.key === "Enter") {
      if (open && items[at]) { e.preventDefault(); choose(items[at]); }
    } else if (e.key === "Escape") {
      if (open) { e.preventDefault(); e.stopPropagation(); setOpen(false); }
      else if (q) { e.preventDefault(); setQ(""); }
      else input.current?.blur();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  // Keep the highlighted option in view while the arrows move through a long list.
  useEffect(() => {
    if (open && items[at]) document.getElementById(items[at].id)?.scrollIntoView({ block: "nearest" });
  }, [at, open, items]);

  const searches = items.filter((i) => i.kind === "search");
  const found = items.filter((i) => i.kind === "page");
  const option = (it: Item) => (
    <li
      key={it.id} id={it.id} role="option" aria-selected={items[at]?.id === it.id}
      className={`dsearch-opt${items[at]?.id === it.id ? " cur" : ""}`}
      onMouseDown={(e) => e.preventDefault()} onMouseMove={() => setAt(items.indexOf(it))} onClick={() => choose(it)}
    >
      <span className="dsearch-ic" aria-hidden="true">{it.kind === "search" ? DI.search : DI.chevR}</span>
      <span className="dsearch-l">{it.label}</span>
      {it.hint && <span className="dsearch-h">{it.hint}</span>}
    </li>
  );

  return (
    <div className={`dsearch${open ? " open" : ""}`} ref={root}>
      <span className="dsearch-glyph" aria-hidden="true">{DI.search}</span>
      <input
        ref={input} id={id} type="search" className="dsearch-input" value={q}
        placeholder={ds.placeholder} aria-label={ds.label}
        role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list"
        aria-activedescendant={open && items[at] ? items[at].id : undefined}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)} onKeyDown={onKey} autoComplete="off" spellCheck={false}
      />
      <kbd className="dsearch-kbd" aria-hidden="true">Ctrl K</kbd>
      {mounted && (
        <div className="dsearch-pop" data-state={state}>
          <ul role="listbox" id={listId} aria-label={ds.label} className="dsearch-list">
            {found.length > 0 && (
              <li role="presentation">
                <p className="dsearch-group" id={`${id}-gp`}>{ds.pages}</p>
                <ul role="group" aria-labelledby={`${id}-gp`}>{found.map(option)}</ul>
              </li>
            )}
            {searches.length > 0 && (
              <li role="presentation">
                <p className="dsearch-group" id={`${id}-gs`}>{ds.searchGroup}</p>
                <ul role="group" aria-labelledby={`${id}-gs`}>{searches.map(option)}</ul>
              </li>
            )}
          </ul>
          {!items.length && <p className="dsearch-empty" role="status">{fmt(ds.empty, { q: q.trim() })}</p>}
        </div>
      )}
    </div>
  );
}
