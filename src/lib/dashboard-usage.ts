/* The overview's quick links follow what each person opens (product owner: the links adapt to the
   viewer's use), starting from Documentation, API keys, Webhooks and API logs. Every view opened
   counts one use; a use loses half its weight every two weeks, so links follow what someone does
   now rather than what they did once. A view needs a few recent uses to earn a place; the
   defaults fill the rest, in their order. Kept per person in their browser (Dashboard reads and
   writes it). Pure, tested in tests/unit/dashboardUsage.test.ts. */

export type Usage = Record<string, { n: number; at: number }>;

/* "docs" is the documentation (outside the dashboard); the others are views. */
export const QUICK_DEFAULTS = ["docs", "developers", "webhook", "logs"];
export const QUICK_COUNT = 4;
/* Weighted uses a view needs before it displaces a default. */
export const QUICK_MIN_SCORE = 3;
export const HALF_LIFE_MS = 14 * 86_400_000;
/* Views a quick link never points at: the overview itself and the personal account. */
const NEVER = new Set(["overview", "account"]);

const decay = (n: number, at: number, now: number) => n * 0.5 ** (Math.max(0, now - at) / HALF_LIFE_MS);

/** One more use of `key` at `now`, the earlier ones decayed. */
export function recordUse(usage: Usage, key: string, now = Date.now()): Usage {
  if (!key || NEVER.has(key)) return usage;
  const prev = usage[key];
  return { ...usage, [key]: { n: (prev ? decay(prev.n, prev.at, now) : 0) + 1, at: now } };
}

/** The links to show: the most used eligible keys with enough weight, then the defaults. */
export function quickLinks(usage: Usage, eligible: (key: string) => boolean, now = Date.now()): string[] {
  const ok = (k: string) => !NEVER.has(k) && eligible(k);
  const used = Object.entries(usage)
    .map(([k, u]) => [k, decay(u.n, u.at, now)] as const)
    .filter(([k, score]) => score >= QUICK_MIN_SCORE && ok(k))
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);
  const out: string[] = [];
  for (const k of [...used, ...QUICK_DEFAULTS]) {
    if (out.length === QUICK_COUNT) break;
    if (!out.includes(k) && ok(k)) out.push(k);
  }
  return out;
}

/** A stored value read back: anything malformed is dropped, never trusted. */
export function parseUsage(raw: string | null): Usage {
  try {
    const v = JSON.parse(raw ?? "{}");
    if (!v || typeof v !== "object" || Array.isArray(v)) return {};
    const out: Usage = {};
    for (const [k, u] of Object.entries(v as Record<string, unknown>)) {
      const r = u as { n?: unknown; at?: unknown };
      if (typeof k === "string" && k.length <= 40 && typeof r?.n === "number" && Number.isFinite(r.n) && r.n > 0 && typeof r.at === "number" && Number.isFinite(r.at)) out[k] = { n: r.n, at: r.at };
    }
    return out;
  } catch {
    return {};
  }
}
