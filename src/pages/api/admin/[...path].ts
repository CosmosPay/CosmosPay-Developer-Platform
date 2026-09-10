/* /api/admin/* — platform-owner-only proxy to the Payments API global admin endpoints
   (summary, consumers, payment-intents, swaps, customers, products, receivers, payins,
   payouts). Only an account owner/admin may reach it (verified in adminProxy); it sets
   the Payments service's platform-admin Bearer credential (COSMOS_ADMIN_API_SECRET) so it
   returns cross-consumer data. The old `X-Cosmos-Admin: 1` marker it used to send is dead:
   that service replaced it with a real shared secret and fails closed, so sending the marker
   produced a 401 on every admin screen for an account whose platform rights were fine. */
import type { APIRoute } from "astro";
import { adminProxy } from "@/lib/cosmos-proxy";

export const ALL: APIRoute = (ctx) => adminProxy(ctx);
