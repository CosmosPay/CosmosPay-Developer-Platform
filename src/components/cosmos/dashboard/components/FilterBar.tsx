/* FilterBar: the filters over a list, one pattern for every view. The first row has the status
   segments with how many rows each holds and how many are shown; the second the search, the
   view's own choices (network, kind…), the date range and "clear filters" once any filter is on.
   It is the list's search landmark; the counts are announced politely as they change. */
import { useT, fmt } from "@/lib/i18n/index";
import { DI } from "@/components/cosmos/dashboard/icons";
import { DATE_RANGES } from "@/lib/dashboard-filters";

type Option = { key: string; label: string; count?: number };

export function FilterBar({
  label,
  query,
  onQuery,
  placeholder,
  status = null,
  selects = [],
  date = undefined,
  onDate = undefined,
  active = 0,
  onReset,
  shown,
  total,
  loading = false,
}: {
  label: string;
  query: string;
  onQuery: (v: string) => void;
  placeholder: string;
  status?: { label: string; value: string; onChange: (v: string) => void; options: Option[] } | null;
  selects?: { key: string; label: string; value: string; onChange: (v: string) => void; options: Option[] }[];
  date?: string;
  onDate?: (v: string) => void;
  active?: number;
  onReset: () => void;
  shown?: number;
  total?: number;
  /* While the list loads its counts are unknown, so none is shown (rather than zeros). */
  loading?: boolean;
}) {
  const t = useT();
  const fl = t.dash.filters;
  return (
    <div className="fbar" role="search" aria-label={label}>
      <div className="fbar-top">
        {status && (
          <div className="seg-tabs fbar-status" role="group" aria-label={status.label}>
            {status.options.map((o) => (
              <button key={o.key} type="button" className={status.value === o.key ? "on" : ""} aria-pressed={status.value === o.key} onClick={() => status.onChange(o.key)}>
                {o.label}
                {!loading && o.count !== undefined && <span className="fbar-count">{o.count}</span>}
              </button>
            ))}
          </div>
        )}
        <p className="fbar-summary" role="status" aria-live="polite">{total === undefined ? "" : fmt(fl.shown, { n: shown ?? 0, total })}</p>
      </div>
      <div className="fbar-fields">
        <div className="fbar-search">
          {DI.search}
          <input type="search" className="field" value={query} onChange={(e) => onQuery(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
        </div>
        {selects.map((s) => (
          <select key={s.key} className="field fbar-sel" value={s.value} onChange={(e) => s.onChange(e.target.value)} aria-label={s.label}>
            {s.options.map((o) => <option key={o.key} value={o.key}>{!loading && o.count !== undefined ? `${o.label} (${o.count})` : o.label}</option>)}
          </select>
        ))}
        {onDate && (
          <select className="field fbar-sel" value={date} onChange={(e) => onDate(e.target.value)} aria-label={fl.date}>
            {DATE_RANGES.map((r) => <option key={r} value={r}>{fl.dates[r]}</option>)}
          </select>
        )}
        {active > 0 && <button type="button" className="fbar-reset" onClick={onReset}>{fl.clear}</button>}
      </div>
    </div>
  );
}
