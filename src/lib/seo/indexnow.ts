/* indexnow.ts: IndexNow (https://www.indexnow.org/documentation), the protocol Bing (which also
   feeds ChatGPT search and Copilot), Yandex, Seznam, Naver and Yep share to learn about new and
   changed URLs right away instead of on their next crawl. A submission names a host and a key;
   the engines check that the host serves that key at /<key>.txt (src/pages/[key].txt.ts, on every
   domain) before they take the URLs. scripts/indexnow.mjs reads each domain's live sitemap and
   posts its URLs with the helpers below. Pure, so tests/unit/seoIndexNow.test.ts covers it. */

/** The shared endpoint: a submission there reaches every IndexNow engine. */
export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

/** The most URLs one POST may carry. */
export const MAX_URLS_PER_REQUEST = 10_000;

/* The protocol's key: 8 to 128 characters, letters, digits and "-". */
const KEY = /^[A-Za-z0-9-]{8,128}$/;
/* Its file at the root of a host, the only place that vouches for every URL on it. */
const KEY_FILE = /^\/[A-Za-z0-9-]{8,128}\.txt$/;

/** Whether `value` is a key the protocol accepts. */
export function isIndexNowKey(value: unknown): value is string {
  return typeof value === "string" && KEY.test(value);
}

/** The path of a key's file: `/<key>.txt`. */
export function keyFilePath(key: string): string {
  return `/${key}.txt`;
}

/**
 * Whether `path` has the shape of a key file. src/lib/hosts.ts lets such a path through on every
 * domain without knowing the key (it is set at runtime); the route answers 404 for any name but
 * the configured key.
 */
export function isKeyFilePath(path: string): boolean {
  return KEY_FILE.test(path);
}

/** The body of `/<requested>.txt`: the key when that is the configured one, else null (a 404). */
export function keyFileBody(requested: string | undefined, key: string | undefined): string | null {
  return isIndexNowKey(key) && requested === key ? key : null;
}

/** Whether a fetched key file proves the key (the engines' own check). */
export function keyFileMatches(body: string, key: string): boolean {
  return body.trim() === key;
}

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
}

/** A urlset lists pages; a sitemap index lists more sitemaps (the platform's names the docs'). */
export type ParsedSitemap = { kind: "urlset"; entries: SitemapEntry[] } | { kind: "index"; entries: SitemapEntry[] };

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

/* An element's text: CDATA as written, anything else with its entities decoded. */
function text(raw: string): string {
  const cdata = /^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/.exec(raw);
  if (cdata) return cdata[1].trim();
  return raw
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, name: string) => {
      if (name[0] !== "#") return ENTITIES[name.toLowerCase()] ?? match;
      const code = name[1] === "x" || name[1] === "X" ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    })
    .trim();
}

/* The first <name> child's text inside one entry, a namespace prefix allowed. */
function child(block: string, name: string): string | undefined {
  const match = new RegExp(`<(?:[\\w.-]+:)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w.-]+:)?${name}\\s*>`, "i").exec(block);
  return match ? text(match[1]) || undefined : undefined;
}

/**
 * The entries of a sitemap (https://www.sitemaps.org/protocol.html): each <url> or <sitemap>
 * with its <loc> and <lastmod>. The hreflang alternates (<xhtml:link href>) are versions that
 * have entries of their own, so only <loc> counts. Null when the document is neither a urlset
 * nor a sitemap index (an HTML error page, say).
 */
export function parseSitemap(xml: string): ParsedSitemap | null {
  const doc = xml.replace(/<!--[\s\S]*?-->/g, "");
  const root = /<(?:[\w.-]+:)?(urlset|sitemapindex)[\s>]/i.exec(doc);
  if (!root) return null;
  const kind = root[1].toLowerCase() === "urlset" ? "urlset" : "index";
  const tag = kind === "urlset" ? "url" : "sitemap";
  const blocks = doc.matchAll(new RegExp(`<(?:[\\w.-]+:)?${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w.-]+:)?${tag}\\s*>`, "gi"));
  const entries: SitemapEntry[] = [];
  for (const [, block] of blocks) {
    const loc = child(block, "loc");
    if (!loc) continue;
    const lastmod = child(block, "lastmod");
    entries.push(lastmod ? { loc, lastmod } : { loc });
  }
  return { kind, entries };
}

/* W3C Datetime, the format of <lastmod>: a year, a month, a day, or a time with its zone. */
const W3C_DATETIME = /^(\d{4})(?:-(\d{2})(?:-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(?:Z|[+-](\d{2}):(\d{2})))?)?)?$/;

/**
 * Milliseconds since the epoch for a W3C Datetime (a bare date is midnight UTC), else null. Each
 * part is checked, because Date.parse rolls an impossible date over (2026-02-30 is March 2).
 */
export function parseW3cDate(value: string): number | null {
  const trimmed = value.trim();
  const match = W3C_DATETIME.exec(trimmed);
  if (!match) return null;
  const [year, month = 1, day = 1, hour = 0, minute = 0, second = 0, zoneHour = 0, zoneMinute = 0] = match
    .slice(1)
    .map((part) => (part === undefined ? undefined : Number(part)));
  const date = new Date(Date.UTC(year!, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  if (hour > 23 || minute > 59 || second > 59 || zoneHour > 23 || zoneMinute > 59) return null;
  const ms = Date.parse(trimmed);
  return Number.isNaN(ms) ? null : ms;
}

export interface HostFilter {
  /** Each URL once, in sitemap order, all on the host. */
  kept: SitemapEntry[];
  /** URLs on another host, or not http(s) at all: IndexNow refuses them (422). */
  foreign: string[];
}

/**
 * The entries whose URL is on `origin`'s host (http or https, as the protocol allows), each URL
 * once. A submission may only name URLs of the host it is for.
 */
export function onHost(entries: SitemapEntry[], origin: string): HostFilter {
  const host = new URL(origin).host;
  const seen = new Set<string>();
  const kept: SitemapEntry[] = [];
  const foreign: string[] = [];
  for (const entry of entries) {
    let url: URL;
    try {
      url = new URL(entry.loc);
    } catch {
      foreign.push(entry.loc);
      continue;
    }
    if ((url.protocol !== "https:" && url.protocol !== "http:") || url.host !== host) {
      foreign.push(entry.loc);
      continue;
    }
    if (seen.has(url.href)) continue;
    seen.add(url.href);
    kept.push({ ...entry, loc: url.href });
  }
  return { kept, foreign };
}

export interface SinceFilter {
  /** lastmod on or after the date. */
  changed: SitemapEntry[];
  /** No lastmod (or one that is not a date): nothing says they changed, so they are left out. */
  undated: SitemapEntry[];
  /** lastmod before the date. */
  older: SitemapEntry[];
}

/** Splits entries by their lastmod against `since` (milliseconds since the epoch). */
export function changedSince(entries: SitemapEntry[], since: number): SinceFilter {
  const result: SinceFilter = { changed: [], undated: [], older: [] };
  for (const entry of entries) {
    const ms = entry.lastmod === undefined ? null : parseW3cDate(entry.lastmod);
    if (ms === null) result.undated.push(entry);
    else if (ms >= since) result.changed.push(entry);
    else result.older.push(entry);
  }
  return result;
}

/** `items` in runs of at most `size` (the protocol's 10,000 by default). */
export function inBatches<T>(items: readonly T[], size: number = MAX_URLS_PER_REQUEST): T[][] {
  if (!Number.isInteger(size) || size < 1) throw new RangeError(`batch size must be a positive integer, got ${size}`);
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) batches.push(items.slice(i, i + size));
  return batches;
}

export interface IndexNowPayload {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
}

/** The JSON body of one submission for `origin`'s host, its key file at the root. */
export function submissionPayload(origin: string, key: string, urlList: string[]): IndexNowPayload {
  const { host, origin: base } = new URL(origin);
  return { host, key, keyLocation: `${base}${keyFilePath(key)}`, urlList };
}

/**
 * Whether URLs of `origin` can be submitted at all: an https origin with a public name. A local
 * setup's origins (localhost, *.localhost, an IP address) are nothing an engine can crawl.
 */
export function isSubmittableOrigin(origin: string): boolean {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  const host = url.hostname;
  if (url.protocol !== "https:" || !host.includes(".")) return false;
  if (host === "localhost" || host.endsWith(".localhost")) return false;
  return !/^[\d.]+$/.test(host) && !host.startsWith("[");
}

/** What an IndexNow answer means (the protocol's table), and whether it took the URLs. */
export function describeStatus(status: number): { ok: boolean; meaning: string } {
  switch (status) {
    case 200:
      return { ok: true, meaning: "OK: URLs received" };
    case 202:
      return { ok: true, meaning: "Accepted: URLs received, key validation pending" };
    case 400:
      return { ok: false, meaning: "Bad request: invalid format" };
    case 403:
      return { ok: false, meaning: "Forbidden: key not valid (key file not found, or it does not hold the key)" };
    case 422:
      return { ok: false, meaning: "Unprocessable: URLs not on this host, or a key the protocol does not accept" };
    case 429:
      return { ok: false, meaning: "Too many requests (potential spam): wait before submitting again" };
    default:
      return { ok: status >= 200 && status < 300, meaning: `HTTP ${status}` };
  }
}
