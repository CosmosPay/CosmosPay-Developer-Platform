/* Select: the dashboard's dropdown, in place of the native <select> (which cannot be styled or
   animated). The WAI-ARIA "select-only combobox": focus stays on the button, the list follows
   with aria-activedescendant. Arrow keys, Home and End move, Enter or Space picks, Escape and
   Tab close, typing jumps to the option that starts with it, a click outside closes. The list
   pops open and closed (usePresence), and opens upwards when there is no room below. */
import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { usePresence } from "@/components/cosmos/dashboard/hooks";

export type SelectOption = { value: string; label: string; hint?: string; count?: number; icon?: ReactNode; disabled?: boolean };

export function Select({
  value,
  onChange,
  options,
  label,
  labelledBy = undefined,
  describedBy = undefined,
  id = undefined,
  variant = "field",
  placeholder = undefined,
  active = undefined,
  disabled = false,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  /* The accessible name when no visible label points at the button. */
  label?: string;
  labelledBy?: string;
  describedBy?: string;
  id?: string;
  /* "field": a form field. "filter": a filter-bar control, which shows `placeholder` (its
     name) while on its default and is marked when `active`. */
  variant?: "field" | "filter";
  placeholder?: string;
  active?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const auto = useId();
  const btnId = id || `${auto}-btn`;
  const listId = `${auto}-list`;
  const optId = (i: number) => `${auto}-opt-${i}`;
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(-1);
  const [up, setUp] = useState(false);
  const { mounted, state } = usePresence(open, 120);
  const wrap = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: "", at: 0 });

  const selectedIndex = options.findIndex((o) => o.value === value);
  const current = options[selectedIndex];

  const show = () => {
    if (disabled) return;
    setCursor(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  };
  const pick = (i: number) => {
    const o = options[i];
    if (!o || o.disabled) return;
    onChange(o.value);
    setOpen(false);
  };

  // A click outside closes it.
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);
  // Room below the button, measured on opening; otherwise the list opens upwards.
  useLayoutEffect(() => {
    if (!open || !wrap.current) return;
    const r = wrap.current.getBoundingClientRect();
    const need = Math.min(320, options.length * 40 + 12);
    setUp(window.innerHeight - r.bottom < need && r.top > need);
  }, [open, options.length]);
  // The active option stays in view.
  useEffect(() => {
    if (!open || cursor < 0 || !list.current) return;
    const el = list.current.children[cursor] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [open, cursor]);

  const move = (from: number, step: number) => {
    let i = from;
    for (let n = 0; n < options.length; n++) {
      i = (i + step + options.length) % options.length;
      if (!options[i].disabled) return i;
    }
    return from;
  };
  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    const k = e.key;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(k)) { e.preventDefault(); show(); }
      return;
    }
    if (k === "ArrowDown") { e.preventDefault(); setCursor((c) => move(c, 1)); }
    else if (k === "ArrowUp") { e.preventDefault(); setCursor((c) => move(c, -1)); }
    else if (k === "Home") { e.preventDefault(); setCursor(move(-1, 1)); }
    else if (k === "End") { e.preventDefault(); setCursor(move(options.length, -1)); }
    else if (k === "Enter" || k === " ") { e.preventDefault(); pick(cursor); }
    else if (k === "Escape") { e.preventDefault(); e.stopPropagation(); setOpen(false); }
    else if (k === "Tab") { setOpen(false); }
    else if (k.length === 1 && /\S/.test(k)) {
      // Typeahead: the letters typed within a second find the first option they start.
      const now = Date.now();
      typed.current = { text: (now - typed.current.at < 1000 ? typed.current.text : "") + k.toLowerCase(), at: now };
      const i = options.findIndex((o) => !o.disabled && o.label.toLowerCase().startsWith(typed.current.text));
      if (i >= 0) setCursor(i);
    }
  };

  const isDefault = variant === "filter" && !active;
  const shown = isDefault && placeholder ? placeholder : current ? current.label : placeholder || "";

  return (
    <div className={`dd dd-${variant}${open ? " open" : ""}${active ? " is-active" : ""}${className ? ` ${className}` : ""}`} ref={wrap}>
      <button
        type="button"
        id={btnId}
        className="dd-btn"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && cursor >= 0 ? optId(cursor) : undefined}
        aria-label={labelledBy ? undefined : label}
        aria-labelledby={labelledBy ? `${labelledBy} ${btnId}` : undefined}
        aria-describedby={describedBy}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKey}
      >
        {current?.icon && !isDefault && <span className="dd-ic" aria-hidden="true">{current.icon}</span>}
        <span className="dd-val">{shown}</span>
        <svg className="dd-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {mounted && (
        <ul ref={list} id={listId} role="listbox" aria-labelledby={labelledBy || undefined} aria-label={labelledBy ? undefined : label} className={`dd-list${up ? " up" : ""}`} data-state={state}>
          {options.map((o, i) => (
            <li
              key={o.value}
              id={optId(i)}
              role="option"
              aria-selected={o.value === value}
              aria-disabled={o.disabled || undefined}
              className={`dd-opt${i === cursor ? " cur" : ""}`}
              onMouseEnter={() => setCursor(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(i)}
            >
              {o.icon && <span className="dd-ic" aria-hidden="true">{o.icon}</span>}
              <span className="dd-opt-main">
                <span className="dd-opt-l">{o.label}</span>
                {o.hint && <span className="dd-opt-h">{o.hint}</span>}
              </span>
              {o.count !== undefined && <span className="dd-opt-n">{o.count}</span>}
              <svg className="dd-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7" /></svg>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
