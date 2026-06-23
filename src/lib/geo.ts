/* geo.ts — best-effort request geolocation from CDN/proxy headers (+ client IP).
   Country comes from a CDN header (Cloudflare/Vercel/etc.); region falls back to a
   coarse continent derived from the country. No external geo-IP calls are made. */

const COUNTRY_HEADERS = ["cf-ipcountry", "x-vercel-ip-country", "x-country-code", "x-geo-country", "x-appengine-country"];
const REGION_HEADERS = ["x-vercel-ip-country-region", "cf-region", "x-geo-region"];
const CITY_HEADERS = ["x-vercel-ip-city", "cf-ipcity", "x-geo-city"];
const IP_HEADERS = ["cf-connecting-ip", "x-real-ip", "x-forwarded-for", "x-client-ip"];

/* country code → coarse region (continent) for a human-readable default */
const CONTINENT: Record<string, string> = {
  US: "North America", CA: "North America", MX: "North America",
  AR: "South America", BR: "South America", CL: "South America", CO: "South America", PE: "South America", UY: "South America", VE: "South America", EC: "South America", BO: "South America", PY: "South America",
  GB: "Europe", IE: "Europe", FR: "Europe", DE: "Europe", ES: "Europe", PT: "Europe", IT: "Europe", NL: "Europe", BE: "Europe", CH: "Europe", AT: "Europe", SE: "Europe", NO: "Europe", DK: "Europe", FI: "Europe", PL: "Europe", CZ: "Europe", RO: "Europe", GR: "Europe", UA: "Europe", RU: "Europe",
  CN: "Asia", JP: "Asia", KR: "Asia", IN: "Asia", ID: "Asia", SG: "Asia", MY: "Asia", TH: "Asia", VN: "Asia", PH: "Asia", AE: "Asia", SA: "Asia", IL: "Asia", TR: "Asia", HK: "Asia", TW: "Asia",
  ZA: "Africa", NG: "Africa", EG: "Africa", KE: "Africa", MA: "Africa", GH: "Africa",
  AU: "Oceania", NZ: "Oceania",
};

function firstHeader(headers: Headers, names: string[]): string | null {
  for (const n of names) {
    const v = headers.get(n);
    if (v && v.trim() && v.trim().toUpperCase() !== "XX") return v.trim();
  }
  return null;
}

export function clientIp(headers: Headers, fallback?: string | null): string | null {
  const v = firstHeader(headers, IP_HEADERS);
  if (v) return v.split(",")[0].trim();
  return fallback || null;
}

export function clientCountry(headers: Headers): string | null {
  const v = firstHeader(headers, COUNTRY_HEADERS);
  return v ? v.toUpperCase() : null;
}

export function continentOf(country: string | null): string | null {
  if (!country) return null;
  return CONTINENT[country.toUpperCase()] || "Global";
}

export function clientRegion(headers: Headers, country: string | null): string | null {
  return firstHeader(headers, REGION_HEADERS) || continentOf(country);
}

export function clientCity(headers: Headers): string | null {
  const v = firstHeader(headers, CITY_HEADERS);
  return v ? decodeURIComponent(v) : null;
}

const SUPPORTED_LANGS = ["en", "es", "pt", "fr", "de"];
export function clientLanguage(headers: Headers): string | null {
  const al = headers.get("accept-language");
  if (!al) return null;
  const code = al.split(",")[0].split("-")[0].toLowerCase();
  return SUPPORTED_LANGS.includes(code) ? code : null;
}

/* A short human label for where a request came from, e.g. "Madrid, ES" or "ES" or an IP. */
export function originLabel(headers: Headers, ip: string | null): string {
  const city = clientCity(headers);
  const country = clientCountry(headers);
  if (city && country) return `${city}, ${country}`;
  if (country) return country;
  return ip || "unknown";
}

/* Loopback / private (RFC1918, link-local, ULA) ranges → treated as "localhost". */
export function isLocalIp(ip: string | null | undefined): boolean {
  if (!ip) return true;
  let v = ip.split(",")[0].trim().replace(/^\[/, "").replace(/\]$/, "");
  if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(v)) v = v.split(":")[0];
  v = v.toLowerCase();
  return (
    v === "::1" || v === "::" || v === "127.0.0.1" || v === "localhost" ||
    v.startsWith("10.") || v.startsWith("192.168.") || /^172\.(1[6-9]|2\d|3[01])\./.test(v) ||
    v.startsWith("169.254.") || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80")
  );
}

export function clientUserAgent(headers: Headers): string | null {
  return headers.get("user-agent") || null;
}

export interface ResolvedLocation {
  ip: string | null;        // display IP — "localhost" when the request is local
  publicIp: string | null;  // resolved public IP (real client IP, or the dev machine's public IP)
  country: string | null;
  region: string | null;
  city: string | null;
  origin: string;
  isLocal: boolean;
  userAgent: string | null;
}

/* Resolve the request's location:
   - production: real client IP from CDN headers, enriched/complemented with MaxMind.
   - localhost (dev): IP shown as "localhost", but country/region/city + public IP are
     fetched from a public service so activity stays realistic. */
export async function geoLocate(headers: Headers, ipFallback?: string | null): Promise<ResolvedLocation> {
  const { lookupIp, fetchPublicGeo } = await import("@/lib/geoip");
  const rawIp = clientIp(headers, ipFallback);
  const local = isLocalIp(rawIp);

  let country = clientCountry(headers);
  let region = firstHeader(headers, REGION_HEADERS); // header region only (continent added later)
  let city = clientCity(headers);
  let publicIp: string | null = local ? null : rawIp;

  if (local) {
    const pg = await fetchPublicGeo().catch(() => null);
    if (pg) {
      publicIp = pg.ip;
      country = country || pg.country;
      region = region || pg.region;
      city = city || pg.city;
    }
  } else if (!country || !region || !city) {
    const mm = await lookupIp(rawIp).catch(() => null);
    if (mm) {
      country = country || mm.country;
      region = region || mm.region;
      city = city || mm.city;
    }
  }
  region = region || continentOf(country);

  const ip = local ? "localhost" : rawIp;
  const place = city && country ? `${city}, ${country}` : country || null;
  const origin = local ? (place ? `localhost · ${place}` : "localhost") : (place || ip || "unknown");

  return {
    ip,
    publicIp,
    country: country || null,
    region: region || null,
    city: city || null,
    origin,
    isLocal: local,
    userAgent: clientUserAgent(headers),
  };
}
