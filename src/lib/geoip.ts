/* geoip.ts — MaxMind GeoLite2-City lookups, used to fill in / refine location when the
   CDN header data is missing or coarse. The reader is opened once and cached.
   DB path: env MAXMIND_DB_PATH, else <cwd>/data/geoip/GeoLite2-City.mmdb. */
import path from "node:path";
import maxmind, { type CityResponse, type Reader } from "maxmind";

let readerPromise: Promise<Reader<CityResponse> | null> | null = null;

function dbPath(): string {
  return process.env.MAXMIND_DB_PATH || path.resolve(process.cwd(), "data/geoip/GeoLite2-City.mmdb");
}

function getReader(): Promise<Reader<CityResponse> | null> {
  if (!readerPromise) {
    readerPromise = maxmind.open<CityResponse>(dbPath()).catch(() => null);
  }
  return readerPromise;
}

export interface GeoLookup {
  country: string | null;
  region: string | null;
  city: string | null;
}

/* Normalise an IP for lookup: take the first of an X-Forwarded-For list, strip a
   trailing :port, drop IPv6 brackets, and reject obvious private/loopback ranges. */
function normalizeIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  let v = ip.split(",")[0].trim().replace(/^\[/, "").replace(/\]$/, "");
  // strip :port only for IPv4-with-port (avoid breaking IPv6)
  if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(v)) v = v.split(":")[0];
  if (!v || v === "::1" || v === "127.0.0.1" || v.startsWith("10.") || v.startsWith("192.168.") || /^172\.(1[6-9]|2\d|3[01])\./.test(v) || v.startsWith("fc") || v.startsWith("fd")) {
    return null;
  }
  return v;
}

export async function lookupIp(ip: string | null | undefined): Promise<GeoLookup | null> {
  const addr = normalizeIp(ip);
  if (!addr) return null;
  const reader = await getReader();
  if (!reader) return null;
  try {
    const r = reader.get(addr);
    if (!r) return null;
    return {
      country: r.country?.iso_code ?? null,
      region: r.subdivisions?.[0]?.names?.en ?? null,
      city: r.city?.names?.en ?? null,
    };
  } catch {
    return null;
  }
}

/* When the request comes from localhost (dev), we have no real client IP. Resolve the
   server's *public* IP + approximate location from a free service so activity is still
   realistic. Cached for 30 min to avoid hammering the API on every request. */
export interface PublicGeo extends GeoLookup {
  ip: string | null;
}
let publicGeoCache: { at: number; data: PublicGeo | null } | null = null;
const PUBLIC_GEO_TTL = 30 * 60 * 1000;

export async function fetchPublicGeo(): Promise<PublicGeo | null> {
  if (publicGeoCache && Date.now() - publicGeoCache.at < PUBLIC_GEO_TTL) {
    return publicGeoCache.data;
  }
  let data: PublicGeo | null = null;
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch("https://ipapi.co/json/", {
      signal: ctrl.signal,
      headers: { "User-Agent": "cosmos-pay/1.0" },
    });
    clearTimeout(to);
    if (res.ok) {
      const j: any = await res.json();
      if (j && !j.error) {
        data = {
          ip: j.ip ?? null,
          country: j.country_code ?? j.country ?? null,
          region: j.region ?? null,
          city: j.city ?? null,
        };
      }
    }
  } catch {
    data = null;
  }
  publicGeoCache = { at: Date.now(), data };
  return data;
}
