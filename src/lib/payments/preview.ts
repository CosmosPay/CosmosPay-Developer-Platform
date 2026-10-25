/* preview.ts: the sample payment link behind /preview/{design}, where merchants see each
   checkout design before choosing it. Nothing in it can be paid: the QR encodes a plain
   "sample" notice, the URI is empty (the page leaves every wallet button inert) and the
   address is Stellar's well-known test account format, on testnet. */
import type { CheckoutTheme } from "@/lib/payments/checkout-themes";
import type { PaymentLink } from "@/lib/payments/payment-link";

/* How long the sample's countdown runs, from when the page opens. */
const PREVIEW_TTL_MS = 15 * 60_000;

export function previewLink(theme: CheckoutTheme, now: number = Date.now()): PaymentLink {
  return {
    id: "cpreview0000000000000000000",
    kind: "PAY",
    chain: "stellar",
    network: "testnet",
    status: "PENDING",
    payTo: "GCALNQQBXAPZ2WIRSDDBMSTAKCUH5SG6U76YBFLQLIXJTF7FE5AX7AOO",
    amount: "25.00",
    asset: "USDC",
    assetIssuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    memo: "1001",
    msg: "Order #1001",
    uri: "",
    qr: "/media/sample-qr.png",
    txHash: null,
    networkFee: null,
    expiresAt: new Date(now + PREVIEW_TTL_MS).toISOString(),
    createdAt: new Date(now).toISOString(),
    checkoutTheme: theme,
  };
}
