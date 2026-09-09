/* POST /api/telemetry — activity reported by the Cosmos Pay Wallet.

   The wallet reports its own errors, timings and transactions. Most of what is
   worth having never becomes an API call at all: a crash on the send screen, a
   signature the user cancelled, a Horizon submit that failed on the device. This
   is where those land, and from here they go to the Payments service's
   `/v1/activity/events` like everything else.

   WHY THIS ROUTE EXISTS AT ALL, given the wallet can call the gateway directly:
   a wallet only holds a Cosmos Pay API key once it has registered an account,
   and most installs never do. Those have no credential to authenticate with, so
   they come here and are forwarded under one dedicated telemetry consumer —
   ANONYMOUS rather than misattributed. A wallet that does hold a key skips this
   route entirely and posts to the gateway itself, which is what puts its events
   in its own dashboard.

   Public, so it is bounded twice: an in-process budget per address here (plus a
   global one, because the address on a public route is only as honest as the
   proxy header it came from), and the Payments service's own Postgres-backed
   limit upstream, which partitions per wallet because we forward the address. */
import { ApiStatus, jsonError, jsonSuccess, parseJson } from "@/lib/http";
import { walletTelemetryBodySchema } from "@/schemas/activity";
import { trackWalletTelemetry } from "@/lib/activity";
import { clientIp } from "@/lib/geo";
import type { APIRoute } from "astro";
import { withinBudget } from "@/lib/rate-limit";

/* A wallet flushes a small batch every few seconds at most, and a backlog from an
   offline device arrives as a handful of full batches. Sixty calls per ten minutes
   per address is far above that and far below anything that could fill a table.
   The global bucket is what an address-rotating flood still has to fit inside. */
const WINDOW_MS = 10 * 60 * 1000;
const TELEMETRY_RATE_LIMIT = { limit: 60, windowMs: WINDOW_MS };
const TELEMETRY_GLOBAL_LIMIT = { limit: 20_000, windowMs: WINDOW_MS };

export const POST: APIRoute = async (ctx) => {
  const address = clientIp(ctx.request.headers, ctx.clientAddress) ?? "unknown";
  if (!withinBudget("telemetry", address, TELEMETRY_RATE_LIMIT, TELEMETRY_GLOBAL_LIMIT)) {
    return jsonError({ message: "Too many telemetry batches — slow down.", code: 429, status: ApiStatus.BAD_REQUEST });
  }

  const body = await parseJson(ctx.request, walletTelemetryBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: ApiStatus.BAD_REQUEST });
  }

  try {
    const result = await trackWalletTelemetry(body.data.env ?? "dev", body.data.events, address);
    return jsonSuccess({ data: result, message: "Events accepted" });
  } catch {
    // A telemetry failure is never the client's problem to solve: it must not
    // retry in a loop, and it must not surface anything to the user. 202 with a
    // zero count says "heard you, kept nothing" without inviting either.
    return jsonSuccess({ data: { accepted: 0, duplicates: 0 }, message: "Events discarded" });
  }
};
