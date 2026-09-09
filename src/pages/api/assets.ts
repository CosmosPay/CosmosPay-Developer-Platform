/* GET /api/assets?network=public|testnet — the public asset catalog.

   The unauthenticated mirror of the Payments service's `/v1/assets`. It exists
   because the catalog is the one thing a wallet needs BEFORE it has any
   credential: the token picker, the trustline screen and the swap screen all
   resolve (code, issuer) pairs, and a fresh install has no API key at all. Making
   them wait for one would mean a first-run wallet that cannot name the asset it is
   about to trust — which is exactly the moment naming it matters most.

   It does NOT hold its own copy of the list. A second hand-maintained issuer table
   is a second place to be wrong about which of the twenty accounts issuing `USDC`
   is Circle's, and the drift would be invisible: both copies keep serving 200s.
   So this proxies upstream and caches the answer in-process.

   Public, and therefore bounded twice — a per-address budget and a global one,
   because the address on a public route is only as trustworthy as the proxy header
   it arrived in. The cache does most of the work: a hit costs no upstream call, so
   the limits only ever bite on cold entries. */
import type { APIRoute } from "astro";
import { ApiStatus, jsonError, jsonSuccess } from "@/lib/http";
import { fetchAssetRegistry, type AssetRegistryPayload } from "@/lib/cosmos";
import { clientIp } from "@/lib/geo";
import { withinBudget } from "@/lib/rate-limit";

const WINDOW_MS = 10 * 60 * 1000;
const ASSETS_RATE_LIMIT = { limit: 60, windowMs: WINDOW_MS };
const ASSETS_GLOBAL_LIMIT = { limit: 20_000, windowMs: WINDOW_MS };

/* Two networks, two entries, refreshed on demand. The registry changes a handful
   of times a year, so a long TTL costs nothing a client notices — and every wallet
   also ships a bundled fallback, so the worst a stale entry does is omit an asset
   added in the last hour. */
const CACHE_TTL_MS = 60 * 60 * 1000;
const cache = new Map<string, { at: number; payload: AssetRegistryPayload }>();

export const GET: APIRoute = async (ctx) => {
  const url = new URL(ctx.request.url);
  const network = url.searchParams.get("network") === "testnet" ? "testnet" : "public";

  const cached = cache.get(network);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return ok(cached.payload);
  }

  const address = clientIp(ctx.request.headers, ctx.clientAddress) ?? "unknown";
  if (!withinBudget("assets", address, ASSETS_RATE_LIMIT, ASSETS_GLOBAL_LIMIT)) {
    // Serve whatever we have rather than failing: an expired entry is a far better
    // answer than none, and the client's alternative is its bundled copy anyway.
    if (cached) return ok(cached.payload);
    return jsonError({ message: "Too many requests — slow down.", code: 429, status: ApiStatus.BAD_REQUEST });
  }

  try {
    const payload = await fetchAssetRegistry(network);
    cache.set(network, { at: Date.now(), payload });
    return ok(payload);
  } catch {
    // Upstream is down. A stale entry still names the right issuers — the list is
    // not time-sensitive — so prefer it over an error the wallet has to handle.
    if (cached) return ok(cached.payload);
    return jsonError({
      message: "The asset catalog is temporarily unavailable.",
      code: 503,
      status: ApiStatus.INTERNAL_ERROR,
    });
  }
};

/* Cacheable by anything in the path: the response carries no identity and is the
   same for every caller. `stale-while-revalidate` lets an edge keep serving the
   old list while it refreshes, which is the correct trade for reference data. */
function ok(payload: AssetRegistryPayload): Response {
  const res = jsonSuccess({ data: payload, message: "Asset catalog" });
  res.headers.set("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
  return res;
}
