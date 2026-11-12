/* Mock mode's charges in local money ("charge with QR"), one store for both sides:
   - the payer page /fiat/{id}: the gateway's keyless `GET /v1/payment-links/fiat/{id}` (the
     community server's PublicPaymentRequest) and `POST /v1/payment-links/fiat/{id}/sessions`,
     answered by src/lib/mock/gateway.ts;
   - the seller's dashboard (Fiat > QR charges): `/api/onramp/p2p/payment-requests` (list, create,
     read, cancel; the Payments API's P2pPaymentRequestEntity), answered by
     src/lib/mock/handlers/p2p-ramp.ts. A charge created there opens on the local payer page too.

   Fixed ids, so each state can be opened by hand on the local payments domain
   (`http://payments.cosmospay.localhost:<port>/fiat/<id>`). Production's (the dashboard's
   Production list):
     cqrdemoarsopen0000000001  open, ARS, one method (preselected)
     cqrdemocopopen0000000002  open, COP, three methods (the picker)
     cqrdemoarspaid0000000003  paid, with its delivery transaction
     cqrdemoarsexpired0000004  expired
     cqrdemoarscancel00000005  cancelled
   The sandbox's (the dashboard's Sandbox list, Arbitrum Sepolia's test USDT):
     cqrdemotestopen000000006  open
     cqrdemotestpaid000000007  paid, with its delivery transaction
     cqrdemotestexpired000008  expired
     cqrdemotestcancel0000009  cancelled
   An open one turns paid PAID_AFTER_MS after its first session was opened, and one created from
   the dashboard PAID_AFTER_MS after it was created, so the waiting and the paid states can be
   watched end to end. A session answers a URL on the marketplace's sandbox window, as the sandbox
   API does (the real one fixes the seller's address and the session's reference in it). Kept on
   globalThis (mockStore): a hot reload keeps it, a restart resets it. */
import { mockStore } from "@/lib/mock/store";
import { cuid, evmAddress, evmTxHash, hoursAgo, hoursFromNow, qrImage } from "@/lib/mock/fixtures";
import type { MockEnv } from "@/lib/mock/http";
import { toChecksumAddress } from "@/lib/qr-charges";

export const PAID_AFTER_MS = 20_000;
const SANDBOX_WIDGET = "https://widget-testnet.eldorado.io";
/* The payer page's origin: the mock's own payments host (scripts/dev-mock.mjs sets it). */
const PAYMENTS_ORIGIN = (process.env.PUBLIC_PAYMENTS_URL || "https://payments.cosmospay.lat").replace(/\/+$/, "");

type Status = "open" | "paid" | "expired" | "cancelled";

interface MockFiatRequest {
  id: string;
  network: "public" | "testnet";
  status: Status;
  currency: string;
  amount: string;
  description: string | null;
  chainId: number;
  token: string;
  tokenAddress: string;
  tokenDecimals: number;
  estimatedAmountOut: string | null;
  paymentMethods: { id: string; name: string }[];
  expiresAt: string;
  createdAt: string;
  paidAt: string | null;
  paidAmount: string | null;
  paidTxHash: string | null;
  /** Mock only: when the first session was opened, and so when the charge turns paid. */
  sessionOpenedAt: number | null;
  /** Mock only: when a charge created from the dashboard turns paid by itself. */
  payAt: number | null;
  /** Mock only: the seller's address the session's window carries (never in the public read). */
  address: string;
}

export const FIAT_FIXTURE_IDS = {
  openArs: "cqrdemoarsopen0000000001",
  openCop: "cqrdemocopopen0000000002",
  paid: "cqrdemoarspaid0000000003",
  expired: "cqrdemoarsexpired0000004",
  cancelled: "cqrdemoarscancel00000005",
} as const;

/** The sandbox's charges (the dashboard's Sandbox list). */
export const FIAT_SANDBOX_FIXTURE_IDS = {
  open: "cqrdemotestopen000000006",
  paid: "cqrdemotestpaid000000007",
  expired: "cqrdemotestexpired000008",
  cancelled: "cqrdemotestcancel0000009",
} as const;

const USDT0_ARBITRUM = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";
const USDT_ARBITRUM_SEPOLIA = "0x25f5D414F85b7f4668ADe4E557ef234023208771";
const ARS_METHODS = [{ id: "bank_tx_ar", name: "CVU/CBU o Alias (ARS)" }];
const COP_METHODS = [
  { id: "bank_bancolombia", name: "Bancolombia (COP)" },
  { id: "app_nequi_co", name: "Nequi (COP)" },
  { id: "app_llave_co", name: "Llave Bre-B (COP)" },
];

/** What a completed purchase delivers: the estimate less about 2% of the marketplace's fees. */
function deliveredOf(estimate: string | null): string | null {
  const n = Number(estimate);
  if (estimate === null || !Number.isFinite(n) || n <= 0) return null;
  const d = n * 0.98 >= 1 ? 2 : 6;
  return (Math.floor(n * 0.98 * 10 ** d) / 10 ** d).toFixed(d);
}

function seed(): Record<string, MockFiatRequest> {
  const prod = {
    network: "public" as const,
    chainId: 42161,
    token: "USDT0",
    tokenAddress: USDT0_ARBITRUM,
    tokenDecimals: 6,
    paidAt: null,
    paidAmount: null,
    paidTxHash: null,
    sessionOpenedAt: null,
    payAt: null,
  };
  const sandbox = { ...prod, network: "testnet" as const, chainId: 421614, token: "USDT", tokenAddress: USDT_ARBITRUM_SEPOLIA, tokenDecimals: 18 };
  const rows: MockFiatRequest[] = [
    {
      ...prod, id: FIAT_FIXTURE_IDS.openArs, status: "open", currency: "ARS", amount: "15000", description: "Mesa 4",
      estimatedAmountOut: "8.75", paymentMethods: ARS_METHODS, expiresAt: hoursFromNow(24), createdAt: hoursAgo(0.2),
      address: evmAddress("fiat-seller-ars"),
    },
    {
      ...prod, id: FIAT_FIXTURE_IDS.openCop, status: "open", currency: "COP", amount: "52000.50", description: "Pedido 1042",
      estimatedAmountOut: "15.67", paymentMethods: COP_METHODS, expiresAt: hoursFromNow(6), createdAt: hoursAgo(0.5),
      address: evmAddress("fiat-seller-cop"),
    },
    {
      ...prod, id: FIAT_FIXTURE_IDS.paid, status: "paid", currency: "ARS", amount: "8200", description: "Café y medialunas",
      estimatedAmountOut: "4.78", paymentMethods: ARS_METHODS, expiresAt: hoursFromNow(20), createdAt: hoursAgo(4),
      paidAt: hoursAgo(3.6), paidAmount: "4.68", paidTxHash: evmTxHash(`fiat-paid:${FIAT_FIXTURE_IDS.paid}`), address: evmAddress("fiat-seller-ars"),
    },
    {
      ...prod, id: FIAT_FIXTURE_IDS.expired, status: "expired", currency: "ARS", amount: "23500", description: null,
      estimatedAmountOut: "13.71", paymentMethods: ARS_METHODS, expiresAt: hoursAgo(2), createdAt: hoursAgo(26),
      address: evmAddress("fiat-seller-ars"),
    },
    {
      ...prod, id: FIAT_FIXTURE_IDS.cancelled, status: "cancelled", currency: "ARS", amount: "4000", description: "Envío",
      estimatedAmountOut: "2.33", paymentMethods: ARS_METHODS, expiresAt: hoursFromNow(12), createdAt: hoursAgo(1),
      address: evmAddress("fiat-seller-ars"),
    },
    {
      ...sandbox, id: FIAT_SANDBOX_FIXTURE_IDS.open, status: "open", currency: "ARS", amount: "12500", description: "Mesa 7",
      estimatedAmountOut: "12.61", paymentMethods: ARS_METHODS, expiresAt: hoursFromNow(23), createdAt: hoursAgo(0.6),
      address: evmAddress("fiat-seller-test"),
    },
    {
      ...sandbox, id: FIAT_SANDBOX_FIXTURE_IDS.paid, status: "paid", currency: "ARS", amount: "6400", description: "Dos empanadas y una gaseosa",
      estimatedAmountOut: "6.45", paymentMethods: ARS_METHODS, expiresAt: hoursFromNow(18), createdAt: hoursAgo(5),
      paidAt: hoursAgo(4.7), paidAmount: "6.32", paidTxHash: evmTxHash(`fiat-paid:${FIAT_SANDBOX_FIXTURE_IDS.paid}`), address: evmAddress("fiat-seller-test"),
    },
    {
      ...sandbox, id: FIAT_SANDBOX_FIXTURE_IDS.expired, status: "expired", currency: "ARS", amount: "31000", description: "Pedido 88",
      estimatedAmountOut: "31.28", paymentMethods: ARS_METHODS, expiresAt: hoursAgo(3), createdAt: hoursAgo(27),
      address: evmAddress("fiat-seller-test"),
    },
    {
      ...sandbox, id: FIAT_SANDBOX_FIXTURE_IDS.cancelled, status: "cancelled", currency: "ARS", amount: "5000", description: null,
      estimatedAmountOut: "5.04", paymentMethods: ARS_METHODS, expiresAt: hoursFromNow(10), createdAt: hoursAgo(2),
      address: evmAddress("fiat-seller-test"),
    },
  ];
  return Object.fromEntries(rows.map((r) => [r.id, r]));
}

const requests = () => mockStore("fiat-requests", seed);

/* The stored status, with the mock's completion applied: an open charge whose session was opened
   PAID_AFTER_MS ago, or one created from the dashboard PAID_AFTER_MS ago, is paid now, with what
   the purchase delivered and its transaction, as the marketplace's webhook would mark it. */
function settle(r: MockFiatRequest, now = Date.now()): MockFiatRequest {
  if (r.status !== "open") return r;
  const due = [r.sessionOpenedAt === null ? null : r.sessionOpenedAt + PAID_AFTER_MS, r.payAt].filter((n): n is number => n !== null);
  const at = due.length ? Math.min(...due) : null;
  if (at !== null && now >= at) {
    r.status = "paid";
    r.paidAt = new Date(at).toISOString();
    r.paidAmount = deliveredOf(r.estimatedAmountOut);
    r.paidTxHash = evmTxHash(`fiat-paid:${r.id}`);
  }
  return r;
}

const shownStatus = (r: MockFiatRequest): Status => (r.status === "open" && Date.parse(r.expiresAt) <= Date.now() ? "expired" : r.status);

/** The public read: never the seller's address, the sessions or anything mock-only. */
function publicView(r: MockFiatRequest) {
  return {
    id: r.id,
    network: r.network,
    status: shownStatus(r),
    currency: r.currency,
    amount: r.amount,
    description: r.description,
    chainId: r.chainId,
    token: r.token,
    tokenAddress: r.tokenAddress,
    estimatedAmountOut: r.estimatedAmountOut,
    paymentMethods: r.paymentMethods,
    expiresAt: r.expiresAt,
    createdAt: r.createdAt,
    paidAt: r.paidAt,
  };
}

/** The seller's read (P2pPaymentRequestEntity): the address and the payment, never anything
    mock-only. The QR is a drawing that encodes nothing, as every mock QR. */
export function sellerView(r: MockFiatRequest) {
  return {
    id: r.id,
    network: r.network,
    status: shownStatus(r),
    currency: r.currency,
    amount: r.amount,
    chainId: r.chainId,
    token: r.token,
    tokenAddress: toChecksumAddress(r.tokenAddress),
    tokenDecimals: r.tokenDecimals,
    address: toChecksumAddress(r.address),
    description: r.description,
    estimatedAmountOut: r.estimatedAmountOut,
    url: `${PAYMENTS_ORIGIN}/fiat/${r.id}`,
    qr: qrImage(`fiat-request:${r.id}`),
    expiresAt: r.expiresAt,
    createdAt: r.createdAt,
    paidAt: r.paidAt,
    paidAmount: r.paidAmount,
    paidTxHash: r.paidTxHash,
  };
}
export type SellerView = ReturnType<typeof sellerView>;

const networkOf = (env: MockEnv) => (env === "prod" ? "public" : "testnet");

/** The environment's charges, newest first, as the seller lists them. */
export function listFiatRequests(env: MockEnv, now = Date.now()): SellerView[] {
  return Object.values(requests())
    .filter((r) => r.network === networkOf(env))
    .map((r) => settle(r, now))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .map(sellerView);
}

/** One of the environment's charges, or null (another environment's is not found either). */
export function getFiatRequest(env: MockEnv, id: string, now = Date.now()): SellerView | null {
  const r = requests()[id];
  return r && r.network === networkOf(env) ? sellerView(settle(r, now)) : null;
}

/** A charge created from the dashboard: open, and paid by itself PAID_AFTER_MS later. */
export function createFiatRequest(env: MockEnv, terms: {
  currency: string;
  amount: string;
  chainId: number;
  token: string;
  tokenAddress: string;
  tokenDecimals: number;
  address: string;
  description: string | null;
  estimatedAmountOut: string | null;
  paymentMethods: { id: string; name: string }[];
  expiresInMinutes: number;
}, now = Date.now()): SellerView {
  const all = requests();
  const id = cuid(`fiat-request:${env}:${now}:${Object.keys(all).length}`);
  all[id] = {
    id,
    network: networkOf(env),
    status: "open",
    currency: terms.currency,
    amount: terms.amount,
    description: terms.description,
    chainId: terms.chainId,
    token: terms.token,
    tokenAddress: terms.tokenAddress,
    tokenDecimals: terms.tokenDecimals,
    estimatedAmountOut: terms.estimatedAmountOut,
    paymentMethods: terms.paymentMethods,
    expiresAt: new Date(now + terms.expiresInMinutes * 60_000).toISOString(),
    createdAt: new Date(now).toISOString(),
    paidAt: null,
    paidAmount: null,
    paidTxHash: null,
    sessionOpenedAt: null,
    payAt: now + PAID_AFTER_MS,
    address: terms.address,
  };
  return sellerView(all[id]);
}

/** Cancel an open charge: the charge, or why not (not this environment's, or no longer open). */
export function cancelFiatRequest(env: MockEnv, id: string, now = Date.now()): { charge: SellerView } | { error: "not_found" | "request_closed" } {
  const r = requests()[id];
  if (!r || r.network !== networkOf(env)) return { error: "not_found" };
  settle(r, now);
  if (shownStatus(r) !== "open") return { error: "request_closed" };
  r.status = "cancelled";
  return { charge: sellerView(r) };
}

type Json = (body: unknown, status?: number) => Response;

/** `GET fiat/{id}` and `POST fiat/{id}/sessions` under the gateway's /v1/payment-links. */
export async function fiatRequestRoute(request: Request, rest: string[], json: Json): Promise<Response> {
  const [id, action] = rest;
  const found = id ? requests()[id] : undefined;
  if (!found) return json({ statusCode: 404, message: "Payment request not found" }, 404);
  const r = settle(found);
  if (request.method === "GET" && !action) return json(publicView(r));
  if (request.method === "POST" && action === "sessions") {
    if (publicView(r).status !== "open") return json({ statusCode: 409, code: "request_closed", message: "The payment request is closed" }, 409);
    const body = (await request.json().catch(() => null)) as { paymentMethod?: unknown } | null;
    const method = r.paymentMethods.find((m) => m.id === body?.paymentMethod);
    if (!method) {
      return json({ statusCode: 400, message: `paymentMethod must be one of ${r.paymentMethods.map((m) => m.id).join(", ")}` }, 400);
    }
    r.sessionOpenedAt ??= Date.now();
    const reference = `cp-${crypto.randomUUID()}`;
    const url = new URL("/exchange", SANDBOX_WIDGET);
    for (const [k, v] of Object.entries({
      operation: "BUY", token: r.tokenAddress, chain: String(r.chainId), currency: r.currency,
      paymentMethod: method.id, amount: r.amount, address: r.address, externalReferenceId: reference,
    })) url.searchParams.set(k, v);
    return json({ widgetUrl: url.toString(), reference }, 201);
  }
  return json({ statusCode: 404, message: "Not found" }, 404);
}
