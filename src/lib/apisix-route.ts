/* apisix-route.ts — keep the Cosmos API route in APISIX pointing at the current
   COSMOS_API_URL. Both the APISIX gateway and the Cosmos API address change often (dev
   tunnels, redeploys), so we (re)create the route once each time the app process starts. */
import { createRoute } from "@/utils/apisix";
import { APISSIX_ROUTE_ID, COSMOS_API_ENTRY, COSMOS_API_URL } from "astro:env/server";

/* PUT the route into APISIX (create or update its upstream + URI). Best-effort. */
export async function syncCosmosRoute() {
  const result = await createRoute(APISSIX_ROUTE_ID, COSMOS_API_ENTRY, COSMOS_API_URL).catch(() => null);
  if (!result) {
    console.warn(`[apisix] Failed to sync route "${APISSIX_ROUTE_ID}" -> ${COSMOS_API_URL}`);
  } else {
    console.info(`[apisix] Route "${APISSIX_ROUTE_ID}" ${result.created ? "created" : "updated"} -> ${COSMOS_API_URL}`);
  }
  return result;
}

let started: Promise<unknown> | null = null;
/* Run the route sync exactly once per server process. Idempotent + non-blocking — safe to
   call from the middleware on every request; only the first call does any work. */
export function ensureCosmosRouteSynced(): Promise<unknown> {
  if (!started) started = syncCosmosRoute().catch(() => null);
  return started;
}
