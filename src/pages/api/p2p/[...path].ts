/* /api/p2p/*: the dashboard's proxy to the Payments API's P2P market (/v1/p2p/<rest>): the market,
   the organization's registered wallets, payment methods, offers, orders, charges, payouts, the
   transaction builder and the transfer-matches helper. Every method is forwarded; reads need a
   member of `?org=`, writes `payments:create` there too (cosmos-proxy.ts blindpayProxy). The
   transactions it answers are unsigned: the person signs them in their own wallet. */
import type { APIRoute } from "astro";
import { blindpayProxy } from "@/lib/cosmos-proxy";

export const ALL: APIRoute = (ctx) => blindpayProxy(ctx, "p2p");
