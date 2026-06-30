/* /api/onramp/* — dashboard proxy to the Payments API onramp (fiat → stablecoin) surface
   (quotes, payins, trustline, virtual-accounts). Forwards every method to /v1/onramp/<rest>. */
import type { APIRoute } from "astro";
import { blindpayProxy } from "@/lib/cosmos-proxy";

export const ALL: APIRoute = (ctx) => blindpayProxy(ctx, "onramp");
