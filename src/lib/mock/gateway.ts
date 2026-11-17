/* Mock mode's stand-in for the APISIX gateway that the payments pages call from the browser
   (PUBLIC_PAYMENTS_API_URL, which scripts/dev-mock.mjs points at `<payments origin>/mock-gateway`):
   the hosted checkout's keyless reads of a payment link, and the public swap pages' calls with the
   shared public key. Answers as the gateway does: the Payments API's JSON, CORS for any origin
   without credentials. The payment links are the mock dashboard's (src/lib/mock/handlers/payments.ts),
   so a link created in the dashboard opens on the local checkout, and what the payer does there
   shows on the payment's view.

   Paying a link from another network is never faked: the list of tokens it can be paid with comes
   from the real gateway (the cross-chain asset list), but a quote or a deposit address needs the
   real link, which a sample is not, so those answer that mock mode cannot make them. */
import { handleMockApi } from "@/lib/mock/index";
import { mockPaymentIntents, mockPayerSessions } from "@/lib/mock/handlers/payments";
import type { PaymentPayerEmail } from "@/lib/cosmos";
import { hex, nowIso, qrImage } from "@/lib/mock/fixtures";
import { MOCK_PUBLIC_ORG } from "@/lib/mock/shared";
import type { MockEnv } from "@/lib/mock/http";
import type { PaymentIntent } from "@/lib/cosmos";
import { isChain } from "@/lib/chains";

export const MOCK_GATEWAY_PREFIX = "/mock-gateway";

/* The mock checkout sessions by token (the real server keeps only a hash; here it is a sample). */
const MOCK_SESSION_TOKENS = new Map<string, PaymentPayerEmail>();

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Record-Token",
  "Access-Control-Max-Age": "600",
};

/* The shared public key per environment (src/lib/swap-api.ts reads `apiKey`); the gateway tells
   the environment from the key, and so does this one. */
const PUBLIC_KEYS: Record<MockEnv, string> = { dev: "dv_mockpublickey", prod: "prod_mockpublickey" };

function json(body: unknown, status = 200): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function findLink(id: string): { env: MockEnv; intent: PaymentIntent } | null {
  for (const env of ["dev", "prod"] as const) {
    const intent = mockPaymentIntents(env).find((i) => i.id === id);
    if (intent) return { env, intent };
  }
  return null;
}

/* The deadline a pending link shows: two hours after the mock started, so the countdown runs. */
const PENDING_DEADLINE = new Date(Date.now() + 2 * 3_600_000).toISOString();

/* The community server's PublicPaymentLinkEntity, as src/lib/payments/payment-link.ts parses it. */
function publicLink(intent: PaymentIntent, env: MockEnv) {
  const extra = intent as PaymentIntent & { networkFee?: string | null; expiresAt?: string | null };
  const fee = intent.merchantFee ?? null;
  const payerAccountRequired = intent.chain === "stellar" && !!fee && intent.amount !== null;
  // Every network but Stellar, Solana and Monad is paid through a deposit address only; on those
  // three a mainnet link with no fee can be paid from another network too (a Monad one only with
  // an amount).
  const native = isChain(intent.chain);
  const crossChainPayment = !native || (env === "prod" && !fee && (intent.chain !== "monad" || intent.amount !== null));
  const qr = intent.qr?.startsWith("data:image/png;base64,") ? intent.qr : qrImage(intent.id);
  return {
    id: intent.id,
    kind: intent.kind,
    chain: intent.chain,
    network: env === "prod" ? "public" : "testnet",
    status: intent.status,
    payTo: native ? intent.destination : null,
    amount: intent.amount,
    asset: intent.asset,
    assetIssuer: intent.assetIssuer,
    memo: intent.memo ?? "",
    msg: intent.msg,
    uri: intent.uri,
    qr: intent.status === "PENDING" ? qrImage(intent.id) : qr,
    txHash: intent.txHash,
    networkFee: extra.networkFee ?? null,
    expiresAt: intent.status === "PENDING" ? (extra.expiresAt ?? PENDING_DEADLINE) : (extra.expiresAt ?? null),
    createdAt: intent.createdAt,
    checkoutTheme: intent.checkoutTheme,
    merchantFee: fee,
    payerAccountRequired,
    crossChainPayment,
  };
}

const EVENT_FIELDS: Record<string, string> = {
  walletOpened: "checkoutWalletAt",
  walletClosed: "checkoutWalletClosedAt",
  sent: "checkoutSentAt",
};

async function paymentLinks(request: Request, rest: string[]): Promise<Response> {
  const [id, action] = rest;
  const found = id ? findLink(id) : null;
  if (!found) return json({ statusCode: 404, message: "Payment link not found" }, 404);
  const record = found.intent as unknown as Record<string, unknown>;
  if (request.method === "GET" && !action) {
    // The owner's view shows that the payer reached the page.
    record.checkoutSeenAt ??= nowIso();
    return json(publicLink(found.intent, found.env));
  }
  if (request.method === "POST" && action === "events") {
    const body = (await request.json().catch(() => null)) as { event?: unknown } | null;
    const field = typeof body?.event === "string" ? EVENT_FIELDS[body.event] : undefined;
    if (!field) return json({ statusCode: 400, message: "Unknown event" }, 400);
    record[field] = nowIso();
    const token = typeof (body as { payerToken?: unknown } | null)?.payerToken === "string" ? (body as { payerToken: string }).payerToken : "";
    const session = token ? MOCK_SESSION_TOKENS.get(token) : undefined;
    if (body?.event === "sent" && session) session.sentAt = nowIso();
    return json(undefined, 204);
  }
  if (request.method === "POST" && action === "payer") {
    // One checkout session per page, as the server: the first call answers a token, a later one
    // with it changes that session's own email. The payment's view lists them.
    if (found.intent.status !== "PENDING") return json({ statusCode: 400, code: "invalid_state_transition", message: "The payment link is closed" }, 400);
    const body = (await request.json().catch(() => null)) as { email?: unknown; lang?: unknown; payerToken?: unknown } | null;
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) {
      return json({ statusCode: 400, code: "validation_failed", message: "email must be an email" }, 400);
    }
    const lang = typeof body?.lang === "string" ? body.lang : "en";
    const sessions = mockPayerSessions(found.intent.id);
    const token = typeof body?.payerToken === "string" ? body.payerToken : "";
    const own = token ? MOCK_SESSION_TOKENS.get(token) : undefined;
    if (own && sessions.includes(own)) {
      own.email = email;
      own.lang = lang;
      return json({ payerToken: token });
    }
    const session = { email, lang, sentAt: null as string | null, recordedAt: nowIso() };
    sessions.push(session);
    const payerToken = Buffer.from(hex(`payer-session:${found.intent.id}:${sessions.length}:${Date.now()}`, 64), "hex").toString("base64url").slice(0, 43);
    MOCK_SESSION_TOKENS.set(payerToken, session);
    return json({ payerToken });
  }
  if (request.method === "GET" && action === "deposit-assets") {
    // The real list of what can be paid with, from the gateway (never sampled).
    const assets = new URL(`/api/cross-chain-swaps/assets?env=prod&org=${MOCK_PUBLIC_ORG}`, "http://mock.local");
    const res = await handleMockApi(new Request(assets), assets);
    const body = (await res.json().catch(() => null)) as { data?: unknown } | null;
    return res.ok && Array.isArray(body?.data) ? json({ data: body.data, routes: [] }) : json({ statusCode: 502, code: "provider_error", message: "Mock mode: the token list could not be read from the gateway." }, 502);
  }
  if (request.method === "POST" && (action === "quote" || action === "deposits")) {
    return json({ statusCode: 400, code: "validation_failed", message: "Mock mode: a payment from another network needs a real payment link, so no quote or deposit address is made here." }, 400);
  }
  if (request.method === "GET" && action === "deposits") return json({ statusCode: 404, message: "Deposit not found" }, 404);
  if (request.method === "POST" && action === "transaction") {
    if (found.intent.status !== "PENDING") return json({ statusCode: 400, code: "invalid_state_transition", message: "The payment link is closed" }, 400);
    const body = (await request.json().catch(() => null)) as { account?: unknown } | null;
    if (typeof body?.account !== "string" || !/^G[A-Z2-7]{55}$/.test(body.account.trim())) {
      return json({ statusCode: 400, message: "Invalid account" }, 400);
    }
    // Sample bytes, not a transaction any network accepts.
    const xdr = Buffer.from(hex(`payer-tx:${found.intent.id}:${body.account}`, 120), "hex").toString("base64");
    return json({ uri: `web+stellar:tx?xdr=${encodeURIComponent(xdr)}`, qr: qrImage(`payer-tx:${found.intent.id}`), xdr });
  }
  return json({ statusCode: 404, message: "Not found" }, 404);
}

/* The public swap pages' calls, answered by the dashboard's swap mocks with the key's environment. */
async function forwardToApi(request: Request, url: URL, path: string): Promise<Response> {
  const auth = request.headers.get("authorization") ?? "";
  const env: MockEnv = auth.includes(PUBLIC_KEYS.prod) ? "prod" : auth.includes(PUBLIC_KEYS.dev) ? "dev" : "prod";
  const target = new URL(`/api/${path}`, url);
  url.searchParams.forEach((v, k) => target.searchParams.set(k, v));
  target.searchParams.set("env", env);
  // The dashboard's routes scope a swap to an organization; the public key's records belong to
  // the shared public consumer, so they get one of their own here.
  if (!target.searchParams.has("org")) target.searchParams.set("org", MOCK_PUBLIC_ORG);
  let body: string | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    const parsed = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    body = JSON.stringify({ org: MOCK_PUBLIC_ORG, environment: env, ...(parsed ?? {}) });
  }
  const res = await handleMockApi(new Request(target, { method: request.method, headers: { "Content-Type": "application/json" }, body }), target);
  const text = await res.text();
  return new Response(text, { status: res.status, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
}

export async function handleMockGateway(request: Request, url: URL): Promise<Response> {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  const path = url.pathname.slice(MOCK_GATEWAY_PREFIX.length).replace(/^\/v1\//, "").replace(/\/+$/, "");
  const [head, ...rest] = path.split("/").filter(Boolean).map((s) => decodeURIComponent(s));
  if (head === "payment-links") return paymentLinks(request, rest);
  if (head === "public-key" && request.method === "GET") {
    const env: MockEnv = url.searchParams.get("env") === "dev" ? "dev" : "prod";
    return json({ apiKey: PUBLIC_KEYS[env], env });
  }
  if (head === "swaps" || head === "cross-chain-swaps" || head === "usdt0") return forwardToApi(request, url, path);
  console.warn(`[mock] no gateway mock for ${request.method} ${url.pathname}`);
  return json({ statusCode: 404, message: `Mock mode: no gateway mock for ${request.method} ${url.pathname}` }, 404);
}
