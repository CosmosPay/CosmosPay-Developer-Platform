/* /api/admin/* — platform-owner-only proxy to the Payments API global admin endpoints
   (summary, consumers, payment-intents, swaps, customers, products, receivers, payins,
   payouts). Only an account owner/admin may reach it, verified in adminProxy against the
   signed-in account's role — the same check that gates assigning plans and roles, and now
   the only one in play. The Payments service no longer holds an admin credential to match:
   it admits the call as coming from this backend (gateway secret + X-Cosmos-Internal) and
   audits it under the account. The secret it used to demand is what made those screens
   answer 401 for an account whose platform rights were perfectly fine. */
import type { APIRoute } from "astro";
import { adminProxy } from "@/lib/cosmos-proxy";

export const ALL: APIRoute = (ctx) => adminProxy(ctx);
