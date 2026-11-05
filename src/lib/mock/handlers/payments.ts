/* Mock handlers for the payments group: payment links (payment intents), webhook endpoints and
   their deliveries, products, customers, the overview's metrics (summary, series, balances, API
   and webhook logs) and the client activity feed. Everything lives in one store per environment
   (testnet rows for `dev`, mainnet rows for `prod`), seeded from a fixed seed, so creates, edits
   and deletes last until the dev server restarts. Shapes follow src/lib/cosmos.ts and the
   Payments API's spec (docs/openapi.json). */
import { Account, Asset, BASE_FEE, Memo, Networks, Operation, TransactionBuilder } from "@stellar/stellar-sdk";
import { CHAINS, NATIVE_CODES, isAddress, isChain, type Chain } from "@/lib/chains";
import { CHECKOUT_THEMES, isCheckoutTheme, type CheckoutTheme } from "@/lib/payments/checkout-themes";
import type { Customer, CustomerWallet, MerchantFee, PaymentIntent, Product, WebhookEndpoint } from "@/lib/cosmos";
import { badRequest, created, notFound, ok, page, route, str, type MockEnv, type MockRequest, type MockRoute } from "@/lib/mock/http";
import { mockEnvStore } from "@/lib/mock/store";
import {
  BLANK_PNG, cuid, evmAddress, evmTxHash, hex, hoursAgo, nowIso, qrImage, rng, solanaAddress,
  solanaSignature, stellarAccount, txHash, uuid, EURC_ISSUER, USDC_ISSUER, type Rng,
} from "@/lib/mock/fixtures";
import { DEFAULT_MOCK_ORG_ID, MOCK_ORG_SEEDS, mockCustomerSeeds, mockOrgWalletSeeds } from "@/lib/mock/shared";
import { realOutcome, realRecordsOf } from "@/lib/mock/real-swaps";

/* ------------------------------------------------------------------ types */

type Status = PaymentIntent["status"];

/** The intent as the Payments API answers it: the client type plus the checkout's progress. */
interface MockIntent extends PaymentIntent {
  chainReference: string | null;
  networkFee: string | null;
  expiresAt: string | null;
  checkoutSeenAt: string | null;
  checkoutWalletAt: string | null;
  checkoutWalletClosedAt: string | null;
  checkoutSentAt: string | null;
}

interface StoredIntent {
  org: string;
  intent: MockIntent;
}

type DeliveryStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "RETRYING";

interface Delivery {
  id: string;
  endpointId: string;
  eventType: string;
  eventId: string;
  status: DeliveryStatus;
  attempts: number;
  responseStatus: number | null;
  error: string | null;
  lastAttemptAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ApiLog {
  id: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  ip: string | null;
  userAgent: string | null;
  status: "ok" | "pending" | "fail";
  at: string;
}

interface ActivityEvent {
  id: string;
  source: string;
  level: string;
  category: string;
  type: string;
  message: string | null;
  sessionId: string | null;
  distinctId: string | null;
  appVersion: string | null;
  platform: string | null;
  network: string | null;
  durationMs: number | null;
  props: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  at: string;
  receivedAt: string;
}

interface PaymentsState {
  intents: StoredIntent[];
  customers: Customer[];
  products: Product[];
  webhooks: WebhookEndpoint[];
  secrets: Map<string, string>;
  deliveries: Delivery[];
  apiLogs: ApiLog[];
  activity: ActivityEvent[];
}

/* ---------------------------------------------------------------- helpers */

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/* The hosted checkout's origin: the local payments host the mock script sets, so a link's
   checkout opens on this server (src/lib/mock/gateway.ts answers its reads). */
const PAYMENTS_ORIGIN = (process.env.PUBLIC_PAYMENTS_URL || "https://payments.cosmospay.lat").replace(/\/+$/, "");
const MONAD_CHAIN_ID: Record<MockEnv, number> = { dev: 10143, prod: 143 };
const TOKEN_MINT: Record<Exclude<Chain, "stellar">, Record<MockEnv, string | null>> = {
  solana: { dev: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU", prod: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" },
  monad: { dev: null, prod: "0x754704bc059f8c67012fed69bc8a327a5aafb603" },
};
const TOKEN_DECIMALS: Record<string, number> = { USDC: 6, SOL: 9, MON: 18 };
/** What one unit is worth in USD (testnet assets at their mainnet counterpart's price). */
const PRICE_USD: Record<string, number> = { USDC: 1, EURC: 1.08, XLM: 0.27, SOL: 162, MON: 0.05 };
const PAYMENT_EVENTS = [
  "PAYMENT_INTENT_CREATED", "PAYMENT_INTENT_UPDATED", "PAYMENT_INTENT_SUCCEEDED",
  "PAYMENT_INTENT_FAILED", "PAYMENT_INTENT_CANCELLED", "PAYMENT_INTENT_DELETED",
] as const;

const networkOf = (env: MockEnv) => (env === "prod" ? "public" : "testnet");
const assetLabel = (chain: Chain, asset: string | null | undefined) => (!asset || asset === "native" ? NATIVE_CODES[chain] : asset);
const priceOf = (label: string) => PRICE_USD[label] ?? 0;
const ms = (iso: string | null | undefined) => (iso ? new Date(iso).getTime() : 0);
const plusMinutes = (iso: string, minutes: number) => new Date(ms(iso) + minutes * 60_000).toISOString();

/** A decimal with at most `places` digits, trailing zeros dropped ("12.5", "300"). */
function decimal(n: number, places = 7): string {
  if (!Number.isFinite(n)) return "0";
  const s = n.toFixed(places);
  return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
}

/** An amount in a token's smallest units, for an EIP-681 link. */
function toBaseUnits(amount: string, decimals: number): string {
  const [whole, frac = ""] = amount.split(".");
  const digits = `${whole}${frac.padEnd(decimals, "0").slice(0, decimals)}`.replace(/^0+(?=\d)/, "");
  return BigInt(digits || "0").toString();
}

function poisson(r: Rng, mean: number): number {
  const limit = Math.exp(-mean);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= r.next();
  } while (p > limit && k < 200);
  return k - 1;
}

function binomial(r: Rng, n: number, p: number): number {
  let k = 0;
  for (let i = 0; i < n; i++) if (r.next() < p) k++;
  return k;
}

/** An unsigned Stellar payment, the XDR a transaction intent hands the payer. */
function paymentXdr(env: MockEnv, source: string, destination: string, amount: string, asset: string, issuer: string | null, memo: string): string | null {
  try {
    const a = asset === "native" || !issuer ? Asset.native() : new Asset(asset, issuer);
    const tx = new TransactionBuilder(new Account(source, "4815162342"), {
      fee: BASE_FEE,
      networkPassphrase: env === "prod" ? Networks.PUBLIC : Networks.TESTNET,
    })
      .addOperation(Operation.payment({ destination, asset: a, amount }))
      .addMemo(memo ? Memo.id(memo) : Memo.none())
      .setTimeout(300)
      .build();
    return tx.toXDR();
  } catch {
    return null;
  }
}

/** The wallet link a payer opens, as the Payments API builds it per chain. */
function buildUri(env: MockEnv, i: MockIntent): string {
  if (i.chain === "stellar") {
    if (i.merchantFee) return `${PAYMENTS_ORIGIN}/${i.id}`;
    if (i.kind === "TX" && i.xdr) {
      const cb = i.callback ? `&callback=${encodeURIComponent(i.callback)}` : "";
      return `web+stellar:tx?xdr=${encodeURIComponent(i.xdr)}${cb}`;
    }
    const q = new URLSearchParams({ destination: i.destination });
    if (i.amount) q.set("amount", i.amount);
    if (i.asset !== "native") {
      q.set("asset_code", i.asset);
      if (i.assetIssuer) q.set("asset_issuer", i.assetIssuer);
    }
    if (i.memo) {
      q.set("memo", i.memo);
      q.set("memo_type", "MEMO_ID");
    }
    if (i.msg) q.set("msg", i.msg);
    return `web+stellar:pay?${q.toString()}`;
  }
  if (i.chain === "solana") {
    const q = new URLSearchParams();
    if (i.amount) q.set("amount", i.amount);
    if (i.assetIssuer) q.set("spl-token", i.assetIssuer);
    if (i.chainReference) q.set("reference", i.chainReference);
    if (i.msg) q.set("message", i.msg);
    const qs = q.toString();
    return `solana:${i.destination}${qs ? `?${qs}` : ""}`;
  }
  const deposit = i.chainReference ?? i.destination;
  const chainId = MONAD_CHAIN_ID[env];
  if (i.assetIssuer) {
    const units = i.amount ? `&uint256=${toBaseUnits(i.amount, TOKEN_DECIMALS.USDC)}` : "";
    return `ethereum:${i.assetIssuer}@${chainId}/transfer?address=${deposit}${units}`;
  }
  return `ethereum:${deposit}@${chainId}${i.amount ? `?value=${toBaseUnits(i.amount, TOKEN_DECIMALS.MON)}` : ""}`;
}

function chainHash(chain: Chain, label: string): string {
  return chain === "solana" ? solanaSignature(label) : chain === "monad" ? evmTxHash(label) : txHash(label);
}

function payerAddress(chain: Chain, label: string): string {
  return chain === "solana" ? solanaAddress(label) : chain === "monad" ? evmAddress(label) : stellarAccount(label);
}

function walletsOf(customer: Customer): CustomerWallet[] {
  return Array.isArray(customer.wallets) ? customer.wallets : [];
}

/* ------------------------------------------------------------------ seeds */

function seedCustomers(env: MockEnv): Customer[] {
  const r = rng(`customers:${env}`);
  const notes = ["Pays on the 5th of each month", "Wholesale account", "Prefers USDC on Stellar", null, null, null];
  return mockCustomerSeeds(env).map((c, i) => {
    const wallets: CustomerWallet[] = c.wallets.map((w) => ({ id: w.id, chain: w.chain, address: w.address, label: w.name, createdAt: w.createdAt }));
    return {
      id: c.id,
      name: c.name,
      alias: i % 4 === 0 ? c.name.split(" ")[0] : null,
      note: r.pick(notes),
      email: i % 7 === 6 ? null : c.email,
      wallets,
      account: wallets[0]?.address ?? null,
      reference: i % 3 === 1 ? `crm_${1000 + i * 37}` : null,
      createdAt: c.createdAt,
      updatedAt: c.createdAt,
    };
  });
}

function intentStatus(r: Rng, ageHours: number): Status {
  const x = r.next();
  if (ageHours < 24) {
    if (x < 0.42) return "PENDING";
    if (x < 0.52) return "SUBMITTED";
    if (x < 0.86) return "SUCCEEDED";
    if (x < 0.93) return "FAILED";
    return "CANCELLED";
  }
  if (x < 0.68) return "SUCCEEDED";
  if (x < 0.84) return "EXPIRED";
  if (x < 0.94) return "FAILED";
  return "CANCELLED";
}

const RECENT_STATUSES: Status[] = ["PENDING", "SUBMITTED", "PENDING", "SUCCEEDED", "PENDING", "SUBMITTED"];

function seedIntents(env: MockEnv, customers: Customer[]): StoredIntent[] {
  const r = rng(`intents:${env}`);
  const total = 64;
  const msgs = ["Order #1042", "Invoice INV-2207", "Monthly plan", "Coffee beans 1kg", "Workshop seat", "Tip", "Deposit", "Wine tasting for two"];
  const out: StoredIntent[] = [];
  for (let i = 0; i < total; i++) {
    const org = i % 9 === 4 ? MOCK_ORG_SEEDS[2].id : i % 4 === 1 ? MOCK_ORG_SEEDS[1].id : DEFAULT_MOCK_ORG_ID;
    const ageHours = 60 * 24 * Math.pow(i / total, 1.7) + r.next() * 3 + 0.05;
    const createdAt = hoursAgo(ageHours);
    const x = r.next();
    const chain: Chain = x < 0.6 ? "stellar" : x < 0.85 ? "solana" : "monad";
    // The newest few cover every open state, so the views always have one of each to show.
    const status = i < RECENT_STATUSES.length ? RECENT_STATUSES[i] : intentStatus(r, ageHours);
    const id = cuid(`intent:${env}:${i}`);
    const wallets = mockOrgWalletSeeds(org).filter((w) => w.chain === chain);
    const destination = wallets[0].address;

    // The asset and its issuer, mint or contract.
    let asset = "native";
    let assetIssuer: string | null = null;
    const a = r.next();
    if (chain === "stellar") {
      if (a < 0.6) [asset, assetIssuer] = ["USDC", USDC_ISSUER[env]];
      else if (a < 0.75) [asset, assetIssuer] = ["EURC", EURC_ISSUER[env]];
    } else {
      const mint = TOKEN_MINT[chain][env];
      if (mint && a < 0.62) [asset, assetIssuer] = ["USDC", mint];
    }
    const label = assetLabel(chain, asset);
    const kind: PaymentIntent["kind"] = chain === "stellar" && r.chance(0.25) ? "TX" : "PAY";
    const open = status === "PENDING" || status === "EXPIRED";
    const customerSet = kind === "PAY" && chain === "stellar" && open && r.chance(0.18);
    let amount: string | null = null;
    if (!customerSet) {
      amount =
        label === "SOL" ? r.amount(0.05, 12, 4)
          : label === "XLM" ? r.amount(20, 6000, 2)
            : label === "MON" ? r.amount(5, 2500, 2)
              : r.amount(5, 1800, 2);
    }

    // Who paid: a customer's wallet on this chain most of the time, else someone new.
    const paid = status === "SUCCEEDED" || status === "SUBMITTED" || (status === "FAILED" && r.chance(0.5));
    const holders = customers.flatMap((c) => walletsOf(c).filter((w) => w.chain === chain));
    let source: string | null = null;
    if (kind === "TX" || paid) {
      source = holders.length && r.chance(0.75) ? r.pick(holders).address : payerAddress(chain, `payer:${env}:${i}`);
    }
    const memo = chain === "stellar" ? String(r.int(100_000, 990_000_000)) : "";
    const msg = chain !== "monad" && r.chance(0.4) ? r.pick(msgs) : null;
    const callback = kind === "TX" && r.chance(0.5) ? "url:https://andes.example.com/cosmos/callback" : null;

    let merchantFee: MerchantFee | null = null;
    if (chain === "stellar" && amount && r.chance(0.18)) {
      const bps = r.pick([100, 150, 250]);
      const fixed = label === "XLM" ? "1" : "0.25";
      merchantFee = {
        bps,
        fixed,
        amount: decimal((Number(amount) * bps) / 10_000 + Number(fixed), 7),
        asset: label,
        wallet: wallets[1]?.address ?? destination,
        paidBy: r.chance(0.5) ? "recipient" : "payer",
      };
    }

    const seen = status !== "CANCELLED" && (status !== "PENDING" || r.chance(0.6)) ? plusMinutes(createdAt, r.int(1, 30)) : null;
    const walletAt = seen && (status !== "PENDING" || r.chance(0.5)) && status !== "EXPIRED" ? plusMinutes(seen, r.int(1, 4)) : null;
    const walletClosed = walletAt && status === "PENDING" && r.chance(0.5) ? plusMinutes(walletAt, 2) : null;
    const sentAt = walletAt && (status === "SUCCEEDED" || status === "SUBMITTED" || (status === "PENDING" && !walletClosed && r.chance(0.3))) ? plusMinutes(walletAt, 1) : null;
    const final = status !== "PENDING" && status !== "SUBMITTED";

    const intent: MockIntent = {
      id,
      kind,
      chain,
      status,
      network: networkOf(env),
      source,
      destination,
      amount,
      asset,
      assetIssuer,
      memo,
      msg,
      callback,
      xdr: null,
      uri: "",
      qr: status === "PENDING" ? qrImage(id) : BLANK_PNG,
      txHash: paid ? chainHash(chain, `intent:${env}:${i}`) : null,
      reference: r.chance(0.3) ? `order_${r.int(1000, 9999)}` : null,
      checkoutTheme: r.pick(CHECKOUT_THEMES),
      merchantFee,
      chainReference: chain === "solana" ? solanaAddress(`ref:${id}`) : chain === "monad" ? evmAddress(`deposit:${id}`) : null,
      networkFee: chain === "monad" ? (asset === "native" ? "0.01" : "0.02") : null,
      expiresAt: new Date(ms(createdAt) + DAY).toISOString(),
      checkoutSeenAt: seen,
      checkoutWalletAt: walletAt,
      checkoutWalletClosedAt: walletClosed,
      checkoutSentAt: sentAt,
      createdAt,
      updatedAt: final ? plusMinutes(createdAt, r.int(3, 50)) : (sentAt ?? walletClosed ?? walletAt ?? seen ?? createdAt),
    };
    if (kind === "TX" && source && amount) intent.xdr = paymentXdr(env, source, destination, amount, asset, assetIssuer, memo);
    intent.uri = buildUri(env, intent);
    out.push({ org, intent });
  }
  return out.sort((a, b) => ms(b.intent.createdAt) - ms(a.intent.createdAt));
}

function seedProducts(env: MockEnv): Product[] {
  const rows: [string, string | null, string | null, string, string, boolean, string | null][] = [
    ["Pro plan (monthly)", "Full API access, billed every month", "49", "USDC", "recurring", true, "plan_pro_m"],
    ["Pro plan (yearly)", "Two months free against monthly billing", "490", "USDC", "recurring", true, "plan_pro_y"],
    ["Team seat", "One more member in the workspace", "12", "USDC", "recurring", true, null],
    ["One-time setup", "Onboarding call and account configuration", "250", "USDC", "one_time", true, "setup"],
    ["Coffee beans 1kg", "Single origin, Salta highlands", "18.5", "USDC", "one_time", true, "sku_cof_1kg"],
    ["Wine tasting for two", "Cafayate, Saturday mornings", "120", "USDC", "one_time", true, "sku_wine_2"],
    ["Textile workshop", null, "75", "EURC", "one_time", false, null],
    ["API credits pack", "10,000 extra requests", "500", "native", "one_time", true, "credits_10k"],
    ["Donation link", "The payer chooses the amount", null, "USDC", "link", true, null],
    ["Gift card", null, null, "native", "link", false, "gift"],
  ];
  return rows.map(([name, description, amount, asset, kind, active, reference], i) => {
    const createdAt = hoursAgo(24 * (150 - i * 13) + i);
    return { id: cuid(`product:${env}:${i}`), name, description, amount, asset, kind, active, reference, createdAt, updatedAt: createdAt };
  });
}

function seedWebhooks(env: MockEnv): { webhooks: WebhookEndpoint[]; secrets: Map<string, string> } {
  const rows: [string, string | null, boolean, string[], number][] = [
    ["https://andes.example.com/hooks/cosmos", "Production order service", true, [...PAYMENT_EVENTS], 180],
    ["https://staging.andes.example.com/cosmos", "Staging", true, ["PAYMENT_INTENT_SUCCEEDED", "PAYMENT_INTENT_FAILED"], 120],
    ["https://erp.punamarket.example.com/webhooks/cosmos", "ERP sync", true, ["PAYMENT_INTENT_SUCCEEDED", "PAYMENT_INTENT_CANCELLED"], 60],
    ["https://hooks.saltalabs.example.com/payments", null, false, ["PAYMENT_INTENT_CREATED"], 30],
  ];
  const secrets = new Map<string, string>();
  const webhooks = rows.map(([url, description, enabled, eventTypes, days], i) => {
    const id = `we_${hex(`webhook:${env}:${i}`, 12)}`;
    secrets.set(id, `whsec_${hex(`secret:${env}:${i}`, 24)}`);
    const createdAt = hoursAgo(24 * days);
    return { id, url, description, enabled, eventTypes, createdAt, updatedAt: createdAt };
  });
  return { webhooks, secrets };
}

function seedDeliveries(env: MockEnv, webhooks: WebhookEndpoint[]): Delivery[] {
  const r = rng(`deliveries:${env}`);
  const errors = ["Request timed out after 10000 ms", "HTTP 500 Internal Server Error", "connect ECONNREFUSED", "HTTP 404 Not Found"];
  const out: Delivery[] = [];
  for (let i = 0; i < 48; i++) {
    const endpoint = webhooks[i % 7 === 3 ? 2 : i % 3 === 2 ? 1 : 0];
    const ageHours = 30 * 24 * Math.pow(i / 48, 1.5) + r.next() * 2 + 0.02;
    const createdAt = hoursAgo(ageHours);
    const x = r.next();
    const status: DeliveryStatus = endpoint === webhooks[1] && x < 0.35 ? "FAILED" : x < 0.76 ? "SUCCEEDED" : x < 0.88 ? "FAILED" : x < 0.95 ? "RETRYING" : "PENDING";
    const attempts = status === "SUCCEEDED" ? (r.chance(0.15) ? 2 : 1) : status === "FAILED" ? 5 : status === "RETRYING" ? r.int(1, 3) : 0;
    const failedCode = r.pick([500, 502, 404, null]);
    const responseStatus = status === "SUCCEEDED" ? r.pick([200, 200, 204]) : status === "PENDING" ? null : failedCode;
    const error = status === "SUCCEEDED" || status === "PENDING" ? null : failedCode === null ? errors[0] : failedCode === 404 ? errors[3] : failedCode === 502 ? errors[2] : errors[1];
    const last = status === "PENDING" ? null : plusMinutes(createdAt, status === "SUCCEEDED" ? 0 : r.int(5, 90));
    out.push({
      id: `wd_${hex(`delivery:${env}:${i}`, 12)}`,
      endpointId: endpoint.id,
      eventType: env === "dev" && i % 11 === 5 ? "ZK_PAYMENT_SUCCEEDED" : r.pick(endpoint.eventTypes),
      eventId: `evt_${uuid(`event:${env}:${i}`)}`,
      status,
      attempts,
      responseStatus,
      error,
      lastAttemptAt: last,
      createdAt,
      updatedAt: last ?? createdAt,
    });
  }
  return out.sort((a, b) => ms(b.createdAt) - ms(a.createdAt));
}

function seedApiLogs(env: MockEnv): ApiLog[] {
  const r = rng(`apilogs:${env}`);
  const calls: [string, string, number][] = [
    ["POST", "/v1/payment-intents/pay", 201], ["GET", "/v1/payment-intents", 200], ["GET", "/v1/payment-intents/{id}", 200],
    ["GET", "/v1/balances", 200], ["GET", "/v1/customers", 200], ["POST", "/v1/customers", 201], ["PATCH", "/v1/products/{id}", 200],
    ["POST", "/v1/swaps/quote", 200], ["POST", "/v1/webhooks", 201], ["DELETE", "/v1/payment-intents/{id}", 200],
    ["POST", "/v1/payment-intents/tx", 201], ["GET", "/v1/summary", 200],
  ];
  const fails: [string, string, number][] = [
    ["POST", "/v1/payment-intents/pay", 400], ["GET", "/v1/payment-intents/{id}", 404], ["POST", "/v1/swaps", 409],
    ["GET", "/v1/customers", 401], ["POST", "/v1/payment-intents/pay", 429], ["GET", "/v1/balances", 502],
  ];
  const agents = ["cosmos-pay-sdk/1.4.0 node/22.12.0", "curl/8.4.0", "python-requests/2.32.3", "PostmanRuntime/7.43.0"];
  const out: ApiLog[] = [];
  for (let i = 0; i < 64; i++) {
    const [method, path, statusCode] = r.chance(0.16) ? r.pick(fails) : r.pick(calls);
    const id = cuid(`apilog:${env}:${i}`);
    out.push({
      id,
      method,
      path: path.replace("{id}", cuid(`apilog-target:${env}:${i % 9}`)),
      statusCode,
      durationMs: statusCode === 502 ? r.int(800, 2400) : r.int(12, 420),
      ip: `203.0.113.${r.int(2, 250)}`,
      userAgent: r.pick(agents),
      status: statusCode >= 400 ? "fail" : "ok",
      at: hoursAgo(14 * 24 * Math.pow(i / 64, 1.4) + r.next() * 0.5),
    });
  }
  return out.sort((a, b) => ms(b.at) - ms(a.at));
}

function seedActivity(env: MockEnv): ActivityEvent[] {
  const r = rng(`activity:${env}`);
  const kinds: [string, string, string, string, string | null][] = [
    ["wallet", "info", "transaction", "payment.sent", "12.5 USDC"],
    ["wallet", "error", "transaction", "payment.failed", "op_no_trust"],
    ["wallet", "error", "transaction", "payment.failed", "tx_insufficient_balance"],
    ["wallet", "info", "auth", "wallet.unlock", null],
    ["wallet", "warn", "network", "rpc.slow", "Horizon answered in 4200 ms"],
    ["wallet", "error", "network", "rpc.timeout", "Horizon timeout after 8000 ms"],
    ["wallet", "info", "swap", "swap.quote", "XLM to USDC"],
    ["wallet", "warn", "transaction", "sign.rejected", "User rejected the request"],
    ["dashboard", "info", "navigation", "page.view", "/dashboard?view=payments"],
    ["dashboard", "info", "navigation", "page.view", "/dashboard?view=overview"],
    ["dashboard", "warn", "api", "api.slow", "GET /api/cosmos/series took 2100 ms"],
    ["dashboard", "debug", "performance", "web.vitals", "LCP 1.8 s"],
    ["server", "info", "api", "api.request", "POST /api/payment-intents"],
    ["server", "warn", "api", "api.request", "POST /api/webhooks"],
    ["server", "error", "api", "api.request", "GET /api/cosmos/balances"],
  ];
  const platforms = ["ext", "web", "desktop", "android", "ios"];
  const sessions = Array.from({ length: 14 }, (_, i) => `s_${hex(`session:${env}:${i}`, 3)}`);
  const devices = Array.from({ length: 8 }, (_, i) => `d_${hex(`device:${env}:${i}`, 3)}`);
  const out: ActivityEvent[] = [];
  for (let i = 0; i < 90; i++) {
    const [source, level, category, type, message] = r.pick(kinds);
    const at = hoursAgo(10 * 24 * Math.pow(i / 90, 1.3) + r.next() * 0.3);
    const wallet = source === "wallet";
    const s = r.int(0, sessions.length - 1);
    out.push({
      id: cuid(`activity:${env}:${i}`),
      source,
      level,
      category,
      type,
      message,
      sessionId: source === "server" ? null : sessions[s],
      distinctId: source === "server" ? null : devices[s % devices.length],
      appVersion: wallet ? r.pick(["1.5.0", "1.5.1", "1.4.3"]) : null,
      platform: wallet ? r.pick(platforms) : source === "dashboard" ? "web" : null,
      network: networkOf(env),
      durationMs: category === "network" || category === "api" || category === "performance" ? r.int(40, 4200) : null,
      props: type === "payment.sent" ? { asset: "USDC", amount: "12.5" } : type === "api.request" ? { status: level === "error" ? 500 : level === "warn" ? 400 : 201 } : null,
      ip: source === "server" ? null : `198.51.100.${r.int(2, 250)}`,
      userAgent: wallet ? `CosmosWallet/1.5.0` : source === "dashboard" ? "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/141.0" : null,
      at,
      receivedAt: plusMinutes(at, 0.2),
    });
  }
  return out.sort((a, b) => ms(b.at) - ms(a.at));
}

function seed(env: MockEnv): PaymentsState {
  const customers = seedCustomers(env);
  const { webhooks, secrets } = seedWebhooks(env);
  return {
    intents: seedIntents(env, customers),
    customers,
    products: seedProducts(env),
    webhooks,
    secrets,
    deliveries: seedDeliveries(env, webhooks),
    apiLogs: seedApiLogs(env),
    activity: seedActivity(env),
  };
}

const state = (env: MockEnv): PaymentsState => mockEnvStore("payments", env, seed);

/* ------------------------------------------------------- derived records */

/** A customer with the stats the API derives from the payments its wallets made. */
function withStats(env: MockEnv, c: Customer): Customer {
  const addresses = new Set(walletsOf(c).map((w) => (w.chain === "monad" ? w.address.toLowerCase() : w.address)));
  const mine = state(env).intents.filter(({ intent }) => intent.source && addresses.has(intent.chain === "monad" ? intent.source.toLowerCase() : intent.source));
  const settled = mine.filter(({ intent }) => intent.status === "SUCCEEDED");
  const total = settled.reduce((n, { intent }) => n + (Number(intent.amount) || 0), 0);
  return { ...c, account: walletsOf(c)[0]?.address ?? null, payments: mine.length, succeeded: settled.length, total: decimal(total, 7) };
}

/** The live store's customers, with their stats (other handlers read them). */
export function mockCustomers(env: MockEnv): Customer[] {
  return state(env).customers.map((c) => withStats(env, c));
}

/** Every payment intent of the environment, newest first, across organizations. */
export function mockPaymentIntents(env: MockEnv): PaymentIntent[] {
  return state(env).intents.map(({ intent }) => intent);
}

function findIntent(env: MockEnv, id: string): MockIntent | null {
  return state(env).intents.find(({ intent }) => intent.id === id)?.intent ?? null;
}

const publicWebhook = (w: WebhookEndpoint): WebhookEndpoint => {
  const { secret: _secret, ...rest } = w;
  return rest;
};

/* --------------------------------------------------------- payment links */

function listIntents(req: MockRequest): Response {
  const { url } = req;
  const status = url.searchParams.get("status");
  const chain = url.searchParams.get("chain");
  const fromRaw = url.searchParams.get("createdFrom");
  const from = fromRaw && !Number.isNaN(Date.parse(fromRaw)) ? Date.parse(fromRaw) : null;
  const rows = state(req.env).intents
    .filter(({ org }) => !req.org || org === req.org)
    .map(({ intent }) => intent)
    .filter((i) => (!status || i.status === status) && (!isChain(chain) || i.chain === chain) && (from === null || ms(i.createdAt) >= from));
  return ok(page(rows, url, 20), "Payment intents fetched successfully");
}

function createIntent(req: MockRequest): Response {
  const b = req.body;
  if (!b) return badRequest();
  const env: MockEnv = str(b, "environment") === "prod" ? "prod" : str(b, "environment") === "dev" ? "dev" : req.env;
  const org = str(b, "org");
  const chainRaw = str(b, "chain") ?? "stellar";
  if (!org) return badRequest("org is required");
  if (!isChain(chainRaw)) return badRequest("Unknown chain");
  const chain: Chain = chainRaw;
  const kind = str(b, "kind") === "tx" ? "TX" : "PAY";
  const destination = (str(b, "destination") ?? "").trim();
  if (!isAddress(chain, destination)) return badRequest(`destination: must be an address on ${chain}.`);
  const amount = str(b, "amount")?.trim() || null;
  if (amount && !/^\d+(\.\d+)?$/.test(amount)) return badRequest("Amount must be a positive decimal.");
  const source = str(b, "source")?.trim() || null;
  if (chain !== "stellar" && kind === "TX") return badRequest(`Transaction intents are Stellar only; use a payment link on ${chain}.`);
  if (kind === "TX" && (!source || !isAddress("stellar", source))) return badRequest("A source account is required for a transaction intent.");
  if (kind === "TX" && !amount) return badRequest("An amount is required for a transaction intent.");
  if (chain === "monad" && !amount) return badRequest("An amount is required on Monad: it is part of how the payment is recognised.");

  const code = (str(b, "assetCode") ?? "").trim().toUpperCase();
  const native = !code || code === NATIVE_CODES[chain] || code === "NATIVE";
  const issuerIn = str(b, "assetIssuer")?.trim() || null;
  const asset = native ? "native" : code;
  const assetIssuer = native
    ? null
    : issuerIn ?? (chain === "stellar" ? (code === "USDC" ? USDC_ISSUER[env] : code === "EURC" ? EURC_ISSUER[env] : null) : TOKEN_MINT[chain][env]);
  if (!native && !assetIssuer) return badRequest("A non-native asset requires an issuer.");

  const memo = chain === "stellar" ? (str(b, "memo")?.trim() || String(100_000 + Math.floor(Math.random() * 900_000_000))) : (str(b, "memo")?.trim() ?? "");
  const theme = str(b, "checkoutTheme");
  const fee = b.merchantFee && typeof b.merchantFee === "object" ? (b.merchantFee as Record<string, unknown>) : null;
  let merchantFee: MerchantFee | null = null;
  if (fee) {
    if (!amount) return badRequest("A merchant fee needs an amount.");
    const wallet = str(fee, "wallet") ?? "";
    if (!isAddress(chain, wallet)) return badRequest("merchantFee: the wallet must be an address on the link's chain.");
    const bps = Math.max(0, Math.min(1000, Math.trunc(Number(fee.bps) || 0)));
    const fixed = str(fee, "fixed") ?? "0";
    merchantFee = {
      bps,
      fixed,
      amount: decimal((Number(amount) * bps) / 10_000 + (Number(fixed) || 0), 7),
      asset: assetLabel(chain, asset),
      wallet,
      paidBy: str(fee, "paidBy") === "payer" ? "payer" : "recipient",
    };
  }

  const now = nowIso();
  const id = cuid(`intent:new:${now}:${Math.random()}`);
  const intent: MockIntent = {
    id,
    kind,
    chain,
    status: "PENDING",
    network: networkOf(env),
    source: kind === "TX" ? source : null,
    destination,
    amount,
    asset,
    assetIssuer,
    memo,
    msg: str(b, "msg")?.trim() || null,
    callback: chain === "stellar" ? str(b, "callback")?.trim() || null : null,
    xdr: null,
    uri: "",
    qr: qrImage(id),
    txHash: null,
    reference: null,
    checkoutTheme: isCheckoutTheme(theme) ? theme : "classic",
    merchantFee,
    chainReference: chain === "solana" ? solanaAddress(`ref:${id}`) : chain === "monad" ? evmAddress(`deposit:${id}`) : null,
    networkFee: chain === "monad" ? (asset === "native" ? "0.01" : "0.02") : null,
    expiresAt: new Date(Date.now() + DAY).toISOString(),
    checkoutSeenAt: null,
    checkoutWalletAt: null,
    checkoutWalletClosedAt: null,
    checkoutSentAt: null,
    createdAt: now,
    updatedAt: now,
  };
  if (kind === "TX" && source && amount) intent.xdr = paymentXdr(env, source, destination, amount, asset, assetIssuer, memo);
  intent.uri = buildUri(env, intent);
  state(env).intents.unshift({ org, intent });
  return created(intent, "Payment intent created successfully");
}

function getIntent(req: MockRequest): Response {
  const intent = findIntent(req.env, req.params.id);
  return intent ? ok(intent, "Payment intent retrieved successfully") : notFound("Payment intent not found");
}

function updateIntent(req: MockRequest): Response {
  const intent = findIntent(req.env, req.params.id);
  if (!intent) return notFound("Payment intent not found");
  const b = req.body ?? {};
  const status = str(b, "status");
  const statuses: Status[] = ["PENDING", "SUBMITTED", "SUCCEEDED", "FAILED", "CANCELLED", "EXPIRED"];
  if (status !== undefined) {
    if (!statuses.includes(status as Status)) return badRequest("Unknown status");
    intent.status = status as Status;
  }
  const theme = str(b, "checkoutTheme");
  if (theme !== undefined) {
    if (!isCheckoutTheme(theme)) return badRequest("Unknown checkout design");
    intent.checkoutTheme = theme as CheckoutTheme;
  }
  const hash = str(b, "txHash");
  if (hash !== undefined) intent.txHash = hash;
  const reference = str(b, "reference");
  if (reference !== undefined) intent.reference = reference || null;
  intent.updatedAt = nowIso();
  return ok(intent, "Payment intent updated successfully");
}

function deleteIntent(req: MockRequest): Response {
  const s = state(req.env);
  const at = s.intents.findIndex(({ intent }) => intent.id === req.params.id);
  if (at < 0) return notFound("Payment intent not found");
  if (s.intents[at].intent.status === "SUCCEEDED") return badRequest("A settled payment cannot be deleted.");
  s.intents.splice(at, 1);
  return ok({ id: req.params.id, deleted: true }, "Payment intent deleted successfully");
}

function validateIntent(req: MockRequest): Response {
  const intent = findIntent(req.env, req.params.id);
  if (!intent) return notFound("Payment intent not found");
  const hash = (str(req.body, "txHash") ?? "").trim();
  if (!hash) return badRequest("txHash is required");
  if (intent.status !== "PENDING" && intent.status !== "SUBMITTED") {
    return ok({ valid: false, status: intent.status, reason: "The payment is already final.", paymentIntent: intent }, "Payment intent validated");
  }
  const shape = intent.chain === "stellar" ? /^[0-9a-f]{64}$/i : intent.chain === "monad" ? /^0x[0-9a-f]{64}$/i : /^[1-9A-HJ-NP-Za-km-z]{43,90}$/;
  if (!shape.test(hash)) {
    return ok({ valid: false, status: intent.status, reason: "Transaction not found on the network.", paymentIntent: intent }, "Payment intent validated");
  }
  const now = nowIso();
  intent.status = "SUCCEEDED";
  intent.txHash = hash;
  intent.source = intent.source ?? payerAddress(intent.chain, `validated:${intent.id}`);
  intent.checkoutSentAt = intent.checkoutSentAt ?? now;
  intent.updatedAt = now;
  return ok({ valid: true, status: intent.status, reason: null, paymentIntent: intent }, "Payment intent validated");
}

/* --------------------------------------------------------------- webhooks */

function validUrl(v: string | undefined): v is string {
  if (!v) return false;
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

function eventTypesOf(b: Record<string, unknown> | null): string[] | undefined {
  const v = b?.eventTypes;
  if (!Array.isArray(v)) return undefined;
  return v.filter((x): x is string => typeof x === "string" && (PAYMENT_EVENTS as readonly string[]).includes(x));
}

function findWebhook(env: MockEnv, id: string): WebhookEndpoint | null {
  return state(env).webhooks.find((w) => w.id === id) ?? null;
}

function createWebhook(req: MockRequest): Response {
  const url = str(req.body, "url")?.trim();
  if (!validUrl(url)) return badRequest("url must be a URL");
  const now = nowIso();
  const id = `we_${hex(`webhook:new:${now}:${Math.random()}`, 12)}`;
  const secret = `whsec_${hex(`secret:new:${id}`, 24)}`;
  const types = eventTypesOf(req.body);
  const endpoint: WebhookEndpoint = {
    id,
    url,
    description: str(req.body, "description")?.trim() || null,
    enabled: true,
    eventTypes: types && types.length ? types : [...PAYMENT_EVENTS],
    createdAt: now,
    updatedAt: now,
  };
  const s = state(req.env);
  s.webhooks.unshift(endpoint);
  s.secrets.set(id, secret);
  return created({ ...endpoint, secret }, "Webhook created successfully");
}

function updateWebhook(req: MockRequest): Response {
  const w = findWebhook(req.env, req.params.id);
  if (!w) return notFound("Webhook not found");
  const b = req.body ?? {};
  const url = str(b, "url");
  if (url !== undefined) {
    if (!validUrl(url.trim())) return badRequest("url must be a URL");
    w.url = url.trim();
  }
  const description = str(b, "description");
  if (description !== undefined) w.description = description.trim() || null;
  if (typeof b.enabled === "boolean") w.enabled = b.enabled;
  const types = eventTypesOf(b);
  if (types) w.eventTypes = types;
  w.updatedAt = nowIso();
  return ok(publicWebhook(w), "Webhook updated successfully");
}

function deleteWebhook(req: MockRequest): Response {
  const s = state(req.env);
  const at = s.webhooks.findIndex((w) => w.id === req.params.id);
  if (at < 0) return notFound("Webhook not found");
  s.webhooks.splice(at, 1);
  s.secrets.delete(req.params.id);
  s.deliveries = s.deliveries.filter((d) => d.endpointId !== req.params.id);
  return ok({ id: req.params.id, deleted: true }, "Webhook deleted successfully");
}

function rotateSecret(req: MockRequest): Response {
  const w = findWebhook(req.env, req.params.id);
  if (!w) return notFound("Webhook not found");
  const secret = `whsec_${hex(`secret:rotated:${w.id}:${Date.now()}`, 24)}`;
  state(req.env).secrets.set(w.id, secret);
  w.updatedAt = nowIso();
  return ok({ ...publicWebhook(w), secret }, "Signing secret rotated");
}

function ping(req: MockRequest): Response {
  const w = findWebhook(req.env, req.params.id);
  if (!w) return notFound("Webhook not found");
  const result = w.enabled
    ? { ok: true, responseStatus: 200, error: null }
    : { ok: false, responseStatus: null, error: "The endpoint is disabled." };
  return ok(result, "Test event sent");
}

function listDeliveries(req: MockRequest): Response {
  if (!findWebhook(req.env, req.params.id)) return notFound("Webhook not found");
  const status = req.url.searchParams.get("status");
  const rows = state(req.env).deliveries.filter((d) => d.endpointId === req.params.id && (!status || d.status === status));
  return ok(page(rows, req.url, 20), "Deliveries fetched successfully");
}

function redeliver(req: MockRequest): Response {
  const d = state(req.env).deliveries.find((x) => x.id === req.params.deliveryId && x.endpointId === req.params.id);
  if (!d) return notFound("Delivery not found");
  const now = nowIso();
  Object.assign(d, { status: "SUCCEEDED", attempts: d.attempts + 1, responseStatus: 200, error: null, lastAttemptAt: now, updatedAt: now });
  return ok(d, "Delivery re-sent");
}

/* --------------------------------------------------------------- products */

const productAsset = (code: string | undefined) => {
  const c = code?.trim().toUpperCase();
  return !c || c === "XLM" || c === "NATIVE" ? "native" : c;
};
const PRODUCT_KINDS = ["recurring", "one_time", "link"];
const AMOUNT_7 = /^\d+(\.\d{1,7})?$/;

function createProduct(req: MockRequest): Response {
  const b = req.body;
  const name = str(b, "name")?.trim();
  if (!name) return badRequest("name is required");
  const amount = str(b, "amount")?.trim() || null;
  if (amount && !AMOUNT_7.test(amount)) return badRequest("Amount must be a decimal with up to 7 decimals.");
  const kind = str(b, "kind") ?? "one_time";
  if (!PRODUCT_KINDS.includes(kind)) return badRequest("Unknown kind");
  const now = nowIso();
  const product: Product = {
    id: cuid(`product:new:${now}:${Math.random()}`),
    name,
    description: str(b, "description")?.trim() || null,
    amount,
    asset: productAsset(str(b, "assetCode")),
    kind,
    active: typeof b?.active === "boolean" ? b.active : true,
    reference: str(b, "reference")?.trim() || null,
    createdAt: now,
    updatedAt: now,
  };
  state(req.env).products.unshift(product);
  return created(product, "Product created successfully");
}

function updateProduct(req: MockRequest): Response {
  const p = state(req.env).products.find((x) => x.id === req.params.id);
  if (!p) return notFound("Product not found");
  const b = req.body ?? {};
  const name = str(b, "name");
  if (name !== undefined) {
    if (!name.trim()) return badRequest("name cannot be empty");
    p.name = name.trim();
  }
  const description = str(b, "description");
  if (description !== undefined) p.description = description.trim() || null;
  if (b.amount === null) p.amount = null;
  else {
    const amount = str(b, "amount");
    if (amount !== undefined) {
      if (!AMOUNT_7.test(amount.trim())) return badRequest("Amount must be a decimal with up to 7 decimals.");
      p.amount = amount.trim();
    }
  }
  const code = str(b, "assetCode");
  if (code !== undefined) p.asset = productAsset(code);
  const kind = str(b, "kind");
  if (kind !== undefined) {
    if (!PRODUCT_KINDS.includes(kind)) return badRequest("Unknown kind");
    p.kind = kind;
  }
  if (typeof b.active === "boolean") p.active = b.active;
  const reference = str(b, "reference");
  if (reference !== undefined) p.reference = reference.trim() || null;
  p.updatedAt = nowIso();
  return ok(p, "Product updated successfully");
}

function deleteProduct(req: MockRequest): Response {
  const s = state(req.env);
  const at = s.products.findIndex((x) => x.id === req.params.id);
  if (at < 0) return notFound("Product not found");
  s.products.splice(at, 1);
  return ok({ id: req.params.id, deleted: true }, "Product deleted successfully");
}

/* -------------------------------------------------------------- customers */

function chainOfAddress(address: string): Chain | null {
  return CHAINS.find((c) => isAddress(c, address)) ?? null;
}

function walletFrom(input: unknown, now: string): CustomerWallet | string {
  if (!input || typeof input !== "object") return "Invalid wallet";
  const w = input as Record<string, unknown>;
  const chain = str(w, "chain");
  const address = (str(w, "address") ?? "").trim();
  if (!isChain(chain)) return "wallet.chain: unknown network";
  if (!isAddress(chain, address)) return "Must be an address on the chosen network.";
  return { id: uuid(`wallet:new:${chain}:${address}:${now}:${Math.random()}`), chain, address, label: str(w, "label")?.trim() || null, createdAt: now };
}

function findCustomer(env: MockEnv, id: string): Customer | null {
  return state(env).customers.find((c) => c.id === id) ?? null;
}

function createCustomer(req: MockRequest): Response {
  const b = req.body;
  const name = str(b, "name")?.trim();
  if (!name) return badRequest("name is required");
  const email = str(b, "email")?.trim() || null;
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return badRequest("email must be an email");
  const now = nowIso();
  const wallets: CustomerWallet[] = [];
  const list = Array.isArray(b?.wallets) ? b.wallets : [];
  for (const input of list) {
    const w = walletFrom(input, now);
    if (typeof w === "string") return badRequest(w);
    wallets.push(w);
  }
  const account = str(b, "account")?.trim();
  if (account) {
    const chain = chainOfAddress(account);
    if (!chain) return badRequest("Must be a Stellar, Solana or Monad address.");
    if (!wallets.some((w) => w.address === account)) wallets.unshift({ id: uuid(`wallet:new:${account}:${now}`), chain, address: account, label: null, createdAt: now });
  }
  const customer: Customer = {
    id: uuid(`customer:new:${now}:${Math.random()}`),
    name,
    alias: str(b, "alias")?.trim() || null,
    note: str(b, "note")?.trim() || null,
    email,
    wallets,
    account: wallets[0]?.address ?? null,
    reference: str(b, "reference")?.trim() || null,
    createdAt: now,
    updatedAt: now,
  };
  state(req.env).customers.unshift(customer);
  return created(withStats(req.env, customer), "Customer created successfully");
}

function updateCustomer(req: MockRequest): Response {
  const c = findCustomer(req.env, req.params.id);
  if (!c) return notFound("Customer not found");
  const b = req.body ?? {};
  const name = str(b, "name");
  if (name !== undefined) {
    if (!name.trim()) return badRequest("name cannot be empty");
    c.name = name.trim();
  }
  for (const key of ["alias", "note", "reference"] as const) {
    const v = str(b, key);
    if (v !== undefined) c[key] = v.trim() || null;
  }
  if (b.email === null) c.email = null;
  else {
    const email = str(b, "email");
    if (email !== undefined) {
      if (email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return badRequest("email must be an email");
      c.email = email.trim() || null;
    }
  }
  c.updatedAt = nowIso();
  return ok(withStats(req.env, c), "Customer updated successfully");
}

function deleteCustomer(req: MockRequest): Response {
  const s = state(req.env);
  const at = s.customers.findIndex((c) => c.id === req.params.id);
  if (at < 0) return notFound("Customer not found");
  s.customers.splice(at, 1);
  return ok({ id: req.params.id, deleted: true }, "Customer deleted successfully");
}

function addWallet(req: MockRequest): Response {
  const c = findCustomer(req.env, req.params.id);
  if (!c) return notFound("Customer not found");
  const w = walletFrom(req.body, nowIso());
  if (typeof w === "string") return badRequest(w);
  if (walletsOf(c).some((x) => x.chain === w.chain && x.address === w.address)) return badRequest("This wallet is already on the customer.");
  if (walletsOf(c).length >= 20) return badRequest("A customer holds up to 20 wallets.");
  c.wallets = [...walletsOf(c), w];
  c.account = c.wallets[0]?.address ?? null;
  c.updatedAt = nowIso();
  return created(w, "Wallet added successfully");
}

function removeWallet(req: MockRequest): Response {
  const c = findCustomer(req.env, req.params.id);
  if (!c) return notFound("Customer not found");
  const before = walletsOf(c).length;
  c.wallets = walletsOf(c).filter((w) => w.id !== req.params.walletId);
  if (c.wallets.length === before) return notFound("Wallet not found");
  c.account = c.wallets[0]?.address ?? null;
  c.updatedAt = nowIso();
  return ok({ id: req.params.walletId, deleted: true }, "Wallet removed successfully");
}

/* ---------------------------------------------------------------- metrics */

type Period = "day" | "week" | "month" | "year";
const SERIES_COUNT: Record<Period, number> = { day: 30, week: 12, month: 12, year: 5 };

function utcDay(t: number): number {
  const d = new Date(t);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function bucketStart(period: Period, t: number): number {
  const d = new Date(utcDay(t));
  if (period === "week") d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  if (period === "month") d.setUTCDate(1);
  if (period === "year") d.setUTCMonth(0, 1);
  return d.getTime();
}

function shiftBuckets(period: Period, start: number, n: number): number {
  const d = new Date(start);
  if (period === "day") d.setUTCDate(d.getUTCDate() + n);
  if (period === "week") d.setUTCDate(d.getUTCDate() + 7 * n);
  if (period === "month") d.setUTCMonth(d.getUTCMonth() + n);
  if (period === "year") d.setUTCFullYear(d.getUTCFullYear() + n);
  return d.getTime();
}

const dayKey = (t: number) => new Date(t).toISOString().slice(0, 10);

interface DayStats {
  count: number;
  succeeded: number;
  failed: number;
  volume: number;
  volumeUsd: number;
  payers: number;
  swaps: { count: number; succeeded: number; failed: number; volumeUsd: number; dex: number; chain: number; crossChain: number; usdt0: number };
  liquidity: { count: number; succeeded: number; failed: number };
  webhooks: { deliveries: number; failed: number };
  zk: { count: number; succeeded: number; expired: number; volume: number; volumeUsd: number };
}

/** One UTC day of activity: payments from the stored intents where they reach back that far,
    a seeded history before them; the other services always from the seeded history. */
function dayStats(env: MockEnv, day: number, today: number, storeFrom: number, byDay: Map<string, MockIntent[]>): DayStats {
  const key = dayKey(day);
  const r = rng(`series:${env}:${key}`);
  const age = (today - day) / DAY;
  const trend = Math.max(0.06, 1 - age / 1900) * ([0, 6].includes(new Date(day).getUTCDay()) ? 0.7 : 1);
  let count: number;
  let succeeded: number;
  let failed: number;
  let volume: number;
  let volumeUsd: number;
  let payers: number;
  if (day >= storeFrom) {
    const rows = byDay.get(key) ?? [];
    const settled = rows.filter((i) => i.status === "SUCCEEDED");
    count = rows.length;
    succeeded = settled.length;
    failed = rows.filter((i) => i.status === "FAILED").length;
    volume = settled.reduce((n, i) => n + (Number(i.amount) || 0), 0);
    volumeUsd = settled.reduce((n, i) => n + (Number(i.amount) || 0) * priceOf(assetLabel(i.chain, i.asset)), 0);
    payers = new Set(rows.map((i) => i.source).filter(Boolean)).size;
  } else {
    count = poisson(r, 1.1 * trend);
    succeeded = binomial(r, count, 0.72);
    failed = binomial(r, count - succeeded, 0.3);
    volumeUsd = succeeded * (40 + r.next() * 520);
    volume = volumeUsd * 1.6;
    payers = Math.round(count * 0.7);
  }
  const swapsN = poisson(r, 0.8 * trend + 0.1);
  const swapsOk = binomial(r, swapsN, 0.8);
  const swapsFail = binomial(r, swapsN - swapsOk, 0.5);
  const dex = env === "dev" ? swapsN : binomial(r, swapsN, 0.5);
  const chain = env === "dev" ? 0 : binomial(r, swapsN - dex, 0.5);
  const crossChain = env === "dev" ? 0 : binomial(r, swapsN - dex - chain, 0.75);
  const lq = poisson(r, 0.25 * trend);
  const lqOk = binomial(r, lq, 0.8);
  const deliveries = count * 2 + poisson(r, 0.6);
  const zkN = env === "dev" ? poisson(r, 0.35 * trend) : 0;
  const zkOk = binomial(r, zkN, 0.7);
  const zkVolume = zkOk * (50 + r.next() * 900);
  return {
    count, succeeded, failed, volume, volumeUsd, payers,
    swaps: { count: swapsN, succeeded: swapsOk, failed: swapsFail, volumeUsd: swapsOk * (30 + r.next() * 700), dex, chain, crossChain, usdt0: swapsN - dex - chain - crossChain },
    liquidity: { count: lq, succeeded: lqOk, failed: binomial(r, lq - lqOk, 0.6) },
    webhooks: { deliveries, failed: binomial(r, deliveries, 0.07) },
    zk: { count: zkN, succeeded: zkOk, expired: binomial(r, zkN - zkOk, 0.6), volume: zkVolume, volumeUsd: zkVolume * PRICE_USD.XLM },
  };
}

function emptyStats(): DayStats {
  return {
    count: 0, succeeded: 0, failed: 0, volume: 0, volumeUsd: 0, payers: 0,
    swaps: { count: 0, succeeded: 0, failed: 0, volumeUsd: 0, dex: 0, chain: 0, crossChain: 0, usdt0: 0 },
    liquidity: { count: 0, succeeded: 0, failed: 0 },
    webhooks: { deliveries: 0, failed: 0 },
    zk: { count: 0, succeeded: 0, expired: 0, volume: 0, volumeUsd: 0 },
  };
}

function addStats(a: DayStats, b: DayStats): void {
  a.count += b.count; a.succeeded += b.succeeded; a.failed += b.failed; a.volume += b.volume; a.volumeUsd += b.volumeUsd; a.payers += b.payers;
  for (const k of ["count", "succeeded", "failed", "volumeUsd", "dex", "chain", "crossChain", "usdt0"] as const) a.swaps[k] += b.swaps[k];
  for (const k of ["count", "succeeded", "failed"] as const) a.liquidity[k] += b.liquidity[k];
  a.webhooks.deliveries += b.webhooks.deliveries; a.webhooks.failed += b.webhooks.failed;
  for (const k of ["count", "succeeded", "expired", "volume", "volumeUsd"] as const) a.zk[k] += b.zk[k];
}

/** The days from `from` to today, each with its stats. */
function daysFrom(env: MockEnv, from: number): { day: number; stats: DayStats }[] {
  const today = utcDay(Date.now());
  const intents = state(env).intents.map(({ intent }) => intent);
  const storeFrom = intents.length ? utcDay(Math.min(...intents.map((i) => ms(i.createdAt)))) : today + DAY;
  const byDay = new Map<string, MockIntent[]>();
  for (const i of intents) {
    const k = dayKey(utcDay(ms(i.createdAt)));
    byDay.set(k, [...(byDay.get(k) ?? []), i]);
  }
  const out: { day: number; stats: DayStats }[] = [];
  for (let d = utcDay(from); d <= today; d += DAY) out.push({ day: d, stats: dayStats(env, d, today, storeFrom, byDay) });
  return out;
}

const usd = (n: number) => n.toFixed(2);

/* The swaps' part of the activity: the real swaps opened here, never sample ones
   (src/lib/mock/real-swaps.ts). They carry no USD worth the gateway priced, so the volume is 0 and
   what settled is counted as unpriced. */
function realSwapSeries(env: MockEnv, period: Period, starts: number[], first: number, previousSince: number) {
  const zero = () => ({ count: 0, succeeded: 0, failed: 0 });
  const buckets = new Map(starts.map((st) => [st, zero()]));
  const cur = { ...zero(), dex: 0, chain: 0, crossChain: 0, usdt0: 0 };
  const prev = zero();
  for (const { kind, rec } of realRecordsOf(env)) {
    const at = ms(rec.createdAt);
    if (!Number.isFinite(at) || at < previousSince) continue;
    const end = realOutcome(rec.status);
    const add = (t: { count: number; succeeded: number; failed: number }) => {
      t.count += 1;
      if (end === "done") t.succeeded += 1;
      if (end === "failed") t.failed += 1;
    };
    if (at < first) { add(prev); continue; }
    add(cur);
    const b = buckets.get(bucketStart(period, at));
    if (b) add(b);
    if (kind === "cross") cur.crossChain += 1;
    else if (kind === "usdt0") cur.usdt0 += 1;
    else if (rec.chain === "solana" || rec.chain === "monad") cur.chain += 1;
    else cur.dex += 1;
  }
  return {
    buckets: starts.map((st) => ({ start: dayKey(st), ...(buckets.get(st) ?? zero()), volumeUsd: usd(0) })),
    totals: {
      count: cur.count, succeeded: cur.succeeded, failed: cur.failed,
      inProgress: Math.max(0, cur.count - cur.succeeded - cur.failed),
      byKind: { dex: cur.dex, chain: cur.chain, crossChain: cur.crossChain, usdt0: cur.usdt0 },
      volumeUsd: usd(0), unpriced: cur.succeeded,
    },
    previous: { ...prev, volumeUsd: usd(0) },
  };
}

function series(env: MockEnv, period: Period) {
  const n = SERIES_COUNT[period];
  const first = shiftBuckets(period, bucketStart(period, Date.now()), -(n - 1));
  const previousSince = shiftBuckets(period, first, -n);
  const starts = Array.from({ length: n }, (_, i) => shiftBuckets(period, first, i));
  const buckets = new Map(starts.map((s) => [s, emptyStats()]));
  const cur = emptyStats();
  const prev = emptyStats();
  for (const { day, stats } of daysFrom(env, previousSince)) {
    if (day < first) {
      addStats(prev, stats);
      continue;
    }
    addStats(cur, stats);
    const b = buckets.get(bucketStart(period, day));
    if (b) addStats(b, stats);
  }
  const list = starts.map((s) => ({ start: dayKey(s), stats: buckets.get(s) ?? emptyStats() }));
  const fees = (v: number) => (v * 18) / 10_000;
  return {
    period,
    buckets: list.map(({ start, stats: s }) => ({ start, count: s.count, succeeded: s.succeeded, failed: s.failed, volume: decimal(s.volume), volumeUsd: usd(s.volumeUsd) })),
    totals: { count: cur.count, succeeded: cur.succeeded, failed: cur.failed, volume: decimal(cur.volume), volumeUsd: usd(cur.volumeUsd), unpriced: 0, payers: cur.payers },
    previous: { count: prev.count, succeeded: prev.succeeded, failed: prev.failed, volume: decimal(prev.volume), volumeUsd: usd(prev.volumeUsd), unpriced: 0 },
    swaps: realSwapSeries(env, period, starts, first, previousSince),
    liquidity: {
      buckets: list.map(({ start, stats: s }) => ({ start, ...s.liquidity })),
      totals: { ...cur.liquidity },
      previous: { ...prev.liquidity },
    },
    webhooks: {
      buckets: list.map(({ start, stats: s }) => ({ start, ...s.webhooks })),
      totals: { ...cur.webhooks },
      previous: { ...prev.webhooks },
    },
    zkPayments: {
      buckets: list.map(({ start, stats: s }) => ({ start, count: s.zk.count, succeeded: s.zk.succeeded, expired: s.zk.expired, volume: decimal(s.zk.volume), volumeUsd: usd(s.zk.volumeUsd) })),
      totals: { count: cur.zk.count, succeeded: cur.zk.succeeded, expired: cur.zk.expired, volume: decimal(cur.zk.volume), volumeUsd: usd(cur.zk.volumeUsd), fees: decimal(fees(cur.zk.volume)), feesUsd: usd(fees(cur.zk.volumeUsd)) },
      previous: { count: prev.zk.count, succeeded: prev.zk.succeeded, expired: prev.zk.expired, volume: decimal(prev.zk.volume), volumeUsd: usd(prev.zk.volumeUsd), fees: decimal(fees(prev.zk.volume)), feesUsd: usd(fees(prev.zk.volumeUsd)) },
    },
  };
}

function summary(env: MockEnv) {
  const s = state(env);
  const intents = s.intents.map(({ intent }) => intent);
  const by = (st: Status) => intents.filter((i) => i.status === st).length;
  const settled = intents.filter((i) => i.status === "SUCCEEDED");
  const groups = new Map<string, { chain: Chain; asset: string; amount: number; count: number; usd: number }>();
  for (const i of settled) {
    const label = assetLabel(i.chain, i.asset);
    const key = `${i.chain}:${label}`;
    const g = groups.get(key) ?? { chain: i.chain, asset: label, amount: 0, count: 0, usd: 0 };
    g.amount += Number(i.amount) || 0;
    g.count += 1;
    g.usd += (Number(i.amount) || 0) * priceOf(label);
    groups.set(key, g);
  }
  const volume = [...groups.values()]
    .sort((a, b) => b.usd - a.usd)
    .map((g) => ({ chain: g.chain, asset: g.asset, amount: decimal(g.amount), count: g.count, amountUsd: usd(g.usd) }));
  const daily = daysFrom(env, Date.now() - 29 * DAY).map(({ day, stats }) => ({ date: dayKey(day), count: stats.count, volume: decimal(stats.volume) }));
  return {
    totals: {
      all: intents.length,
      succeeded: settled.length,
      pending: by("PENDING"),
      submitted: by("SUBMITTED"),
      failed: by("FAILED"),
      cancelled: by("CANCELLED"),
      expired: by("EXPIRED"),
      successRate: intents.length ? Math.round((settled.length / intents.length) * 1000) / 10 : 0,
    },
    volume,
    volumeUsd: usd([...groups.values()].reduce((n, g) => n + g.usd, 0)),
    unpriced: 0,
    webhooks: { endpoints: s.webhooks.length, deliveries: s.deliveries.length, failedDeliveries: s.deliveries.filter((d) => d.status === "FAILED").length },
    customers: new Set(intents.map((i) => i.source).filter(Boolean)).size,
    series: daily,
    recent: settled.slice(0, 6).map((i) => ({ id: i.id, kind: i.kind, status: i.status, chain: i.chain, amount: i.amount, asset: assetLabel(i.chain, i.asset), destination: i.destination, createdAt: i.createdAt })),
  };
}

function balances(env: MockEnv) {
  const groups = new Map<string, { chain: Chain; asset: string; amount: number; pending: number; count: number; usd: number }>();
  for (const { intent: i } of state(env).intents) {
    const label = assetLabel(i.chain, i.asset);
    const key = `${i.chain}:${label}`;
    const g = groups.get(key) ?? { chain: i.chain, asset: label, amount: 0, pending: 0, count: 0, usd: 0 };
    const amount = Number(i.amount) || 0;
    if (i.status === "SUCCEEDED") {
      g.amount += amount;
      g.count += 1;
      g.usd += amount * priceOf(label);
    } else if (i.status === "PENDING" || i.status === "SUBMITTED") g.pending += amount;
    groups.set(key, g);
  }
  const data = [...groups.values()]
    .sort((a, b) => b.amount - a.amount)
    .map((g) => ({ chain: g.chain, asset: g.asset, amount: decimal(g.amount), pending: decimal(g.pending), count: g.count }));
  return { data, total: data.length };
}

function webhookLogs(env: MockEnv) {
  const s = state(env);
  const urlOf = new Map(s.webhooks.map((w) => [w.id, w.url]));
  const data = s.deliveries.map((d) => ({
    id: d.id,
    endpointId: d.endpointId,
    url: urlOf.get(d.endpointId) ?? null,
    eventType: d.eventType,
    eventId: d.eventId,
    attempts: d.attempts,
    responseStatus: d.responseStatus,
    error: d.error,
    status: d.status === "SUCCEEDED" ? "ok" : d.status === "FAILED" ? "fail" : "pending",
    at: d.lastAttemptAt ?? d.createdAt,
  }));
  return { data: data.slice(0, 100), total: data.length, take: 100, skip: 0 };
}

function metric(req: MockRequest): Response {
  const { env } = req;
  const name = req.params.metric;
  if (name === "summary") return ok(summary(env), "summary fetched successfully");
  if (name === "series") {
    const p = req.url.searchParams.get("period");
    const period: Period = p === "week" || p === "month" || p === "year" ? p : "day";
    return ok(series(env, period), "series fetched successfully");
  }
  if (name === "balances") return ok(balances(env), "balances fetched successfully");
  if (name === "logs") {
    const rows = state(env).apiLogs;
    return ok({ data: rows.slice(0, 100), total: rows.length, take: 100, skip: 0 }, "logs fetched successfully");
  }
  if (name === "webhook-logs") return ok(webhookLogs(env), "webhook-logs fetched successfully");
  return notFound("Unknown metric");
}

/* --------------------------------------------------------------- activity */

function listActivity(req: MockRequest): Response {
  const q = req.url.searchParams;
  const since = q.get("since") ? Date.parse(q.get("since") ?? "") : NaN;
  const until = q.get("until") ? Date.parse(q.get("until") ?? "") : NaN;
  const rows = state(req.env).activity.filter((e) =>
    (["source", "level", "category", "type", "network"] as const).every((k) => !q.get(k) || e[k] === q.get(k)) &&
    (Number.isNaN(since) || ms(e.at) >= since) &&
    (Number.isNaN(until) || ms(e.at) <= until),
  );
  return ok(page(rows, req.url, 100), "Activity fetched successfully");
}

function ingestActivity(req: MockRequest): Response {
  const events = Array.isArray(req.body?.events) ? req.body.events : null;
  if (!events) return badRequest();
  const s = state(req.env);
  const now = nowIso();
  for (const raw of events.slice(0, 50)) {
    if (!raw || typeof raw !== "object") continue;
    const e = raw as Record<string, unknown>;
    const type = str(e, "type");
    if (!type) continue;
    s.activity.unshift({
      id: cuid(`activity:new:${now}:${Math.random()}`),
      source: "dashboard",
      level: str(e, "level") ?? "info",
      category: str(e, "category") ?? "navigation",
      type,
      message: str(e, "message") ?? null,
      sessionId: str(e, "sessionId") ?? null,
      distinctId: str(e, "distinctId") ?? null,
      appVersion: str(e, "appVersion") ?? null,
      platform: str(e, "platform") ?? "web",
      network: str(e, "network") ?? networkOf(req.env),
      durationMs: typeof e.durationMs === "number" ? e.durationMs : null,
      props: e.props && typeof e.props === "object" ? (e.props as Record<string, unknown>) : null,
      ip: "127.0.0.1",
      userAgent: null,
      at: str(e, "occurredAt") ?? now,
      receivedAt: now,
    });
  }
  s.activity.length = Math.min(s.activity.length, 500);
  return ok({ accepted: events.length }, "Events queued");
}

function countKeys(values: string[], limit = 20): { key: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([key, count]) => ({ key, count }));
}

function activitySummary(req: MockRequest): Response {
  const daysRaw = Math.trunc(Number(req.url.searchParams.get("days")));
  const days = daysRaw >= 1 && daysRaw <= 90 ? daysRaw : 7;
  const source = req.url.searchParams.get("source");
  const from = utcDay(Date.now()) - (days - 1) * DAY;
  const rows = state(req.env).activity.filter((e) => (!source || e.source === source) && ms(e.at) >= from);
  const series = Array.from({ length: days }, (_, i) => {
    const day = from + i * DAY;
    const inDay = rows.filter((e) => utcDay(ms(e.at)) === day);
    return { date: dayKey(day), count: inDay.length, errors: inDay.filter((e) => e.level === "error").length };
  });
  return ok({
    total: rows.length,
    sessions: new Set(rows.map((e) => e.sessionId).filter(Boolean)).size,
    devices: new Set(rows.map((e) => e.distinctId).filter(Boolean)).size,
    levels: countKeys(rows.map((e) => e.level)),
    sources: countKeys(rows.map((e) => e.source)),
    categories: countKeys(rows.map((e) => e.category)),
    topTypes: countKeys(rows.map((e) => e.type), 8),
    topErrors: countKeys(rows.filter((e) => e.level === "error").map((e) => e.message ?? e.type), 6),
    series,
  }, "Activity summary fetched successfully");
}

/* ----------------------------------------------------------------- routes */

export const routes: MockRoute[] = [
  route("GET", "/api/payment-intents", listIntents),
  route("POST", "/api/payment-intents", createIntent),
  route("GET", "/api/payment-intents/:id", getIntent),
  route("PATCH", "/api/payment-intents/:id", updateIntent),
  route("DELETE", "/api/payment-intents/:id", deleteIntent),
  route("POST", "/api/payment-intents/:id/validate", validateIntent),

  route("GET", "/api/webhooks", (req) => ok(state(req.env).webhooks.map(publicWebhook), "Webhooks fetched successfully")),
  route("POST", "/api/webhooks", createWebhook),
  route("GET", "/api/webhooks/:id", (req) => {
    const w = findWebhook(req.env, req.params.id);
    return w ? ok(publicWebhook(w), "Webhook retrieved successfully") : notFound("Webhook not found");
  }),
  route("PATCH", "/api/webhooks/:id", updateWebhook),
  route("DELETE", "/api/webhooks/:id", deleteWebhook),
  route("POST", "/api/webhooks/:id/rotate-secret", rotateSecret),
  route("POST", "/api/webhooks/:id/ping", ping),
  route("GET", "/api/webhooks/:id/deliveries", listDeliveries),
  route("POST", "/api/webhooks/:id/deliveries/:deliveryId/redeliver", redeliver),

  route("GET", "/api/products", (req) => {
    const rows = state(req.env).products;
    return ok({ data: rows, total: rows.length }, "Products fetched successfully");
  }),
  route("POST", "/api/products", createProduct),
  route("PATCH", "/api/products/:id", updateProduct),
  route("DELETE", "/api/products/:id", deleteProduct),

  route("GET", "/api/customers", (req) => ok(page(mockCustomers(req.env), req.url, 20), "Customers fetched successfully")),
  route("POST", "/api/customers", createCustomer),
  route("GET", "/api/customers/:id", (req) => {
    const c = findCustomer(req.env, req.params.id);
    return c ? ok(withStats(req.env, c), "Customer fetched successfully") : notFound("Customer not found");
  }),
  route("PATCH", "/api/customers/:id", updateCustomer),
  route("DELETE", "/api/customers/:id", deleteCustomer),
  route("POST", "/api/customers/:id/wallets", addWallet),
  route("DELETE", "/api/customers/:id/wallets/:walletId", removeWallet),

  route("GET", "/api/cosmos/:metric", metric),

  route("GET", "/api/activity", listActivity),
  route("POST", "/api/activity", ingestActivity),
  route("GET", "/api/activity/summary", activitySummary),
];

