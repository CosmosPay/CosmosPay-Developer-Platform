/* /api/kyc/* — dashboard proxy to the Payments API BlindPay KYC/KYB surface
   (receivers, wallets, bank-accounts, upload, terms-of-service, rails, bank-details).
   A single catch-all forwards every method to /v1/kyc/<rest>. */
import type { APIRoute } from "astro";
import { blindpayProxy } from "@/lib/cosmos-proxy";

export const ALL: APIRoute = (ctx) => blindpayProxy(ctx, "kyc");
