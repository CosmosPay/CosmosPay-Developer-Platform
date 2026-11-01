/* integration-demo.ts: the sample data behind the integration options' demos on
   payments.cosmospay.lat/integrations (src/components/payments/landing/sections/Integrations.astro,
   src/scripts/payments/integration-demos.ts). Pure: no DOM, so tests/unit/integrationDemo.test.ts
   loads it under plain node.

   Nothing here is sent anywhere. The shapes are the Payments API's own (docs/openapi.json:
   CreatePayPaymentIntentDto, PayPaymentIntentEntity; the webhook's { id, type, createdAt, data }
   envelope); the values are samples, shortened with an ellipsis where a real one would be long,
   so nobody mistakes them for a live account. */

/** The id every demo shows: a payment link id in the server's format (a Prisma cuid). */
export const SAMPLE_LINK_ID = "cmh9a1q7r0000l208x9k4d1pz";

/** The assets the demos offer, on Stellar's test network (USDC is Circle's test issuer). */
export const DEMO_ASSETS = {
  USDC: { code: "USDC", issuer: "GBBD47…LLFLA5" },
  XLM: { code: "XLM", issuer: null },
} as const;
export type DemoAsset = keyof typeof DEMO_ASSETS;

export function isDemoAsset(value: string): value is DemoAsset {
  return Object.hasOwn(DEMO_ASSETS, value);
}

/* Stellar amounts carry at most seven decimals. */
const AMOUNT = /^(?:\d{1,12})(?:\.\d{1,7})?$/;

/**
 * What a visitor typed in a demo's amount field: `{ ok: true, amount: null }` when empty (the
 * payer chooses the amount, as a real link allows), the amount as the API spells it (dot
 * decimal, no leading zeros, no trailing ones), or `{ ok: false }`. A comma is read as the
 * decimal mark, as most of the gateway's languages write it; spaces are ignored.
 */
export function parseDemoAmount(raw: string): { ok: true; amount: string | null } | { ok: false } {
  const text = raw.replace(/\s+/g, "").replace(",", ".");
  if (!text) return { ok: true, amount: null };
  if (!AMOUNT.test(text)) return { ok: false };
  const [whole, fraction = ""] = text.split(".");
  const integer = whole.replace(/^0+(?=\d)/, "");
  const decimals = fraction.replace(/0+$/, "");
  if (/^0*$/.test(integer) && !decimals) return { ok: false };
  return { ok: true, amount: decimals ? `${integer}.${decimals}` : integer };
}

/** The amount as a checkout shows it: two decimals at least, the asset after it. */
export function demoAmountLabel(amount: string, asset: DemoAsset): string {
  const [whole, fraction = ""] = amount.split(".");
  return `${whole}.${fraction.padEnd(2, "0")} ${DEMO_ASSETS[asset].code}`;
}

/** The hosted checkout's address for the sample link, without the scheme (as the demos print it). */
export function demoCheckoutAddress(origin: string, id: string = SAMPLE_LINK_ID): string {
  return `${new URL(origin).host}/${id}`;
}

export interface DemoInput {
  amount: string | null;
  asset: DemoAsset;
  msg: string;
}

/* The request body: what a merchant's server posts to create the payment intent. */
export function demoRequest({ amount, asset, msg }: DemoInput): Record<string, string> {
  const body: Record<string, string> = { chain: "stellar", destination: "G…YOUR_ACCOUNT" };
  if (amount) body.amount = amount;
  const { code, issuer } = DEMO_ASSETS[asset];
  if (issuer) {
    body.assetCode = code;
    body.assetIssuer = issuer;
  }
  if (msg) body.msg = msg;
  return body;
}

/* The answer: the payment intent, waiting to be paid. Its `uri` is what the QR code carries. */
export function demoResponse({ amount, asset, msg }: DemoInput, now: Date): Record<string, string | null> {
  const { code, issuer } = DEMO_ASSETS[asset];
  return {
    id: SAMPLE_LINK_ID,
    kind: "PAY",
    status: "PENDING",
    chain: "stellar",
    network: "testnet",
    destination: "G…YOUR_ACCOUNT",
    amount,
    asset: issuer ? code : "native",
    assetIssuer: issuer,
    memo: "1001",
    msg: msg || null,
    uri: `web+stellar:pay?destination=G…${amount ? `&amount=${amount}` : ""}`,
    createdAt: isoSeconds(now),
  };
}

/* The webhook the merchant's server receives once the payment is confirmed on-chain. A link
   without an amount settles for what the payer sent; the sample says 25. */
export function demoWebhook({ amount }: DemoInput, now: Date): Record<string, unknown> {
  return {
    id: "evt_01JB…",
    type: "PAYMENT_INTENT_SUCCEEDED",
    createdAt: isoSeconds(now),
    data: { id: SAMPLE_LINK_ID, status: "SUCCEEDED", amount: amount ?? "25", txHash: "6864…2e54" },
  };
}

function isoSeconds(now: Date): string {
  return new Date(Math.floor(now.getTime() / 1000) * 1000).toISOString();
}
