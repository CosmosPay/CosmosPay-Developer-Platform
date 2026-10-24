/* urls.ts — what the payments pages link to or read from, normalized once. */
import { PUBLIC_PAYMENTS_API_URL, PUBLIC_WALLET_WEB_URL } from "astro:env/client";
import { normalizeOrigin } from "@/lib/urls";

export { PAYMENTS, SITE, TERMS } from "@/components/cosmos/lib/constants";

/* The APISIX gateway including its entry prefix. The checkout reads
   `${API_BASE}/v1/payment-links/{id}` from the payer's browser (see src/scripts/payments/checkout.ts). */
export const API_BASE = normalizeOrigin(PUBLIC_PAYMENTS_API_URL);
/* Keeps its trailing slash: the web wallet is served under /wallet/. */
export const WALLET_WEB = PUBLIC_WALLET_WEB_URL.trim();
