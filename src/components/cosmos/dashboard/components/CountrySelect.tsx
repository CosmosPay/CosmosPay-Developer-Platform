import { useEffect, useId, useMemo, useRef, useState } from "react";
import { COUNTRIES } from "@/lib/countries";
import { CountryFlag } from "@/components/cosmos/dashboard/components/CountryFlag";
import { useOutside, usePresence } from "@/components/cosmos/dashboard/hooks";

/* A searchable country/region picker, drawn as the dashboard's dropdown (`.dd`, popping open
   and closed like Select). Each option shows a flag, the country name and its 2-letter code,
   but the VALUE handed to onChange is just the code. The search box takes focus on open; the
   arrow keys move from it into the list, Escape closes and returns focus to the button. */
export function CountrySelect({ label, hint, value, onChange, placeholder, searchPlaceholder }) {
  const id = useId();
  const listId = `${id}-list`;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const close = (refocus = false) => { setOpen(false); setQ(""); if (refocus) btn.current?.focus(); };
  const ref = useOutside(() => close());
  const { mounted, state } = usePresence(open);
  const code = (value || "").toUpperCase();
  const selected = COUNTRIES.find((c) => c.code === code);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return COUNTRIES;
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(s) || c.code.toLowerCase().includes(s));
  }, [q]);

  // Bring the chosen country into view when the list opens.
  useEffect(() => {
    if (open) list.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [open]);

  const pick = (c) => { onChange(c.code); close(true); };
  const options = () => Array.from(list.current?.querySelectorAll<HTMLButtonElement>(".dd-opt") ?? []);
  const onKey = (e) => {
    // Escape closes the list only, not the modal around it.
    if (e.key === "Escape") { if (open) { e.preventDefault(); e.stopPropagation(); close(true); } return; }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const all = options();
    if (!all.length) return;
    const at = all.indexOf(document.activeElement as HTMLButtonElement);
    const next = at < 0 ? (e.key === "ArrowDown" ? 0 : all.length - 1) : Math.min(all.length - 1, Math.max(0, at + (e.key === "ArrowDown" ? 1 : -1)));
    all[next].focus();
  };

  return (
    <div className="fld" ref={ref}>
      <label className="field-l" htmlFor={id}>{label}{hint && <span className="field-hint"> {hint}</span>}</label>
      <div className={`dd${open ? " open" : ""}`} onKeyDown={onKey}>
        <button
          type="button" id={id} ref={btn} className="dd-btn"
          aria-haspopup="listbox" aria-expanded={open} aria-controls={listId}
          onClick={() => (open ? close() : setOpen(true))}
        >
          {selected
            ? <span className="dd-val"><span className="country-opt"><CountryFlag code={selected.code} /> {selected.name} ({selected.code})</span></span>
            : <span className="dd-val dd-placeholder">{placeholder || "Select…"}</span>}
          <svg className="dd-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
        </button>
        {mounted && (
          <div className="dd-list country-list" data-state={state} ref={list}>
            <input
              className="field country-search" autoFocus value={q} onChange={(e) => setQ(e.target.value)}
              placeholder={searchPlaceholder || placeholder || "Search…"} aria-label={searchPlaceholder || "Search"} aria-controls={listId}
            />
            <div role="listbox" id={listId} aria-label={label}>
              {filtered.map((c) => (
                <button
                  type="button" key={c.code} role="option" aria-selected={c.code === code}
                  className={`dd-opt${c.code === code ? " cur" : ""}`} onClick={() => pick(c)}
                >
                  <CountryFlag code={c.code} />
                  <span className="dd-opt-main"><span className="dd-opt-l">{c.name}</span></span>
                  <span className="dd-opt-n">{c.code}</span>
                </button>
              ))}
              {filtered.length === 0 && <div className="dd-opt" aria-disabled="true">-</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
