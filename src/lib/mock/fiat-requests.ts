/* Mock mode's charges in local money ("charge with QR"), one store for both sides:
   - the payer page /fiat/{id}: the gateway's keyless `GET /v1/payment-links/fiat/{id}` (the
     community server's PublicPaymentRequest), `POST /v1/payment-links/fiat/{id}/sessions` (the
     marketplace's window) and `POST /v1/payment-links/fiat/{id}/transfers` (a bank transfer's
     deposit instructions), answered by src/lib/mock/gateway.ts;
   - the seller's dashboard (Fiat > QR charges): `/api/onramp/p2p/payment-requests` (list, create,
     read, cancel; the Payments API's P2pPaymentRequestEntity), answered by
     src/lib/mock/handlers/p2p-ramp.ts. A charge created there opens on the local payer page too.

   Fixed ids, so each state can be opened by hand on the local payments domain
   (`http://payments.cosmospay.localhost:<port>/fiat/<id>`). Production's (the dashboard's
   Production list):
     cqrdemoarsopen0000000001  open, ARS, bank transfer or one other method (the choice); the demo:
                               a transfer started here turns it processing, then paid
     cqrdemocopopen0000000002  open, COP, three other methods (no bank transfer: the picker)
     cqrdemoarstransfer000010  open, ARS, bank transfer only (straight to the document)
     cqrdemoarsprocessing0011  processing: a transfer arrived, the token is on its way
     cqrdemoarspaid0000000003  paid with another method, with its delivery transaction
     cqrdemoarspaidbank000012  paid by bank transfer, no transaction reported
     cqrdemoarsexpired0000004  expired
     cqrdemoarscancel00000005  cancelled
   The sandbox's (the dashboard's Sandbox list, Arbitrum Sepolia's test USDT):
     cqrdemotestopen000000006  open, bank transfer or another method; its transfer asks for 37
                               cents more (12500.37), as the server does to tell two of the same
                               payer's transfers apart
     cqrdemotestprocessing013  processing
     cqrdemotestpaid000000007  paid, with its delivery transaction
     cqrdemotestexpired000008  expired
     cqrdemotestcancel0000009  cancelled
   An open one turns paid PAID_AFTER_MS after its first session was opened; one whose bank transfer
   was started turns processing TRANSFER_RECEIVED_MS later and paid PAID_AFTER_MS later (as if the
   payer had transferred at once); one created from the dashboard does the same by itself from its
   creation (through processing when it takes bank transfers). A session answers a URL on the
   marketplace's sandbox window, as the sandbox API does (the real one fixes the seller's address
   and the session's reference in it). The DNI 99999999 answers 503 `transfer_unavailable`, to see
   that message. Kept on globalThis (mockStore): a hot reload keeps it, a restart resets it. */
import { mockStore } from "@/lib/mock/store";
import { cuid, evmAddress, evmTxHash, hoursAgo, hoursFromNow, qrImage } from "@/lib/mock/fixtures";
import type { MockEnv } from "@/lib/mock/http";
import { toChecksumAddress } from "@/lib/qr-charges";
import { documentProblem, normalizeDocument, type FiatMethod } from "@/lib/payments/fiat-request";

export const PAID_AFTER_MS = 20_000;
/** After a bank transfer is started, when the mock "receives" it (the charge reads processing). */
export const TRANSFER_RECEIVED_MS = 8_000;
const SANDBOX_WIDGET = "https://widget-testnet.eldorado.io";
/* The payer page's origin: the mock's own payments host (scripts/dev-mock.mjs sets it). */
const PAYMENTS_ORIGIN = (process.env.PUBLIC_PAYMENTS_URL || "https://payments.cosmospay.lat").replace(/\/+$/, "");

/* The account a bank transfer goes to, as the server answers it (a CVU with valid check digits). */
const TRANSFER_ACCOUNT = { alias: "cosmospay.qr", cvu: "0000003100000000000000", holder: "Cosmos Pay", bank: null };
/* How long the instructions hold, as the server sets them: an hour, or the charge's own deadline. */
const TRANSFER_TTL_MS = 60 * 60_000;
/* The range of local money the bank transfer takes (the server's defaults). */
const TRANSFER_MIN_ARS = 1_000;
const TRANSFER_MAX_ARS = 5_000_000;
/* A DNI the mock refuses as if bank transfers were down. */
const UNAVAILABLE_DNI = "99999999";

type Status = "open" | "processing" | "paid" | "expired" | "cancelled";

interface MockTransfer {
  id: string;
  /** The document's DNI part, the key the server matches deposits by (mock only, never answered). */
  dni: string;
  currency: string;
  amount: string;
  documentHint: string;
  expiresAt: string;
}

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
  methods: FiatMethod[];
  expiresAt: string;
  createdAt: string;
  paidAt: string | null;
  paidAmount: string | null;
  paidTxHash: string | null;
  paidMethod: FiatMethod | null;
  /** Mock only: when the first session was opened, and so when the charge turns paid. */
  sessionOpenedAt: number | null;
  /** Mock only: when the first bank transfer was started (processing, then paid, after it). */
  transferStartedAt: number | null;
  /** Mock only: when a charge created from the dashboard turns paid by itself. */
  payAt: number | null;
  /** Mock only: the transfers started, one per document. */
  transfers: MockTransfer[];
  /** Mock only: the cents a transfer adds to the amount (the server's way to tell two of the same
      payer's transfers apart); null for none. */
  transferCents?: string | null;
  /** Mock only: the seller's address the session's window carries (never in the public read). */
  address: string;
}

export const FIAT_FIXTURE_IDS = {
  openArs: "cqrdemoarsopen0000000001",
  openCop: "cqrdemocopopen0000000002",
  transferOnly: "cqrdemoarstransfer000010",
  processing: "cqrdemoarsprocessing0011",
  paid: "cqrdemoarspaid0000000003",
  paidTransfer: "cqrdemoarspaidbank000012",
  expired: "cqrdemoarsexpired0000004",
  cancelled: "cqrdemoarscancel00000005",
} as const;

/** The sandbox's charges (the dashboard's Sandbox list). */
export const FIAT_SANDBOX_FIXTURE_IDS = {
  open: "cqrdemotestopen000000006",
  processing: "cqrdemotestprocessing013",
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
const BOTH: FiatMethod[] = ["transfer", "p2p"];
const P2P: FiatMethod[] = ["p2p"];

/** What a completed purchase delivers: the estimate less about 2% of the marketplace's fees. */
function deliveredOf(estimate: string | null): string | null {
  const n = Number(estimate);
  if (estimate === null || !Number.isFinite(n) || n <= 0) return null;
  const d = n * 0.98 >= 1 ? 2 : 6;
  return (Math.floor(n * 0.98 * 10 ** d) / 10 ** d).toFixed(d);
}

/** The rails a new charge gets, as the server decides them: the bank transfer for pesos within its
    range (the sandbox's test pairs included) once the seller's transfer account is approved, the
    marketplace's window always. */
export function methodsFor(currency: string, amount: string, transferAccount: boolean): FiatMethod[] {
  const n = Number(amount);
  return transferAccount && currency === "ARS" && n >= TRANSFER_MIN_ARS && n <= TRANSFER_MAX_ARS ? BOTH : P2P;
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
    paidMethod: null,
    sessionOpenedAt: null,
    transferStartedAt: null,
    payAt: null,
    transfers: [],
  };
  const sandbox = { ...prod, network: "testnet" as const, chainId: 421614, token: "USDT", tokenAddress: USDT_ARBITRUM_SEPOLIA, tokenDecimals: 18 };
  const rows: MockFiatRequest[] = [
    {
      ...prod, id: FIAT_FIXTURE_IDS.openArs, status: "open", currency: "ARS", amount: "15000", description: "Mesa 4",
      estimatedAmountOut: "8.75", paymentMethods: ARS_METHODS, methods: BOTH, expiresAt: hoursFromNow(24), createdAt: hoursAgo(0.2),
      address: evmAddress("fiat-seller-ars"),
    },
    {
      ...prod, id: FIAT_FIXTURE_IDS.openCop, status: "open", currency: "COP", amount: "52000.50", description: "Pedido 1042",
      estimatedAmountOut: "15.67", paymentMethods: COP_METHODS, methods: P2P, expiresAt: hoursFromNow(6), createdAt: hoursAgo(0.5),
      address: evmAddress("fiat-seller-cop"),
    },
    {
      ...prod, id: FIAT_FIXTURE_IDS.transferOnly, status: "open", currency: "ARS", amount: "48250.50", description: "Pedido 2210",
      estimatedAmountOut: "28.14", paymentMethods: ARS_METHODS, methods: ["transfer"], expiresAt: hoursFromNow(3), createdAt: hoursAgo(0.3),
      address: evmAddress("fiat-seller-ars"),
    },
    {
      ...prod, id: FIAT_FIXTURE_IDS.processing, status: "processing", currency: "ARS", amount: "32000", description: "Mesa 12",
      estimatedAmountOut: "18.67", paymentMethods: ARS_METHODS, methods: BOTH, expiresAt: hoursFromNow(22), createdAt: hoursAgo(0.4),
      address: evmAddress("fiat-seller-ars"),
    },
    {
      ...prod, id: FIAT_FIXTURE_IDS.paid, status: "paid", currency: "ARS", amount: "8200", description: "Café y medialunas",
      estimatedAmountOut: "4.78", paymentMethods: ARS_METHODS, methods: BOTH, expiresAt: hoursFromNow(20), createdAt: hoursAgo(4),
      paidAt: hoursAgo(3.6), paidAmount: "4.68", paidTxHash: evmTxHash(`fiat-paid:${FIAT_FIXTURE_IDS.paid}`), paidMethod: "p2p",
      address: evmAddress("fiat-seller-ars"),
    },
    {
      ...prod, id: FIAT_FIXTURE_IDS.paidTransfer, status: "paid", currency: "ARS", amount: "27500", description: "Almuerzo",
      estimatedAmountOut: "16.04", paymentMethods: ARS_METHODS, methods: BOTH, expiresAt: hoursFromNow(19), createdAt: hoursAgo(5),
      paidAt: hoursAgo(4.8), paidAmount: "15.82", paidTxHash: null, paidMethod: "transfer",
      address: evmAddress("fiat-seller-ars"),
    },
    {
      ...prod, id: FIAT_FIXTURE_IDS.expired, status: "expired", currency: "ARS", amount: "23500", description: null,
      estimatedAmountOut: "13.71", paymentMethods: ARS_METHODS, methods: BOTH, expiresAt: hoursAgo(2), createdAt: hoursAgo(26),
      address: evmAddress("fiat-seller-ars"),
    },
    {
      ...prod, id: FIAT_FIXTURE_IDS.cancelled, status: "cancelled", currency: "ARS", amount: "4000", description: "Envío",
      estimatedAmountOut: "2.33", paymentMethods: ARS_METHODS, methods: BOTH, expiresAt: hoursFromNow(12), createdAt: hoursAgo(1),
      address: evmAddress("fiat-seller-ars"),
    },
    {
      ...sandbox, id: FIAT_SANDBOX_FIXTURE_IDS.open, status: "open", currency: "ARS", amount: "12500", description: "Mesa 7",
      estimatedAmountOut: "12.61", paymentMethods: ARS_METHODS, methods: BOTH, expiresAt: hoursFromNow(23), createdAt: hoursAgo(0.6),
      address: evmAddress("fiat-seller-test"), transferCents: "0.37",
    },
    {
      ...sandbox, id: FIAT_SANDBOX_FIXTURE_IDS.processing, status: "processing", currency: "ARS", amount: "9800", description: "Pedido 91",
      estimatedAmountOut: "9.89", paymentMethods: ARS_METHODS, methods: BOTH, expiresAt: hoursFromNow(21), createdAt: hoursAgo(0.8),
      address: evmAddress("fiat-seller-test"),
    },
    {
      ...sandbox, id: FIAT_SANDBOX_FIXTURE_IDS.paid, status: "paid", currency: "ARS", amount: "6400", description: "Dos empanadas y una gaseosa",
      estimatedAmountOut: "6.45", paymentMethods: ARS_METHODS, methods: BOTH, expiresAt: hoursFromNow(18), createdAt: hoursAgo(5),
      paidAt: hoursAgo(4.7), paidAmount: "6.32", paidTxHash: evmTxHash(`fiat-paid:${FIAT_SANDBOX_FIXTURE_IDS.paid}`), paidMethod: "transfer",
      address: evmAddress("fiat-seller-test"),
    },
    {
      ...sandbox, id: FIAT_SANDBOX_FIXTURE_IDS.expired, status: "expired", currency: "ARS", amount: "31000", description: "Pedido 88",
      estimatedAmountOut: "31.28", paymentMethods: ARS_METHODS, methods: BOTH, expiresAt: hoursAgo(3), createdAt: hoursAgo(27),
      address: evmAddress("fiat-seller-test"),
    },
    {
      ...sandbox, id: FIAT_SANDBOX_FIXTURE_IDS.cancelled, status: "cancelled", currency: "ARS", amount: "5000", description: null,
      estimatedAmountOut: "5.04", paymentMethods: ARS_METHODS, methods: BOTH, expiresAt: hoursFromNow(10), createdAt: hoursAgo(2),
      address: evmAddress("fiat-seller-test"),
    },
  ];
  // Each charge its own list of transfers (the spread above would share one).
  return Object.fromEntries(rows.map((r) => [r.id, { ...r, transfers: [] }]));
}

const requests = () => mockStore("fiat-requests", seed);

function markPaid(r: MockFiatRequest, at: number, method: FiatMethod) {
  r.status = "paid";
  r.paidAt = new Date(at).toISOString();
  r.paidAmount = deliveredOf(r.estimatedAmountOut);
  r.paidTxHash = evmTxHash(`fiat-paid:${r.id}`);
  r.paidMethod = method;
}

/* The stored status, with the mock's completions applied, as the server's webhooks would mark
   them: an open charge whose session was opened PAID_AFTER_MS ago is paid with another method; one
   whose bank transfer was started (or one created from the dashboard that takes bank transfers) is
   processing TRANSFER_RECEIVED_MS later and paid by bank transfer PAID_AFTER_MS later; one created
   from the dashboard that does not is paid with another method PAID_AFTER_MS after its creation.
   The first completion wins. */
function settle(r: MockFiatRequest, now = Date.now()): MockFiatRequest {
  if (r.status !== "open" && r.status !== "processing") return r;
  const viaTransfer = r.transferStartedAt ?? (r.payAt !== null && r.methods.includes("transfer") ? r.payAt - PAID_AFTER_MS : null);
  const due: { at: number; method: FiatMethod }[] = [];
  if (r.sessionOpenedAt !== null) due.push({ at: r.sessionOpenedAt + PAID_AFTER_MS, method: "p2p" });
  if (viaTransfer !== null) due.push({ at: viaTransfer + PAID_AFTER_MS, method: "transfer" });
  else if (r.payAt !== null) due.push({ at: r.payAt, method: "p2p" });
  const first = due.sort((a, b) => a.at - b.at)[0];
  if (first && now >= first.at) {
    markPaid(r, first.at, first.method);
    return r;
  }
  // Open past its deadline stays open in the store (shownStatus reads it expired), as the server.
  if (r.status === "open" && viaTransfer !== null && now >= viaTransfer + TRANSFER_RECEIVED_MS) r.status = "processing";
  return r;
}

/* An open charge past its deadline reads expired; a processing one never does (the money is in). */
const shownStatus = (r: MockFiatRequest): Status => (r.status === "open" && Date.parse(r.expiresAt) <= Date.now() ? "expired" : r.status);

/** The public read: never the seller's address, the sessions, the transfers or anything mock-only. */
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
    methods: r.methods,
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
    methods: r.methods,
    url: `${PAYMENTS_ORIGIN}/fiat/${r.id}`,
    qr: qrImage(`fiat-request:${r.id}`),
    expiresAt: r.expiresAt,
    createdAt: r.createdAt,
    paidAt: r.paidAt,
    paidAmount: r.paidAmount,
    paidTxHash: r.paidTxHash,
    paidMethod: r.paidMethod,
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

/** A charge created from the dashboard: open, and paid by itself PAID_AFTER_MS later (through
    processing when it takes bank transfers). */
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
  /** The organization's bank-transfer account is approved. */
  transferAccount: boolean;
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
    methods: methodsFor(terms.currency, terms.amount, terms.transferAccount),
    expiresAt: new Date(now + terms.expiresInMinutes * 60_000).toISOString(),
    createdAt: new Date(now).toISOString(),
    paidAt: null,
    paidAmount: null,
    paidTxHash: null,
    paidMethod: null,
    sessionOpenedAt: null,
    transferStartedAt: null,
    payAt: now + PAID_AFTER_MS,
    transfers: [],
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

/* The DNI part of a document, as the server keys transfers by it: a CUIT's digits 3 to 10 or the
   DNI itself, leading zeros dropped. */
function dniOf(digits: string): string {
  const dni = digits.length === 11 ? digits.slice(2, 10) : digits;
  return dni.replace(/^0+(?=\d)/, "");
}

/** The BankTransfer the server answers: never the document, only its last three digits. */
function transferView(t: MockTransfer) {
  return {
    id: t.id,
    status: Date.parse(t.expiresAt) <= Date.now() ? "expired" : "awaiting_deposit",
    currency: t.currency,
    amount: t.amount,
    ...TRANSFER_ACCOUNT,
    documentHint: t.documentHint,
    expiresAt: t.expiresAt,
  };
}

type Json = (body: unknown, status?: number) => Response;

const error = (json: Json, status: number, code: string, message: string) => json({ statusCode: status, code, message }, status);

/** `POST fiat/{id}/transfers`: the deposit instructions, one transfer per document (the same
    document answers the same one while it holds, 200; a new one 201). */
async function startTransfer(request: Request, r: MockFiatRequest, json: Json): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { document?: unknown } | null;
  const typed = typeof body?.document === "string" ? body.document : "";
  const digits = documentProblem(typed) === null ? normalizeDocument(typed) : null;
  if (!digits) return error(json, 400, "invalid_document", "document must be a CUIT/CUIL (11 digits) or a DNI (7 or 8 digits)");
  if (!r.methods.includes("transfer")) return error(json, 400, "method_unavailable", "This payment request cannot be paid by bank transfer");
  if (shownStatus(r) !== "open") return error(json, 409, "request_closed", "The payment request is closed");
  const dni = dniOf(digits);
  if (dni === UNAVAILABLE_DNI) return error(json, 503, "transfer_unavailable", "Bank transfers are not available right now");
  const now = Date.now();
  const held = r.transfers.find((t) => t.dni === dni && Date.parse(t.expiresAt) > now);
  if (held) return json(transferView(held), 200);
  const transfer: MockTransfer = {
    id: cuid(`fiat-transfer:${r.id}:${dni}:${now}`),
    dni,
    currency: r.currency,
    amount: r.transferCents ? (Number(r.amount) + Number(r.transferCents)).toFixed(2) : r.amount,
    documentHint: `…${dni.slice(-3)}`,
    expiresAt: new Date(Math.min(now + TRANSFER_TTL_MS, Date.parse(r.expiresAt))).toISOString(),
  };
  r.transfers.push(transfer);
  r.transferStartedAt ??= now;
  return json(transferView(transfer), 201);
}

/** `GET fiat/{id}`, `POST fiat/{id}/sessions` and `POST fiat/{id}/transfers` under the gateway's
    /v1/payment-links. */
export async function fiatRequestRoute(request: Request, rest: string[], json: Json): Promise<Response> {
  const [id, action] = rest;
  const found = id ? requests()[id] : undefined;
  if (!found) return error(json, 404, "not_found", "Payment request not found");
  const r = settle(found);
  if (request.method === "GET" && !action) return json(publicView(r));
  if (request.method === "POST" && action === "transfers") return startTransfer(request, r, json);
  if (request.method === "POST" && action === "sessions") {
    if (publicView(r).status !== "open") return error(json, 409, "request_closed", "The payment request is closed");
    const body = (await request.json().catch(() => null)) as { paymentMethod?: unknown } | null;
    const method = r.paymentMethods.find((m) => m.id === body?.paymentMethod);
    if (!method) {
      return json({ statusCode: 400, code: "validation_failed", message: `paymentMethod must be one of ${r.paymentMethods.map((m) => m.id).join(", ")}` }, 400);
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
  return error(json, 404, "not_found", "Not found");
}
