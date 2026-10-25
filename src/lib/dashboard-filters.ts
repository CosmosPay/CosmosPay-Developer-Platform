/* The dashboard's list filters, as pure functions: date ranges, the search box, counts per
   value for the status tabs, and the filters' place in the URL (so a filtered list survives a
   reload and can be shared). The views and the FilterBar component wire them to React. */

export const DATE_RANGES = ["any", "today", "7d", "30d", "90d"] as const;
export type DateRange = (typeof DATE_RANGES)[number];

const RANGE_DAYS: Record<Exclude<DateRange, "any" | "today">, number> = { "7d": 7, "30d": 30, "90d": 90 };

/* Where a range starts: local midnight for today, a rolling window otherwise, nothing for any. */
export function rangeStart(range: DateRange, now: Date = new Date()): Date | null {
  if (range === "any") return null;
  if (range === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return new Date(now.getTime() - RANGE_DAYS[range] * 86_400_000);
}

export function inRange(iso: string | null | undefined, range: DateRange, now: Date = new Date()): boolean {
  const start = rangeStart(range, now);
  if (!start) return true;
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && t >= start.getTime();
}

/* Every word of the query must appear in one of the fields, in any case and order: "usdc
   gaKe" finds a USDC payment to GAKE…. An empty query matches everything. */
export function matchesQuery(fields: ReadonlyArray<string | number | null | undefined>, query: string): boolean {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = fields.filter((f) => f !== null && f !== undefined && f !== "").join(" ").toLowerCase();
  return words.every((w) => hay.includes(w));
}

/* How many rows carry each value, for the counts beside each status tab. */
export function countBy<T>(rows: readonly T[], key: (row: T) => string | null | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of rows) {
    const k = key(row);
    if (k) out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

/* A view's filters: string values, each with its default, and for the closed ones the values
   it accepts. The free-text search (`q`) accepts anything up to 120 characters. */
export type Filters = Record<string, string>;
export type Allowed = Record<string, readonly string[] | undefined>;
const MAX_QUERY = 120;

/* The filters a URL asks for, falling back to the default for a missing or unknown value. */
export function readFilters(search: string, defaults: Filters, allowed: Allowed): Filters {
  const params = new URLSearchParams(search);
  const out: Filters = { ...defaults };
  for (const key of Object.keys(defaults)) {
    const value = params.get(key);
    if (value === null) continue;
    const accepted = allowed[key];
    if (accepted) {
      if (accepted.includes(value)) out[key] = value;
    } else {
      out[key] = value.slice(0, MAX_QUERY);
    }
  }
  return out;
}

/* Writes the filters into `params`: a value that differs from its default is set, a default is
   removed, so a plain list keeps a plain URL. */
export function writeFilters(params: URLSearchParams, filters: Filters, defaults: Filters): void {
  for (const key of Object.keys(defaults)) {
    const value = filters[key] ?? defaults[key];
    if (value === defaults[key] || value === "") params.delete(key);
    else params.set(key, value);
  }
}

/* How many filters differ from their defaults: the "clear filters" button shows when any do. */
export function activeCount(filters: Filters, defaults: Filters): number {
  return Object.keys(defaults).filter((k) => (filters[k] ?? defaults[k]) !== defaults[k]).length;
}
