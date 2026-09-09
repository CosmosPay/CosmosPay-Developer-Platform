/* GET /api/public-key?env=dev|prod — the shared API key the wallet uses when the
   user has no account of their own.

   Handing out a credential from an unauthenticated route reads alarming, so be
   precise about what this is: the key is compiled into an open-source wallet
   published on app stores. It is already public in the only sense that matters,
   and pretending otherwise would buy nothing while costing the ability to rotate.
   Serving it here is what makes rotation possible at all — mint a new key and
   every wallet picks it up on its next fetch, instead of waiting on an app-store
   review cycle for a value baked into a build.

   What keeps it safe is on the other side of the gateway. The key carries
   `role: 'public'`, and the Payments service's PublicKeyGuard confines that role
   to handlers marked @AllowPublicKey — quotes, envelope builders, on-chain reads,
   telemetry ingest. Every endpoint that replays what a consumer previously wrote
   is refused, because every anonymous caller shares this one consumer. And the
   key signs nothing: the gateway returns unsigned envelopes for the device to
   sign, so the wallet stays non-custodial whether or not its user registered.

   Rate-limited anyway. Not because the value is secret, but because provisioning
   it touches APISIX and a flood of cold requests should not become a flood of
   upstream calls. The cache is what actually absorbs that; the budget is the
   backstop. */
import type { APIRoute } from "astro";
import { ApiStatus, jsonError, jsonSuccess } from "@/lib/http";
import { ensurePublicKeys } from "@/lib/public-key";
import { clientIp } from "@/lib/geo";
import { withinBudget } from "@/lib/rate-limit";

const WINDOW_MS = 10 * 60 * 1000;
const PUBLIC_KEY_RATE_LIMIT = { limit: 30, windowMs: WINDOW_MS };
const PUBLIC_KEY_GLOBAL_LIMIT = { limit: 20_000, windowMs: WINDOW_MS };

/* Short next to the asset catalog's hour. The key changes only when someone
   rotates it, and when they do the point is that wallets notice quickly — a long
   TTL here would keep handing out a key that is on its way to being deleted. */
const CACHE_TTL_MS = 5 * 60 * 1000;
let cache: { at: number; keys: { dev: string | null; prod: string | null } } | null = null;

export const GET: APIRoute = async (ctx) => {
  const url = new URL(ctx.request.url);
  const env = url.searchParams.get("env") === "prod" ? "prod" : "dev";

  if (!cache || Date.now() - cache.at >= CACHE_TTL_MS) {
    const address = clientIp(ctx.request.headers, ctx.clientAddress) ?? "unknown";
    if (!withinBudget("public-key", address, PUBLIC_KEY_RATE_LIMIT, PUBLIC_KEY_GLOBAL_LIMIT)) {
      if (cache) return ok(cache.keys[env], env);
      return jsonError({ message: "Too many requests — slow down.", code: 429, status: ApiStatus.BAD_REQUEST });
    }
    try {
      cache = { at: Date.now(), keys: await ensurePublicKeys() };
    } catch {
      if (cache) return ok(cache.keys[env], env);
      return jsonError({
        message: "Public access is temporarily unavailable.",
        code: 503,
        status: ApiStatus.INTERNAL_ERROR,
      });
    }
  }

  const key = cache.keys[env];
  if (!key) {
    // Provisioning ran and this environment still has no key. Say so plainly:
    // the wallet's fallback is its bundled key, and an empty string would look
    // like a valid answer and produce a 401 later, far from the cause.
    return jsonError({
      message: `No public key is provisioned for the ${env} environment.`,
      code: 503,
      status: ApiStatus.INTERNAL_ERROR,
    });
  }
  return ok(key, env);
};

/* Cacheable, but privately and briefly: a shared cache holding this for an hour
   would outlive a rotation, and the whole reason the key is served rather than
   only compiled in is that a rotation should take effect quickly. */
function ok(key: string | null, env: string): Response {
  const res = jsonSuccess({ data: { env, apiKey: key }, message: "Public access key" });
  res.headers.set("Cache-Control", "public, max-age=300");
  return res;
}
