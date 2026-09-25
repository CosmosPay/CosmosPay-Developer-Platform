/* apisix-route.ts -- keep the Cosmos API routes in APISIX pointing at the current
   COSMOS_API_URL. Both the APISIX gateway and the Cosmos API address change often (dev
   tunnels, redeploys), so we (re)create the routes once each time the app process starts.

   Several routes are synced, not one. The main one carries key-auth and serves the whole
   API; the others are keyless, each for callers that hold no API key of ours: the OAuth
   callbacks a browser lands on (Pollar's and the wallet sign-in's), the SEP-1/10/30
   standards any Stellar wallet calls, and -- when configured -- the same standards on each
   recovery server's own host. See the header over the route section in utils/apisix.ts:
   without the callback route no social login can finish a single handshake, and without
   the SEP route no wallet can discover or reach account recovery.

   COSMOS_API_URL (and each recovery upstream) may be a comma-separated list of `host:port`
   replicas; APISIX balances across them round-robin. */
import {
  apisixErrorReason,
  callbackRouteId,
  callbackRouteUris,
  createCallbackRoute,
  createRecoveryRoute,
  createRoute,
  createSepRoute,
  deleteRoute,
  legacyCallbackRouteId,
  recoveryRouteId,
  routeExists,
  sepRouteId,
  sepRouteUris,
  type RecoveryRole,
} from "@/utils/apisix";
import {
  APISSIX_ROUTE_ID,
  COSMOS_API_ENTRY,
  COSMOS_API_URL,
  COSMOS_RECOVERY_A_HOST,
  COSMOS_RECOVERY_A_UPSTREAM,
  COSMOS_RECOVERY_B_HOST,
  COSMOS_RECOVERY_B_UPSTREAM,
} from "astro:env/server";

type SyncResult = { created: boolean } | { error: string };

/* Run one route sync, turning a throw (an empty upstream, a rewrite that would touch the
   TOML) into the same `{ error }` shape a rejected PUT has, so every route logs one way. */
async function attempt(fn: () => Promise<SyncResult>): Promise<SyncResult> {
  return fn().catch((err: unknown) => ({ error: apisixErrorReason(err) }));
}

/* Paths are listed in the log so that "which route serves this URL" is answerable from the
   log alone -- the question someone debugging a 401 on a callback is actually asking. */
function describeUris(uris: () => string[]): string {
  try {
    return uris().join(", ");
  } catch {
    return "(unresolved)";
  }
}

/* Reported separately and never fatal to the main route: a deployment that cannot create a
   keyless route still serves the whole authenticated API, it just cannot do what that route
   is for -- and that is worth a line in the log that says so. */
function logKeyless(id: string, uris: string, result: SyncResult, consequence: string) {
  if ("error" in result) {
    console.warn(`[apisix] Failed to sync public route "${id}" (${uris}) — ${consequence}: ${result.error}`);
  } else {
    console.info(`[apisix] Route "${id}" ${result.created ? "created" : "updated"} -> ${uris} (no key-auth)`);
  }
}

/* One recovery role's host-bound SEP route. Both halves of the pair or neither: a host with
   no upstream would have to borrow the main one, which is the OTHER deployment's database,
   and an upstream with no host would match every host. A pair that is unset removes a route
   an earlier configuration left behind, rather than leaving it serving a retired deployment. */
async function syncRecoveryRoute(role: RecoveryRole, host: string, upstream: string) {
  const id = recoveryRouteId(APISSIX_ROUTE_ID, role);
  const label = role.toUpperCase();

  if (!host.trim() && !upstream.trim()) {
    if (await routeExists(id)) {
      await deleteRoute(id);
      console.info(`[apisix] Route "${id}" removed (COSMOS_RECOVERY_${label}_HOST/_UPSTREAM unset)`);
    }
    return;
  }
  if (!host.trim() || !upstream.trim()) {
    console.warn(
      `[apisix] Recovery server ${label} not routed: set BOTH COSMOS_RECOVERY_${label}_HOST and COSMOS_RECOVERY_${label}_UPSTREAM`,
    );
    return;
  }

  const result = await attempt(() => createRecoveryRoute(APISSIX_ROUTE_ID, role, COSMOS_API_ENTRY, host, upstream));
  logKeyless(
    id,
    `host ${host}: ${describeUris(() => sepRouteUris(COSMOS_API_ENTRY))} -> ${upstream}`,
    result,
    `recovery server ${label} is unreachable through the gateway`,
  );
}

/* PUT every route into APISIX (create or update their upstream + URI). Best-effort. */
export async function syncCosmosRoute() {
  const result = await attempt(() => createRoute(APISSIX_ROUTE_ID, COSMOS_API_ENTRY, COSMOS_API_URL));
  if ("error" in result) {
    // The reason matters more than the fact: "ECONNREFUSED" means the gateway isn't up
    // (start APISIX, or fix APISIX_URL), while an HTTP status means it is up and rejected
    // the definition. Reporting only "Failed" sends the reader to the wrong one.
    console.warn(`[apisix] Failed to sync route "${APISSIX_ROUTE_ID}" -> ${COSMOS_API_URL}: ${result.error}`);
  } else {
    console.info(`[apisix] Route "${APISSIX_ROUTE_ID}" ${result.created ? "created" : "updated"} -> ${COSMOS_API_URL}`);
  }

  const callbackId = callbackRouteId(APISSIX_ROUTE_ID);
  const callback = await attempt(() => createCallbackRoute(APISSIX_ROUTE_ID, COSMOS_API_ENTRY, COSMOS_API_URL));
  logKeyless(
    callbackId,
    describeUris(() => callbackRouteUris(COSMOS_API_ENTRY)),
    callback,
    "social login (Pollar and the wallet sign-in) will not complete",
  );

  /* Retire the Pollar-only route this one replaced -- but only once its replacement is in
     place, so a failed sync never leaves the Pollar callback with no route at all. */
  if (!("error" in callback)) {
    const legacyId = legacyCallbackRouteId(APISSIX_ROUTE_ID);
    if (await routeExists(legacyId)) {
      await deleteRoute(legacyId);
      console.info(`[apisix] Route "${legacyId}" removed (replaced by "${callbackId}")`);
    }
  }

  const sep = await attempt(() => createSepRoute(APISSIX_ROUTE_ID, COSMOS_API_ENTRY, COSMOS_API_URL));
  logKeyless(
    sepRouteId(APISSIX_ROUTE_ID),
    describeUris(() => sepRouteUris(COSMOS_API_ENTRY)),
    sep,
    "SEP-10 / SEP-30 and stellar.toml discovery are unreachable through the gateway",
  );

  await syncRecoveryRoute("a", COSMOS_RECOVERY_A_HOST ?? "", COSMOS_RECOVERY_A_UPSTREAM ?? "");
  await syncRecoveryRoute("b", COSMOS_RECOVERY_B_HOST ?? "", COSMOS_RECOVERY_B_UPSTREAM ?? "");

  return "error" in result ? null : result;
}

let started: Promise<unknown> | null = null;
/* Run the route sync exactly once per server process. Idempotent + non-blocking -- safe to
   call from the middleware on every request; only the first call does any work. */
export function ensureCosmosRouteSynced(): Promise<unknown> {
  if (!started) started = syncCosmosRoute().catch(() => null);
  return started;
}
