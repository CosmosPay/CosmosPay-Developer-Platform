/* Mock mode's charges in local money ("charge with QR"), for the payer page /fiat/{id}: the
   gateway's keyless `GET /v1/payment-links/fiat/{id}` (the community server's PublicPaymentRequest)
   and `POST /v1/payment-links/fiat/{id}/sessions`, answered by src/lib/mock/gateway.ts.

   Fixed ids, so each state can be opened by hand on the local payments domain
   (`http://payments.cosmospay.localhost:<port>/fiat/<id>`):
     cqrdemoarsopen0000000001  open, ARS, one method (preselected)
     cqrdemocopopen0000000002  open, COP, three methods (the picker)
     cqrdemoarspaid0000000003  paid
     cqrdemoarsexpired0000004  expired
     cqrdemoarscancel00000005  cancelled
   An open one turns paid PAID_AFTER_MS after its first session was opened, so the waiting and the
   paid states can be watched end to end. A session answers a URL on the marketplace's sandbox
   window, as the sandbox API does (the real one fixes the seller's address and the session's
   reference in it). Kept on globalThis (mockStore): a hot reload keeps it, a restart resets it. */
import { mockStore } from "@/lib/mock/store";
import { evmAddress, hoursAgo, hoursFromNow } from "@/lib/mock/fixtures";

export const PAID_AFTER_MS = 20_000;
const SANDBOX_WIDGET = "https://widget-testnet.eldorado.io";

interface MockFiatRequest {
  id: string;
  network: "public" | "testnet";
  status: "open" | "paid" | "expired" | "cancelled";
  currency: string;
  amount: string;
  description: string | null;
  chainId: number;
  token: string;
  tokenAddress: string;
  estimatedAmountOut: string | null;
  paymentMethods: { id: string; name: string }[];
  expiresAt: string;
  createdAt: string;
  paidAt: string | null;
  /** Mock only: when the first session was opened, and so when the charge turns paid. */
  sessionOpenedAt: number | null;
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

const USDT0_ARBITRUM = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";
const ARS_METHODS = [{ id: "bank_tx_ar", name: "CVU/CBU o Alias (ARS)" }];
const COP_METHODS = [
  { id: "bank_bancolombia", name: "Bancolombia (COP)" },
  { id: "app_nequi_co", name: "Nequi (COP)" },
  { id: "app_llave_co", name: "Llave Bre-B (COP)" },
];

function seed(): Record<string, MockFiatRequest> {
  const base = {
    network: "public" as const,
    chainId: 42161,
    token: "USDT0",
    tokenAddress: USDT0_ARBITRUM,
    paidAt: null,
    sessionOpenedAt: null,
  };
  const rows: MockFiatRequest[] = [
    {
      ...base, id: FIAT_FIXTURE_IDS.openArs, status: "open", currency: "ARS", amount: "15000", description: "Mesa 4",
      estimatedAmountOut: "8.75", paymentMethods: ARS_METHODS, expiresAt: hoursFromNow(24), createdAt: hoursAgo(0.2),
      address: evmAddress("fiat-seller-ars"),
    },
    {
      ...base, id: FIAT_FIXTURE_IDS.openCop, status: "open", currency: "COP", amount: "52000.50", description: "Pedido 1042",
      estimatedAmountOut: "15.67", paymentMethods: COP_METHODS, expiresAt: hoursFromNow(6), createdAt: hoursAgo(0.5),
      address: evmAddress("fiat-seller-cop"),
    },
    {
      ...base, id: FIAT_FIXTURE_IDS.paid, status: "paid", currency: "ARS", amount: "8200", description: "Café y medialunas",
      estimatedAmountOut: "4.78", paymentMethods: ARS_METHODS, expiresAt: hoursFromNow(20), createdAt: hoursAgo(4),
      paidAt: hoursAgo(3.6), address: evmAddress("fiat-seller-ars"),
    },
    {
      ...base, id: FIAT_FIXTURE_IDS.expired, status: "expired", currency: "ARS", amount: "23500", description: null,
      estimatedAmountOut: "13.71", paymentMethods: ARS_METHODS, expiresAt: hoursAgo(2), createdAt: hoursAgo(26),
      address: evmAddress("fiat-seller-ars"),
    },
    {
      ...base, id: FIAT_FIXTURE_IDS.cancelled, status: "cancelled", currency: "ARS", amount: "4000", description: "Envío",
      estimatedAmountOut: "2.33", paymentMethods: ARS_METHODS, expiresAt: hoursFromNow(12), createdAt: hoursAgo(1),
      address: evmAddress("fiat-seller-ars"),
    },
  ];
  return Object.fromEntries(rows.map((r) => [r.id, r]));
}

const requests = () => mockStore("fiat-requests", seed);

/* The stored status, with the mock's completion applied: an open charge whose session was opened
   PAID_AFTER_MS ago is paid now, as the marketplace's webhook would mark it. */
function settle(r: MockFiatRequest, now = Date.now()): MockFiatRequest {
  if (r.status === "open" && r.sessionOpenedAt !== null && now - r.sessionOpenedAt >= PAID_AFTER_MS) {
    r.status = "paid";
    r.paidAt = new Date(r.sessionOpenedAt + PAID_AFTER_MS).toISOString();
  }
  return r;
}

/** The public read: never the seller's address, the sessions or anything mock-only. */
function publicView(r: MockFiatRequest) {
  const status = r.status === "open" && Date.parse(r.expiresAt) <= Date.now() ? "expired" : r.status;
  return {
    id: r.id,
    network: r.network,
    status,
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
