/* console-marker.ts — the X-Cosmos-Internal value this console presents to the
   Payments service.

   The service admits a call to its cross-tenant /v1/admin surface (and exempts it
   from per-consumer rate limits) only when this header carries a fresh MAC keyed by
   the gateway secret. It used to be the literal "1", trusted because APISIX strips
   the header from client requests -- which left every admin route one forgotten
   strip away from any API key. API-key callers never hold the gateway secret, so
   they cannot mint this value, whatever a route forwards.

   No new secret: the key is COSMOS_GATEWAY_SECRET, which this backend already sends.
   The Payments service holds its own copy of the label and format
   (`src/admin/console-marker.ts` there); both repos pin the same test vector, so a
   change to one side alone fails a test instead of turning every admin screen 403. */
import { createHmac } from "node:crypto";

/** Wire format version: `v1.<unix seconds>.<hex HMAC-SHA256>`. */
const CONSOLE_MARKER_VERSION = "v1";

/** Domain-separation prefix for the MAC. Must match the Payments service's copy. */
const CONSOLE_MARKER_LABEL = "cosmos-admin-console:v1:";

/**
 * Mints the marker for one request. Minted per call rather than cached: the service
 * accepts a marker for five minutes either side of its clock, so a stale one fails.
 */
export function consoleMarker(gatewaySecret: string, nowMs: number = Date.now()): string {
  const ts = Math.floor(nowMs / 1000);
  const mac = createHmac("sha256", gatewaySecret)
    .update(CONSOLE_MARKER_LABEL + String(ts))
    .digest("hex");
  return `${CONSOLE_MARKER_VERSION}.${ts}.${mac}`;
}
