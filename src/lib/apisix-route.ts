/* apisix-route.ts -- keep the Cosmos API routes in APISIX pointing at the current
   COSMOS_API_URL. Both the APISIX gateway and the Cosmos API address change often (dev
   tunnels, redeploys), so we (re)create the routes once each time the app process starts.

   TWO routes are synced, not one. The main one carries key-auth and serves the whole
   API; the second serves only the Pollar OAuth callback and carries none, because the
   user's browser lands there with no API key after consenting at Google or GitHub. See
   the header over cosmosRoutePlugins() in utils/apisix.ts -- without that second route
   social login cannot finish a single handshake. */
import { apisixErrorReason, callbackRouteId, callbackRouteUri, createCallbackRoute, createRoute } from "@/utils/apisix";
import { APISSIX_ROUTE_ID, COSMOS_API_ENTRY, COSMOS_API_URL } from "astro:env/server";

/* PUT both routes into APISIX (create or update their upstream + URI). Best-effort. */
export async function syncCosmosRoute() {
  const result = await createRoute(APISSIX_ROUTE_ID, COSMOS_API_ENTRY, COSMOS_API_URL)
    .catch((err: unknown) => ({ error: apisixErrorReason(err) }) as const);
  if ("error" in result) {
    // The reason matters more than the fact: "ECONNREFUSED" means the gateway isn't up
    // (start APISIX, or fix APISIX_URL), while an HTTP status means it is up and rejected
    // the definition. Reporting only "Failed" sends the reader to the wrong one.
    console.warn(`[apisix] Failed to sync route "${APISSIX_ROUTE_ID}" -> ${COSMOS_API_URL}: ${result.error}`);
  } else {
    console.info(`[apisix] Route "${APISSIX_ROUTE_ID}" ${result.created ? "created" : "updated"} -> ${COSMOS_API_URL}`);
  }

  // Reported separately and never fatal to the call above: a deployment that cannot
  // create it still serves the whole authenticated API, it just cannot complete a
  // social login -- and that is worth a line in the log that says so.
  const callback = await createCallbackRoute(APISSIX_ROUTE_ID, COSMOS_API_ENTRY, COSMOS_API_URL)
    .catch((err: unknown) => ({ error: apisixErrorReason(err) }) as const);
  const callbackId = callbackRouteId(APISSIX_ROUTE_ID);
  if ("error" in callback) {
    console.warn(
      `[apisix] Failed to sync public route "${callbackId}" (${callbackRouteUri(COSMOS_API_ENTRY)}) — Pollar social login will not complete: ${callback.error}`,
    );
  } else {
    console.info(
      `[apisix] Route "${callbackId}" ${callback.created ? "created" : "updated"} -> ${callbackRouteUri(COSMOS_API_ENTRY)} (no key-auth)`,
    );
  }

  return "error" in result ? null : result;
}

let started: Promise<unknown> | null = null;
/* Run the route sync exactly once per server process. Idempotent + non-blocking -- safe to
   call from the middleware on every request; only the first call does any work. */
export function ensureCosmosRouteSynced(): Promise<unknown> {
  if (!started) started = syncCosmosRoute().catch(() => null);
  return started;
}
