/* /api/admin/* — platform-owner-only proxy to the Payments API global admin endpoints
   (summary, consumers, payment-intents, swaps, customers, products, receivers, payins,
   payouts). Only an account owner/admin may reach it (verified in adminProxy); it sets
   the trusted X-Cosmos-Admin marker so the Payments service returns cross-consumer data. */
import type { APIRoute } from "astro";
import { adminProxy } from "@/lib/cosmos-proxy";

export const ALL: APIRoute = (ctx) => adminProxy(ctx);
