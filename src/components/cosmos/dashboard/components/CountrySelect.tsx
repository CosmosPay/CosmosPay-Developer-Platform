import { useId, useState, useMemo } from "react";
import { COUNTRIES } from "@/lib/countries";
import { CountryFlag } from "@/components/cosmos/dashboard/components/CountryFlag";
import { useOutside } from "@/components/cosmos/dashboard/hooks";

/* A searchable country/region picker. Each option shows a flag, the country name
   and its 2-letter code, but the VALUE handed to onChange is just the code. Matches
   the Field/Sel look (.fld/.field-l/.field). */
export function CountrySelect({ label, hint, value, onChange, placeholder, searchPlaceholder }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useOutside(() => { setOpen(false); setQ(""); });
  const code = (value || "").toUpperCase();
  const selected = COUNTRIES.find((c) => c.code === code);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return COUNTRIES;
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(s) || c.code.toLowerCase().includes(s));
  }, [q]);

  const pick = (c) => { onChange(c.code); setOpen(false); setQ(""); };

  return (
    <div className="fld" ref={ref}>
      <label className="field-l" htmlFor={id}>{label}{hint && <span className="field-hint"> {hint}</span>}</label>
      <div style={{ position: "relative" }}>
        <button
          type="button" id={id} className="field"
          style={{ textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}
          aria-haspopup="listbox" aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {selected
            ? <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><CountryFlag code={selected.code} /> {selected.name} ({selected.code})</span>
            : <span style={{ opacity: 0.6 }}>{placeholder || "Select…"}</span>}
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "0 0 auto", opacity: 0.7 }}><path d="M6 9l6 6 6-6" /></svg>
        </button>
        {open && (
          <div
            role="listbox"
            style={{ position: "absolute", zIndex: 60, top: "calc(100% + 4px)", left: 0, right: 0, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, boxShadow: "0 14px 32px rgba(0,0,0,.20)", padding: 6, maxHeight: 280, overflowY: "auto" }}
          >
            <input
              className="field" autoFocus value={q} onChange={(e) => setQ(e.target.value)}
              placeholder={searchPlaceholder || placeholder || "Search…"} aria-label={searchPlaceholder || "Search"}
              style={{ marginBottom: 6 }}
            />
            {filtered.map((c) => (
              <button
                type="button" key={c.code} role="option" aria-selected={c.code === code}
                onClick={() => pick(c)}
                style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14, color: "var(--ink)", background: c.code === code ? "var(--surface-2)" : "transparent" }}
              >
                <CountryFlag code={c.code} /> {c.name} ({c.code})
              </button>
            ))}
            {filtered.length === 0 && <div style={{ padding: "8px 10px", color: "var(--ink-3)", fontSize: 14 }}>—</div>}
          </div>
        )}
      </div>
    </div>
  );
}
