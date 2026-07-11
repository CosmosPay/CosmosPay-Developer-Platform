/* /api/offramp/* — dashboard proxy to the Payments API offramp (stablecoin → fiat) surface
   (quotes, payouts/authorize, payouts, documents). Forwards every method to /v1/offramp/<rest>. */
import type { APIRoute } from "astro";
import { blindpayProxy } from "@/lib/cosmos-proxy";

export const ALL: APIRoute = (ctx) => blindpayProxy(ctx, "offramp");
