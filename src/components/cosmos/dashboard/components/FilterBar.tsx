/* FilterBar: the filters over a list, one row for every view. The search, then a dropdown per
   filter (status, the view's own choices, the date range): each shows its name until it is set
   and is marked while it filters, and its options carry how many rows they would show. "Clear
   filters" appears once any filter is on; the count of rows shown is announced to assistive tech
   only (the pager under the table shows the range; product owner: no "13 of 13" beside the
   buttons). The view's own
   actions (create a payment, add a product) close the row on its right (`actions`; product owner:
   at the filters' height, not on a row of their own above the list). The filters are the list's
   search landmark; the count is announced politely as it changes. */
import type { ReactNode } from "react";
import { useT, fmt } from "@/lib/i18n/index";
import { DI } from "@/components/cosmos/dashboard/icons";
import { Select } from "@/components/cosmos/dashboard/components/Select";
import { DATE_RANGES } from "@/lib/dashboard-filters";

type Option = { key: string; label: string; count?: number };
type Filter = { key: string; label: string; value: string; onChange: (v: string) => void; options: Option[] };

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
  actions = null,
}: {
  label: string;
  query: string;
  onQuery: (v: string) => void;
  placeholder: string;
  status?: Omit<Filter, "key"> | null;
  selects?: Filter[];
  date?: string;
  onDate?: (v: string) => void;
  active?: number;
  onReset: () => void;
  shown?: number;
  total?: number;
  /* While the list loads its counts are unknown, so none is shown (rather than zeros). */
  loading?: boolean;
  /* The view's buttons, at the row's right end. */
  actions?: ReactNode;
}) {
  const t = useT();
  const fl = t.dash.filters;
  // Every filter's first option is its "all" value: the dropdown shows the filter's name there.
  const filters: Filter[] = [
    ...(status ? [{ key: "status", ...status }] : []),
    ...selects,
    ...(onDate ? [{ key: "date", label: fl.date, value: date, onChange: onDate, options: DATE_RANGES.map((r) => ({ key: r, label: fl.dates[r] })) }] : []),
  ];
  return (
    <div className="fbar">
      <div className="fbar-filters" role="search" aria-label={label}>
        <div className="fbar-search">
          {DI.search}
          <input type="search" className="field" value={query} onChange={(e) => onQuery(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
        </div>
        {filters.map((f) => (
          <Select
            key={f.key}
            variant="filter"
            className="fbar-dd"
            label={f.label}
            placeholder={f.label}
            active={f.value !== f.options[0]?.key}
            value={f.value}
            onChange={f.onChange}
            options={f.options.map((o) => ({ value: o.key, label: o.label, count: loading ? undefined : o.count }))}
          />
        ))}
        {active > 0 && <button type="button" className="fbar-reset" onClick={onReset}>{fl.clear}</button>}
        <p className="fbar-summary sr-only" role="status" aria-live="polite">{total === undefined ? "" : fmt(fl.shown, { n: shown ?? 0, total })}</p>
      </div>
      {actions && <div className="fbar-actions">{actions}</div>}
    </div>
  );
}
