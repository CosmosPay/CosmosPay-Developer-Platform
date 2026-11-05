/* Mock answers for the platform admin's cross-organization views and for the organization's fiat
   rails (BlindPay).

   Admin (/api/admin/*, except users and public-key, which platform.ts serves): the community
   server's AdminService and the BlindPay plugin's admin service, as adminProxy forwards them. Every
   list is a page ({ data, total, take, skip }) whose rows carry their owning consumer, enriched the
   way adminProxy does it (consumer.displayName, accountName, organizations); the consumers list
   carries its own `_count` per resource. Only an owner or admin account may read it, as the real
   proxy decides (`--role user` or `support` answers 403).

   Fiat (/api/kyc, /api/onramp, /api/offramp): the KYC receivers with their wallets and bank
   accounts, the payins and payouts, and the quotes that open them, as blindpayProxy answers them
   (the upstream JSON inside the envelope). Per environment, shared by the organizations. */
import { Account, Asset, Networks, Operation, StrKey, TransactionBuilder } from "@stellar/stellar-sdk";
import type { CrossChainSwap, PaymentIntent, Swap } from "@/lib/cosmos";
import {
  badRequest,
  conflict,
  created,
  forbidden,
  notFound,
  ok,
  route,
  str,
  type MockEnv,
  type MockRequest,
  type MockRoute,
} from "@/lib/mock/http";
import { mockEnvStore, mockStore } from "@/lib/mock/store";
import {
  cuid,
  daysAgo,
  emailFor,
  evmAddress,
  evmTxHash,
  hex,
  hoursAgo,
  hoursFromNow,
  nowIso,
  qrImage,
  rng,
  solanaAddress,
  solanaSignature,
  stellarAccount,
  txHash,
  USDC_ISSUER,
  EURC_ISSUER,
  type Rng,
} from "@/lib/mock/fixtures";
import { MOCK_ORG_SEEDS } from "@/lib/mock/shared";
import { MOCK_USER } from "@/lib/mock/session";
import { realRecords } from "@/lib/mock/real-swaps";

/* ======================= Shared helpers ======================= */

type Network = "testnet" | "public";
type PayStatus = PaymentIntent["status"];
type SwapStatus = Swap["status"];
type CrossStatus = CrossChainSwap["status"];

const NETWORKS: Network[] = ["testnet", "public"];

/** A weighted pick: `[[value, weight], ...]`. */
function weighted<T>(r: Rng, items: readonly (readonly [T, number])[]): T {
  const total = items.reduce((n, [, w]) => n + w, 0);
  let x = r.next() * total;
  for (const [v, w] of items) {
    x -= w;
    if (x < 0) return v;
  }
  return items[items.length - 1][0];
}

function num(s: string | null | undefined): number {
  const v = Number(s);
  return Number.isFinite(v) ? v : 0;
}

function fixed(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}

/** BlindPay-style ids (`re_`, `pi_`, `po_`, `qu_`, `bw_`, `ba_` plus 12 characters). */
function bpId(prefix: string, label: string): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  return `${prefix}_${Array.from(Buffer.from(hex(`bp:${label}`, 12), "hex"), (b) => alphabet[b % alphabet.length]).join("")}`;
}

/** A Bitcoin bech32-looking address (the bech32 alphabet only). */
function btcAddress(label: string): string {
  const alphabet = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
  return `bc1q${Array.from(Buffer.from(hex(`btc:${label}`, 38), "hex"), (b) => alphabet[b % alphabet.length]).join("")}`;
}

/** An address in the format of a NEAR Intents network id. */
function addressOn(chain: string, label: string): string {
  if (chain === "stellar") return stellarAccount(label);
  if (chain === "solana") return solanaAddress(label);
  if (chain === "btc") return btcAddress(label);
  if (chain === "near") return `${hex(`near:${label}`, 8)}.near`;
  return evmAddress(label);
}

/** A transaction hash in the format of a NEAR Intents network id. */
function hashOn(chain: string, label: string): string {
  if (chain === "stellar" || chain === "btc" || chain === "near") return txHash(label);
  if (chain === "solana") return solanaSignature(label);
  return evmTxHash(label);
}

function explorerOn(chain: string, hash: string): string {
  const base: Record<string, string> = {
    stellar: "https://stellar.expert/explorer/public/tx/",
    solana: "https://solscan.io/tx/",
    eth: "https://etherscan.io/tx/",
    base: "https://basescan.org/tx/",
    arb: "https://arbiscan.io/tx/",
    monad: "https://monadscan.com/tx/",
    btc: "https://mempool.space/tx/",
    near: "https://nearblocks.io/txns/",
  };
  return `${base[chain] ?? "https://explorer.near-intents.org/transactions/"}${hash}`;
}

/** A page as the admin lists answer it: 50 by default, at most 200 (ADMIN_MAX_PAGE_SIZE). */
function adminPage<T>(rows: T[], url: URL): { data: T[]; total: number; take: number; skip: number } {
  const t = Math.trunc(Number(url.searchParams.get("take")));
  const take = Number.isFinite(t) && t > 0 ? Math.min(t, 200) : 50;
  const skip = Math.max(0, Math.trunc(Number(url.searchParams.get("skip"))) || 0);
  return { data: rows.slice(skip, skip + take), total: rows.length, take, skip };
}

/** A page as the BlindPay plugin answers its tenant lists. */
function fiatPage<T>(rows: T[], url: URL): { data: T[]; total: number; take: number; skip: number } {
  const t = Math.trunc(Number(url.searchParams.get("take")));
  const take = Number.isFinite(t) && t > 0 ? Math.min(t, 100) : 50;
  const skip = Math.max(0, Math.trunc(Number(url.searchParams.get("skip"))) || 0);
  return { data: rows.slice(skip, skip + take), total: rows.length, take, skip };
}

const newestFirst = <T extends { createdAt: string }>(a: T, b: T) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0);

/** Platform owner or admin, as adminProxy's canManageUsers decides. */
function adminGate(req: MockRequest): Response | null {
  return req.options.role === "owner" || req.options.role === "admin" ? null : forbidden("Platform admin access required.");
}

/** An unsigned Stellar payment the holder would sign (a real envelope; nothing can submit it). */
function unsignedPayment(env: MockEnv, source: string, destination: string, amount: string, label: string): string {
  try {
    const from = StrKey.isValidEd25519PublicKey(source) ? source : stellarAccount(`signer:${label}`);
    const account = new Account(from, String(BigInt(`0x${hex(`seq:${label}`, 6)}`)));
    return new TransactionBuilder(account, { fee: "100000", networkPassphrase: env === "prod" ? Networks.PUBLIC : Networks.TESTNET })
      .addOperation(Operation.payment({ destination, asset: new Asset("USDC", USDC_ISSUER[env]), amount }))
      .setTimeout(300)
      .build()
      .toXDR();
  } catch {
    return Buffer.from(`mock-unsigned-transaction:${label}`).toString("base64");
  }
}

/* ======================= Admin: consumers ======================= */

interface ConsumerSeed {
  id: string;
  apisixUsername: string;
  credentialId: string | null;
  accountName: string | null;
  accountEmail: string | null;
  organizations: { id: string; name: string }[];
  /** How busy it is (0: no payments or swaps, the "active" figure leaves it out). */
  weight: number;
  feeBps: number;
  createdAt: string;
  updatedAt: string;
}

interface AdminConsumerRef {
  apisixUsername: string;
  credentialId: string | null;
  displayName: string;
  accountName: string | null;
  organizations: { id: string; name: string }[];
}

const OTHER_CONSUMERS: { org: string[]; person: string | null; email?: string; weight: number; feeBps: number; days: number }[] = [
  { org: ["Mercado Norte"], person: "Lucía Fernández", weight: 9, feeBps: 13, days: 300 },
  { org: ["Quebrada Pay", "Quebrada Tours"], person: "Mateo Gómez", weight: 7, feeBps: 26, days: 260 },
  { org: ["Lumio LLC"], person: "Valentina Ruiz", weight: 6, feeBps: 65, days: 210 },
  { org: ["Helios Co."], person: "Santiago López", weight: 5, feeBps: 7, days: 180 },
  { org: ["Northwind"], person: "Camila Díaz", weight: 4, feeBps: 26, days: 150 },
  { org: ["Cobalt Studio", "Cobalt Labs", "Cobalt Retail"], person: "Benjamín Torres", weight: 3, feeBps: 13, days: 120 },
  { org: ["Vertexa"], person: "Martina Romero", weight: 2, feeBps: 65, days: 75 },
  { org: ["Andes Coffee"], person: "Joaquín Herrera", weight: 0, feeBps: 65, days: 40 },
  // A legacy wallet account: no organization, so it reads as its account.
  { org: [], person: null, email: "wallet-legacy@cosmospay.lat", weight: 1, feeBps: 65, days: 330 },
];

function seedConsumers(): ConsumerSeed[] {
  const own = MOCK_ORG_SEEDS.filter((o) => o.role === "owner").map((o) => ({ id: o.id, name: o.name }));
  const sample: ConsumerSeed = {
    id: cuid("consumer:sample"),
    apisixUsername: `cosmos_${MOCK_USER.id}`,
    credentialId: `cred_${hex("cred:sample", 8)}`,
    accountName: MOCK_USER.name,
    accountEmail: MOCK_USER.email,
    organizations: own,
    weight: 8,
    feeBps: 13,
    createdAt: daysAgo(240),
    updatedAt: daysAgo(2),
  };
  const others = OTHER_CONSUMERS.map((c, i): ConsumerSeed => {
    const userId = `usr_${hex(`consumer-user:${i}`, 10)}`;
    return {
      id: cuid(`consumer:${i}`),
      apisixUsername: `cosmos_${userId}`,
      credentialId: c.weight ? `cred_${hex(`cred:${i}`, 8)}` : null,
      accountName: c.person,
      accountEmail: c.email ?? (c.person ? emailFor(c.org[0] ?? c.person, "dev") : null),
      organizations: c.org.map((name, j) => ({ id: cuid(`consumer-org:${i}:${j}`), name })),
      weight: c.weight,
      feeBps: c.feeBps,
      createdAt: daysAgo(c.days),
      updatedAt: daysAgo(Math.max(1, Math.floor(c.days / 10))),
    };
  });
  return [sample, ...others];
}

function displayNameOf(c: ConsumerSeed): string {
  return c.organizations[0]?.name || c.accountName || c.accountEmail || c.apisixUsername.replace(/^cosmos_/, "");
}

function consumerRef(c: ConsumerSeed): AdminConsumerRef {
  return {
    apisixUsername: c.apisixUsername,
    credentialId: c.credentialId,
    displayName: displayNameOf(c),
    accountName: c.accountName,
    organizations: c.organizations,
  };
}

/* ======================= Admin: the rows ======================= */

interface Owned {
  id: string;
  consumerId: string;
  createdAt: string;
}

interface AdminPaymentIntent extends Owned {
  kind: "TX" | "PAY";
  chain: "stellar" | "solana" | "monad";
  status: PayStatus;
  network: Network;
  source: string | null;
  destination: string;
  amount: string | null;
  asset: string;
  assetIssuer: string | null;
  memo: string;
  msg: string | null;
  callback: string | null;
  uri: string;
  txHash: string | null;
  reference: string | null;
  checkoutTheme: "classic" | "split" | "ticket" | "card";
  expiresAt: string | null;
  updatedAt: string;
}

interface AdminSwap extends Owned {
  status: SwapStatus;
  network: Network;
  source: string;
  destination: string;
  sendAsset: string;
  sendAssetIssuer: string | null;
  sendAmount: string;
  feeAmount: string;
  feeBps: number;
  swapAmount: string;
  destAsset: string;
  destAssetIssuer: string | null;
  destEstimated: string;
  destMin: string;
  slippageBps: number;
  path: { code: string; issuer: string | null }[];
  memo: string | null;
  commissionMemo: string | null;
  idempotencyKey: string | null;
  xdr: string;
  uri: string;
  txHash: string | null;
  qr: string;
  updatedAt: string;
}

interface AdminChainSwap extends Owned {
  chain: "solana" | "monad";
  network: "public";
  provider: "jupiter" | "kuru";
  status: SwapStatus;
  source: string;
  sendAsset: string;
  sendDecimals: number;
  sendAmount: string;
  destAsset: string;
  destDecimals: number;
  destEstimated: string;
  destMin: string;
  feeBps: number;
  feeAmount: string;
  slippageBps: number;
  path: { code: string; issuer: string | null }[];
  transaction: Record<string, unknown>;
  approval: Record<string, unknown> | null;
  txHash: string | null;
  idempotencyKey: string | null;
  expiresAt: string;
  updatedAt: string;
}

interface AdminCrossChainSwap extends Owned {
  status: CrossStatus;
  providerStatus: string;
  network: "public";
  originChain: string;
  originAsset: string;
  originAssetId: string;
  originContract: string | null;
  destinationChain: string;
  destinationAsset: string;
  destinationAssetId: string;
  destinationContract: string | null;
  amountIn: string;
  feeBps: number;
  feeAmount: string;
  amountOutEstimated: string;
  amountOutMin: string;
  slippageBps: number;
  recipient: string;
  refundTo: string;
  depositAddress: string;
  depositMemo: string | null;
  depositTxHash: string | null;
  amountOut: string | null;
  refundedAmount: string | null;
  originTxHashes: { hash: string; explorerUrl: string }[] | null;
  destinationTxHashes: { hash: string; explorerUrl: string }[] | null;
  timeEstimateSeconds: number;
  correlationId: string;
  idempotencyKey: string | null;
  expiresAt: string;
  updatedAt: string;
}

interface AdminCustomer extends Owned {
  name: string;
  alias: string | null;
  email: string | null;
  wallets: { id: string; chain: "stellar" | "solana" | "monad"; address: string; label: string | null; createdAt: string }[];
  updatedAt: string;
}

interface AdminProduct extends Owned {
  name: string;
  description: string | null;
  amount: string | null;
  asset: string;
  chain: "stellar" | "solana" | "monad";
  kind: "one_time" | "recurring" | "link";
  active: boolean;
  updatedAt: string;
}

interface Receiver {
  id: string;
  blindpayId: string | null;
  type: "individual" | "business";
  kycType: "light" | "standard" | "enhanced";
  kycStatus: string;
  email: string | null;
  name: string | null;
  country: string;
  externalId: string | null;
  disabled: boolean;
  dossierVersion: number;
  reviewedVersion: number | null;
  createdAt: string;
  updatedAt: string;
}

interface AdminReceiver extends Receiver {
  consumerId: string;
  environment: "development" | "production";
  reference: string | null;
  tosSentAt: string | null;
}

interface Payin {
  id: string;
  receiverId: string | null;
  blindpayId: string;
  quoteId: string;
  status: string;
  token: string;
  network: string;
  paymentMethod: string;
  currency: string;
  senderAmount: string;
  receiverAmount: string;
  instructions?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

interface AdminPayin extends Payin {
  consumerId: string;
  environment: "development" | "production";
}

interface Payout {
  id: string;
  blindpayId: string;
  status: string;
  token: string;
  network: string;
  rail: string;
  senderAmount: string;
  receiverAmount: string;
  senderWalletAddress: string;
  receiverId: string | null;
  quoteId: string;
  bankAccountId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AdminPayout extends Payout {
  consumerId: string;
  environment: "development" | "production";
}

interface AdminData {
  consumers: ConsumerSeed[];
  paymentIntents: AdminPaymentIntent[];
  swaps: AdminSwap[];
  chainSwaps: AdminChainSwap[];
  crossChainSwaps: AdminCrossChainSwap[];
  customers: AdminCustomer[];
  products: AdminProduct[];
  receivers: AdminReceiver[];
  payins: AdminPayin[];
  payouts: AdminPayout[];
  webhookEndpoints: Record<string, number>;
}

/** Row `i`'s status: the first rows go through every status once (each list shows them all), the
    rest follow the weights. */
function statusAt<T>(r: Rng, i: number, items: readonly (readonly [T, number])[]): T {
  return i < items.length ? items[i][0] : weighted(r, items);
}

/** Pick an owning consumer, the busy ones more often; `activeOnly` skips the idle one. */
function pickConsumer(r: Rng, consumers: ConsumerSeed[], activeOnly = true): ConsumerSeed {
  const pool = consumers.filter((c) => !activeOnly || c.weight > 0);
  return weighted(r, pool.map((c) => [c, Math.max(c.weight, 1)] as const));
}

const PAY_STATUSES: (readonly [PayStatus, number])[] = [
  ["SUCCEEDED", 46], ["PENDING", 14], ["SUBMITTED", 7], ["FAILED", 9], ["EXPIRED", 15], ["CANCELLED", 9],
];
const SWAP_STATUSES: (readonly [SwapStatus, number])[] = [
  ["SUCCEEDED", 52], ["PENDING", 14], ["SUBMITTED", 8], ["FAILED", 12], ["EXPIRED", 14],
];
const CROSS_STATUSES: (readonly [CrossStatus, number])[] = [
  ["SUCCEEDED", 30], ["AWAITING_DEPOSIT", 10], ["DEPOSIT_DETECTED", 6], ["INCOMPLETE_DEPOSIT", 4],
  ["PROCESSING", 8], ["REFUNDED", 6], ["FAILED", 5], ["EXPIRED", 8],
];
const PROVIDER_STATUS: Record<CrossStatus, string> = {
  AWAITING_DEPOSIT: "PENDING_DEPOSIT",
  DEPOSIT_DETECTED: "KNOWN_DEPOSIT_TX",
  INCOMPLETE_DEPOSIT: "INCOMPLETE_DEPOSIT",
  PROCESSING: "PROCESSING",
  SUCCEEDED: "SUCCESS",
  REFUNDED: "REFUNDED",
  FAILED: "FAILED",
  EXPIRED: "EXPIRED",
};

const SOLANA_USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const SOLANA_DEVNET_USDC = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
const SOLANA_USDT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
const SOLANA_JUP = "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN";
const MONAD_USDC = "0x754704bc059f8c67012fed69bc8a327a5aafb603";

function seedPaymentIntents(r: Rng, consumers: ConsumerSeed[]): AdminPaymentIntent[] {
  const rows: AdminPaymentIntent[] = [];
  for (const network of NETWORKS) {
    const env: MockEnv = network === "public" ? "prod" : "dev";
    const count = network === "public" ? 46 : 42;
    for (let i = 0; i < count; i++) {
      const key = `admin-pi:${network}:${i}`;
      const c = pickConsumer(r, consumers);
      const chain = weighted(r, [["stellar", 60], ["solana", 25], ["monad", 15]] as const);
      const status = statusAt(r, i, PAY_STATUSES);
      const hours = i * (network === "public" ? 9.5 : 11) + r.next() * 6;
      const createdAt = hoursAgo(hours);
      const kind: "TX" | "PAY" = chain === "stellar" && r.chance(0.2) ? "TX" : "PAY";
      let asset = "USDC";
      let assetIssuer: string | null;
      let destination: string;
      let amount: string | null = r.amount(5, 2400);
      let uri: string;
      if (chain === "stellar") {
        asset = weighted(r, [["USDC", 70], ["native", 18], ["EURC", 12]] as const);
        assetIssuer = asset === "USDC" ? USDC_ISSUER[env] : asset === "EURC" ? EURC_ISSUER[env] : null;
        if (asset === "native") amount = r.amount(20, 9000);
        destination = stellarAccount(`admin-dest:${c.id}:stellar`);
        if (r.chance(0.08)) amount = null;
        uri = `web+stellar:pay?destination=${destination}${amount ? `&amount=${amount}` : ""}${asset !== "native" ? `&asset_code=${asset}&asset_issuer=${assetIssuer}` : ""}&memo=${i + 1000}&memo_type=MEMO_ID`;
      } else if (chain === "solana") {
        asset = r.chance(0.8) ? "USDC" : "native";
        assetIssuer = asset === "USDC" ? (network === "public" ? SOLANA_USDC : SOLANA_DEVNET_USDC) : null;
        if (asset === "native") amount = r.amount(0.1, 40, 4);
        destination = solanaAddress(`admin-dest:${c.id}:solana`);
        uri = `solana:${destination}?amount=${amount}${assetIssuer ? `&spl-token=${assetIssuer}` : ""}&reference=${solanaAddress(`${key}:ref`)}`;
      } else {
        asset = network === "public" && r.chance(0.7) ? "USDC" : "native";
        assetIssuer = asset === "USDC" ? MONAD_USDC : null;
        if (asset === "native") amount = r.amount(1, 600, 4);
        destination = evmAddress(`admin-deposit:${key}`);
        uri = `ethereum:${destination}@${network === "public" ? 143 : 10143}?value=${amount}`;
      }
      const paid = status === "SUCCEEDED" || status === "SUBMITTED" || (status === "FAILED" && r.chance(0.6));
      const payer = chain === "stellar" ? stellarAccount(`${key}:payer`) : chain === "solana" ? solanaAddress(`${key}:payer`) : evmAddress(`${key}:payer`);
      const hash = chain === "stellar" ? txHash(key) : chain === "solana" ? solanaSignature(key) : evmTxHash(key);
      rows.push({
        id: cuid(key),
        consumerId: c.id,
        kind,
        chain,
        status,
        network,
        source: paid || kind === "TX" ? payer : null,
        destination,
        amount,
        asset,
        assetIssuer,
        memo: String(i + 1000),
        msg: r.chance(0.4) ? r.pick(["Order 1042", "Monthly plan", "Invoice A-77", "Event ticket", "Coffee beans 1kg"]) : null,
        callback: r.chance(0.3) ? "https://hooks.example.com/cosmos" : null,
        uri,
        txHash: paid ? hash : null,
        reference: r.chance(0.35) ? `ord_${hex(`${key}:refid`, 4)}` : null,
        checkoutTheme: r.pick(["classic", "classic", "split", "ticket", "card"] as const),
        expiresAt: r.chance(0.5) ? hoursAgo(hours - 24) : null,
        createdAt,
        updatedAt: hoursAgo(Math.max(0, hours - r.next() * 2)),
      });
    }
  }
  return rows;
}

const STELLAR_PAIRS: { send: string; dest: string; rate: number; min: number; max: number }[] = [
  { send: "native", dest: "USDC", rate: 0.112, min: 50, max: 25000 },
  { send: "USDC", dest: "native", rate: 8.9, min: 10, max: 4000 },
  { send: "USDC", dest: "EURC", rate: 0.92, min: 10, max: 5000 },
  { send: "EURC", dest: "USDC", rate: 1.085, min: 10, max: 3000 },
  { send: "native", dest: "EURC", rate: 0.103, min: 50, max: 12000 },
];

function issuerOf(asset: string, env: MockEnv): string | null {
  return asset === "USDC" ? USDC_ISSUER[env] : asset === "EURC" ? EURC_ISSUER[env] : null;
}

function seedSwaps(r: Rng, consumers: ConsumerSeed[]): AdminSwap[] {
  const rows: AdminSwap[] = [];
  for (const network of NETWORKS) {
    const env: MockEnv = network === "public" ? "prod" : "dev";
    const count = network === "public" ? 34 : 28;
    for (let i = 0; i < count; i++) {
      const key = `admin-swap:${network}:${i}`;
      const c = pickConsumer(r, consumers);
      const pair = r.pick(STELLAR_PAIRS);
      const status = statusAt(r, i, SWAP_STATUSES);
      const send = num(r.amount(pair.min, pair.max));
      const fee = (send * c.feeBps) / 10_000;
      const swapAmount = send - fee;
      const est = swapAmount * pair.rate * (0.99 + r.next() * 0.02);
      const slippageBps = r.pick([50, 100, 100, 200]);
      const source = stellarAccount(`${key}:source`);
      const destination = r.chance(0.8) ? source : stellarAccount(`${key}:dest`);
      const hours = i * 13 + r.next() * 8;
      const xdr = Buffer.from(`mock-swap-envelope:${key}`).toString("base64");
      rows.push({
        id: cuid(key),
        consumerId: c.id,
        status,
        network,
        source,
        destination,
        sendAsset: pair.send,
        sendAssetIssuer: issuerOf(pair.send, env),
        sendAmount: fixed(send, 7),
        feeAmount: fixed(fee, 7),
        feeBps: c.feeBps,
        swapAmount: fixed(swapAmount, 7),
        destAsset: pair.dest,
        destAssetIssuer: issuerOf(pair.dest, env),
        destEstimated: fixed(est, 7),
        destMin: fixed(est * (1 - slippageBps / 10_000), 7),
        slippageBps,
        path: r.chance(0.3) ? [{ code: "XLM", issuer: null }] : [],
        memo: r.chance(0.2) ? String(r.int(1000, 99999)) : null,
        commissionMemo: fee > 0 ? "Cosmos Swap Commission" : null,
        idempotencyKey: `idem_${hex(`${key}:idem`, 8)}`,
        xdr,
        uri: `web+stellar:tx?xdr=${encodeURIComponent(xdr)}`,
        txHash: status === "SUCCEEDED" || status === "SUBMITTED" || status === "FAILED" ? txHash(key) : null,
        qr: qrImage(key),
        createdAt: hoursAgo(hours),
        updatedAt: hoursAgo(Math.max(0, hours - 0.2)),
      });
    }
  }
  return rows;
}

const CHAIN_PAIRS: Record<"solana" | "monad", { send: string; sendDecimals: number; dest: string; destDecimals: number; rate: number; min: number; max: number }[]> = {
  solana: [
    { send: "native", sendDecimals: 9, dest: SOLANA_USDC, destDecimals: 6, rate: 168, min: 0.2, max: 60 },
    { send: SOLANA_USDC, sendDecimals: 6, dest: "native", destDecimals: 9, rate: 0.0059, min: 20, max: 8000 },
    { send: SOLANA_USDC, sendDecimals: 6, dest: SOLANA_USDT, destDecimals: 6, rate: 0.999, min: 20, max: 9000 },
    { send: SOLANA_JUP, sendDecimals: 6, dest: SOLANA_USDC, destDecimals: 6, rate: 0.82, min: 50, max: 20000 },
  ],
  monad: [
    { send: "native", sendDecimals: 18, dest: MONAD_USDC, destDecimals: 6, rate: 0.041, min: 100, max: 50000 },
    { send: MONAD_USDC, sendDecimals: 6, dest: "native", destDecimals: 18, rate: 24.3, min: 10, max: 5000 },
  ],
};

function seedChainSwaps(r: Rng, consumers: ConsumerSeed[]): AdminChainSwap[] {
  const rows: AdminChainSwap[] = [];
  for (const chain of ["solana", "monad"] as const) {
    const count = chain === "solana" ? 26 : 18;
    for (let i = 0; i < count; i++) {
      const key = `admin-chainswap:${chain}:${i}`;
      const c = pickConsumer(r, consumers);
      const pair = r.pick(CHAIN_PAIRS[chain]);
      const status = statusAt(r, i, SWAP_STATUSES);
      const send = num(r.amount(pair.min, pair.max, 4));
      const est = send * pair.rate * (0.99 + r.next() * 0.02);
      const fee = (est * c.feeBps) / 10_000;
      const slippageBps = r.pick([50, 100, 300]);
      const hours = i * 17 + r.next() * 10;
      const source = chain === "solana" ? solanaAddress(`${key}:source`) : evmAddress(`${key}:source`);
      const transaction: Record<string, unknown> =
        chain === "solana"
          ? { encoding: "base64", data: Buffer.from(`mock-solana-tx:${key}`).toString("base64") }
          : { to: evmAddress("kuru-router"), data: `0x${hex(`${key}:calldata`, 68)}`, value: pair.send === "native" ? String(Math.round(send * 1e6)) + "000000000000" : "0", chainId: 143 };
      rows.push({
        id: cuid(key),
        consumerId: c.id,
        chain,
        network: "public",
        provider: chain === "solana" ? "jupiter" : "kuru",
        status,
        source,
        sendAsset: pair.send,
        sendDecimals: pair.sendDecimals,
        sendAmount: fixed(send, 4),
        destAsset: pair.dest,
        destDecimals: pair.destDecimals,
        destEstimated: fixed(est - fee, 6),
        destMin: fixed((est - fee) * (1 - slippageBps / 10_000), 6),
        feeBps: c.feeBps,
        feeAmount: fixed(fee, 6),
        slippageBps,
        path: [],
        transaction,
        approval: chain === "monad" && pair.send !== "native" && r.chance(0.5) ? { to: MONAD_USDC, data: `0x095ea7b3${hex(`${key}:approve`, 64)}`, value: "0", chainId: 143 } : null,
        txHash: status === "SUCCEEDED" || status === "SUBMITTED" || status === "FAILED" ? (chain === "solana" ? solanaSignature(key) : evmTxHash(key)) : null,
        idempotencyKey: `idem_${hex(`${key}:idem`, 8)}`,
        expiresAt: hoursAgo(hours - 0.05),
        createdAt: hoursAgo(hours),
        updatedAt: hoursAgo(Math.max(0, hours - 0.03)),
      });
    }
  }
  return rows;
}

const CROSS_ROUTES: { from: string; fromAsset: string; to: string; toAsset: string; rate: number; min: number; max: number; usd: number }[] = [
  { from: "stellar", fromAsset: "USDC", to: "eth", toAsset: "USDC", rate: 0.998, min: 50, max: 8000, usd: 1 },
  { from: "solana", fromAsset: "SOL", to: "stellar", toAsset: "USDC", rate: 167.2, min: 0.5, max: 40, usd: 168 },
  { from: "btc", fromAsset: "BTC", to: "stellar", toAsset: "XLM", rate: 860000, min: 0.002, max: 0.4, usd: 96000 },
  { from: "base", fromAsset: "USDC", to: "solana", toAsset: "USDC", rate: 0.997, min: 20, max: 6000, usd: 1 },
  { from: "stellar", fromAsset: "XLM", to: "near", toAsset: "NEAR", rate: 0.031, min: 200, max: 40000, usd: 0.112 },
  { from: "eth", fromAsset: "ETH", to: "monad", toAsset: "MON", rate: 81000, min: 0.05, max: 4, usd: 3300 },
  { from: "arb", fromAsset: "USDT", to: "stellar", toAsset: "USDC", rate: 0.996, min: 20, max: 5000, usd: 1 },
  { from: "monad", fromAsset: "USDC", to: "base", toAsset: "USDC", rate: 0.997, min: 20, max: 4000, usd: 1 },
];

function seedCrossChainSwaps(r: Rng, consumers: ConsumerSeed[]): AdminCrossChainSwap[] {
  const rows: AdminCrossChainSwap[] = [];
  for (let i = 0; i < 32; i++) {
    const key = `admin-cross:${i}`;
    const c = pickConsumer(r, consumers);
    const rt = r.pick(CROSS_ROUTES);
    const status = statusAt(r, i, CROSS_STATUSES);
    const amountIn = num(r.amount(rt.min, rt.max, rt.usd > 1000 ? 6 : 2));
    const fee = (amountIn * c.feeBps) / 10_000;
    const est = (amountIn - fee) * rt.rate;
    const slippageBps = r.pick([100, 100, 200]);
    const hours = i * 15 + r.next() * 9;
    const deposited = !["AWAITING_DEPOSIT", "EXPIRED"].includes(status);
    const depositHash = hashOn(rt.from, `${key}:deposit`);
    const outHash = hashOn(rt.to, `${key}:out`);
    const refundHash = hashOn(rt.from, `${key}:refund`);
    const decimals = rt.toAsset === "XLM" ? 7 : rt.toAsset === "BTC" ? 8 : 6;
    rows.push({
      id: cuid(key),
      consumerId: c.id,
      status,
      providerStatus: PROVIDER_STATUS[status],
      network: "public",
      originChain: rt.from,
      originAsset: rt.fromAsset,
      originAssetId: `nep141:${rt.from}-${rt.fromAsset.toLowerCase()}.omft.near`,
      originContract: rt.fromAsset === "USDC" && rt.from === "stellar" ? USDC_ISSUER.prod : null,
      destinationChain: rt.to,
      destinationAsset: rt.toAsset,
      destinationAssetId: `nep141:${rt.to}-${rt.toAsset.toLowerCase()}.omft.near`,
      destinationContract: rt.toAsset === "USDC" && rt.to === "stellar" ? USDC_ISSUER.prod : null,
      amountIn: String(amountIn),
      feeBps: c.feeBps,
      feeAmount: fixed(fee, 6),
      amountOutEstimated: fixed(est, decimals),
      amountOutMin: fixed(est * (1 - slippageBps / 10_000), decimals),
      slippageBps,
      recipient: addressOn(rt.to, `${key}:recipient`),
      refundTo: addressOn(rt.from, `${key}:refund-to`),
      depositAddress: addressOn(rt.from, `${key}:deposit-address`),
      depositMemo: rt.from === "stellar" ? String(r.int(100000, 999999)) : null,
      depositTxHash: deposited ? depositHash : null,
      amountOut: status === "SUCCEEDED" ? fixed(est * (0.995 + r.next() * 0.008), decimals) : null,
      refundedAmount: status === "REFUNDED" ? fixed(amountIn * 0.998, 6) : null,
      originTxHashes: deposited ? [{ hash: depositHash, explorerUrl: explorerOn(rt.from, depositHash) }] : null,
      destinationTxHashes:
        status === "SUCCEEDED"
          ? [{ hash: outHash, explorerUrl: explorerOn(rt.to, outHash) }]
          : status === "REFUNDED"
            ? [{ hash: refundHash, explorerUrl: explorerOn(rt.from, refundHash) }]
            : null,
      timeEstimateSeconds: rt.from === "btc" ? 1800 : r.pick([45, 60, 120, 240]),
      correlationId: hex(`${key}:corr`, 16),
      idempotencyKey: `idem_${hex(`${key}:idem`, 8)}`,
      expiresAt: hoursAgo(hours - 24),
      createdAt: hoursAgo(hours),
      updatedAt: hoursAgo(Math.max(0, hours - 0.4)),
    });
  }
  return rows;
}

const CUSTOMER_NAMES = [
  "Acme Inc.", "Quanta", "Riverstone", "Novex", "Cafayate Wines", "Puna Labs", "Pampa Foods", "Patagonia Gear",
  "Salta Textiles", "Iguazu Travel", "Lucía Fernández", "Mateo Gómez", "Sofía Castro", "Tomás Medina",
  "Bodega Norte", "Altiplano Crafts", "Café Güemes", "Tienda Lerma", "Valle Calchaquí", "Libros del Cerro",
];

function seedCustomers(r: Rng, consumers: ConsumerSeed[]): AdminCustomer[] {
  const rows: AdminCustomer[] = [];
  for (let i = 0; i < 44; i++) {
    const key = `admin-customer:${i}`;
    const c = pickConsumer(r, consumers);
    const name = CUSTOMER_NAMES[i % CUSTOMER_NAMES.length];
    const createdAt = daysAgo(i * 4.5 + r.next() * 3);
    const wallets: AdminCustomer["wallets"] = [];
    const n = weighted(r, [[0, 2], [1, 6], [2, 3], [3, 1]] as const);
    for (let w = 0; w < n; w++) {
      const chain = w === 0 ? "stellar" : r.pick(["stellar", "solana", "monad"] as const);
      const address = chain === "stellar" ? stellarAccount(`${key}:w${w}`) : chain === "solana" ? solanaAddress(`${key}:w${w}`) : evmAddress(`${key}:w${w}`);
      wallets.push({ id: cuid(`${key}:wallet:${w}`), chain, address, label: w === 0 ? "Main" : r.chance(0.5) ? "Ops" : null, createdAt });
    }
    rows.push({
      id: cuid(key),
      consumerId: c.id,
      name,
      alias: r.chance(0.2) ? name.split(" ")[0].toLowerCase() : null,
      email: r.chance(0.75) ? emailFor(name, r.pick(["billing", "ap", "hello", "finance"])) : null,
      wallets,
      createdAt,
      updatedAt: createdAt,
    });
  }
  return rows;
}

const PRODUCT_NAMES: { name: string; kind: AdminProduct["kind"]; amount: [number, number] | null }[] = [
  { name: "Pro plan (monthly)", kind: "recurring", amount: [29, 99] },
  { name: "Pro plan (yearly)", kind: "recurring", amount: [290, 990] },
  { name: "Starter kit", kind: "one_time", amount: [15, 80] },
  { name: "Onboarding session", kind: "one_time", amount: [120, 400] },
  { name: "Donation link", kind: "link", amount: null },
  { name: "Coffee subscription", kind: "recurring", amount: [12, 30] },
  { name: "Event ticket", kind: "one_time", amount: [20, 150] },
  { name: "Tip jar", kind: "link", amount: null },
  { name: "Wine box (6 bottles)", kind: "one_time", amount: [60, 180] },
  { name: "Consulting hour", kind: "one_time", amount: [80, 250] },
];

function seedProducts(r: Rng, consumers: ConsumerSeed[]): AdminProduct[] {
  const rows: AdminProduct[] = [];
  for (let i = 0; i < 32; i++) {
    const key = `admin-product:${i}`;
    const c = pickConsumer(r, consumers);
    const spec = PRODUCT_NAMES[i % PRODUCT_NAMES.length];
    const chain = weighted(r, [["stellar", 75], ["solana", 15], ["monad", 10]] as const);
    const createdAt = daysAgo(i * 6 + r.next() * 4);
    rows.push({
      id: cuid(key),
      consumerId: c.id,
      name: spec.name,
      description: r.chance(0.5) ? `${spec.name} sold through the hosted checkout.` : null,
      amount: spec.amount ? fixed(spec.amount[0] + r.next() * (spec.amount[1] - spec.amount[0])) : null,
      asset: chain === "stellar" && r.chance(0.15) ? "native" : "USDC",
      chain,
      kind: spec.kind,
      active: r.chance(0.85),
      createdAt,
      updatedAt: createdAt,
    });
  }
  return rows;
}

/* ======================= Fiat rows (shared by admin and the organization's view) ======================= */

const KYC_STATUSES: (readonly [string, number])[] = [
  ["approved", 30], ["verifying", 12], ["pending_review", 16], ["pending_user", 14], ["inactive", 12], ["rejected", 8],
];
const PAYIN_STATUSES: (readonly [string, number])[] = [
  ["completed", 40], ["pending", 14], ["processing", 12], ["funds_received", 8], ["on_hold", 5], ["refunded", 6], ["failed", 8], ["expired", 7],
];
const PAYOUT_STATUSES: (readonly [string, number])[] = [
  ["completed", 44], ["processing", 16], ["pending", 10], ["on_hold", 6], ["refunded", 6], ["failed", 10], ["reversed", 4],
];
const FIAT_COUNTRIES: { country: string; currency: string; payin: string; rail: string; rate: number }[] = [
  { country: "BR", currency: "BRL", payin: "pix", rail: "pix", rate: 5.6 },
  { country: "MX", currency: "MXN", payin: "spei", rail: "spei_bitso", rate: 18.4 },
  { country: "CO", currency: "COP", payin: "pse", rail: "ach_cop_bitso", rate: 4050 },
  { country: "AR", currency: "ARS", payin: "transfers", rail: "transfers_bitso", rate: 1180 },
  { country: "US", currency: "USD", payin: "ach", rail: "ach", rate: 1 },
  { country: "US", currency: "USD", payin: "wire", rail: "wire", rate: 1 },
];
const BUSINESS_NAMES = ["Mercado Norte SRL", "Andes Export SA", "Quebrada Tours SAS", "Lumio LLC", "Helios Co.", "Pampa Foods SA"];

function seedReceiver(r: Rng, key: string, i: number): Receiver {
  const business = r.chance(0.3);
  const name = business ? BUSINESS_NAMES[i % BUSINESS_NAMES.length] : (["Lucía Fernández", "Mateo Gómez", "Valentina Ruiz", "Santiago López", "Camila Díaz", "Benjamín Torres", "Martina Romero", "Joaquín Herrera", "Sofía Castro", "Tomás Medina"] as const)[i % 10];
  const status = statusAt(r, i, KYC_STATUSES);
  const atProvider = status === "verifying" || status === "approved" || status === "rejected";
  const dossierVersion = status === "inactive" ? 0 : r.int(1, 3);
  const createdAt = daysAgo(i * 3.2 + r.next() * 2);
  const fc = r.pick(FIAT_COUNTRIES);
  return {
    id: cuid(key),
    blindpayId: atProvider ? bpId("re", key) : null,
    type: business ? "business" : "individual",
    kycType: business ? "standard" : r.pick(["light", "standard", "standard", "enhanced"] as const),
    kycStatus: status,
    email: r.chance(0.92) ? emailFor(name, business ? "finance" : name.split(" ")[0].toLowerCase()) : null,
    name: r.chance(0.95) ? name : null,
    country: fc.country,
    externalId: r.chance(0.3) ? `cust_${hex(`${key}:ext`, 4)}` : null,
    disabled: status === "approved" && r.chance(0.12),
    dossierVersion,
    reviewedVersion: atProvider || status === "pending_user" ? dossierVersion : null,
    createdAt,
    updatedAt: daysAgo(Math.max(0, i * 3.2 - 1)),
  };
}

function payinInstructions(method: string, key: string): Record<string, unknown> {
  if (method === "pix") return { pix_code: `00020126580014br.gov.bcb.pix0136${hex(`${key}:pix`, 16)}5204000053039865802BR6009SAO PAULO6304ABCD` };
  if (method === "spei") return { clabe: `6461801570${String(BigInt(`0x${hex(`${key}:clabe`, 4)}`)).padStart(8, "0").slice(0, 8)}`, beneficiary: "BlindPay Mexico" };
  if (method === "transfers") return { cbu: `00000031000${String(BigInt(`0x${hex(`${key}:cbu`, 5)}`)).padStart(11, "0").slice(0, 11)}`, alias: "blindpay.cosmos.ar" };
  if (method === "pse") return { pse_url: "https://checkout.example-pse.co/session/mock" };
  return { blindpay_bank_details: { bank_name: "Lead Bank", account_number: "••••4821", routing_number: "101019644", reference: hex(`${key}:ref`, 4).toUpperCase() } };
}

function seedPayin(r: Rng, key: string, i: number, hours: number, receiverId: string | null): Payin {
  const fc = r.pick(FIAT_COUNTRIES);
  const usd = num(r.amount(25, 4800));
  const token = weighted(r, [["USDC", 70], ["USDT", 22], ["USDB", 8]] as const);
  const createdAt = hoursAgo(hours);
  return {
    id: cuid(key),
    receiverId,
    blindpayId: bpId("pi", key),
    quoteId: bpId("qu", `${key}:quote`),
    status: statusAt(r, i, PAYIN_STATUSES),
    token,
    network: r.pick(["stellar", "stellar", "base", "polygon", "solana", "arbitrum"]),
    paymentMethod: fc.payin,
    currency: fc.currency,
    senderAmount: fixed(usd * fc.rate * 1.012),
    receiverAmount: fixed(usd),
    instructions: payinInstructions(fc.payin, key),
    createdAt,
    updatedAt: hoursAgo(Math.max(0, hours - 1)),
  };
}

function seedPayout(r: Rng, key: string, i: number, hours: number, receiverId: string | null): Payout {
  const fc = r.pick(FIAT_COUNTRIES);
  const usd = num(r.amount(40, 6000));
  const network = r.pick(["stellar", "stellar", "base", "polygon", "solana", "ethereum"]);
  const createdAt = hoursAgo(hours);
  return {
    id: cuid(key),
    blindpayId: bpId("po", key),
    status: statusAt(r, i, PAYOUT_STATUSES),
    token: weighted(r, [["USDC", 75], ["USDT", 20], ["USDB", 5]] as const),
    network,
    rail: fc.rail,
    senderAmount: fixed(usd),
    receiverAmount: fixed(usd * fc.rate * 0.988),
    senderWalletAddress: network === "stellar" ? stellarAccount(`${key}:sender`) : network === "solana" ? solanaAddress(`${key}:sender`) : evmAddress(`${key}:sender`),
    receiverId,
    quoteId: bpId("qu", `${key}:quote`),
    bankAccountId: r.chance(0.9) ? cuid(`${key}:bank`) : null,
    createdAt,
    updatedAt: hoursAgo(Math.max(0, hours - 2)),
  };
}

function seedAdmin(): AdminData {
  const r = rng("admin");
  const consumers = seedConsumers();
  const receivers: AdminReceiver[] = [];
  for (let i = 0; i < 28; i++) {
    const c = pickConsumer(r, consumers);
    const environment = r.chance(0.6) ? "production" : "development";
    const rec = seedReceiver(r, `admin-receiver:${i}`, i);
    receivers.push({ ...rec, consumerId: c.id, environment, reference: r.chance(0.4) ? `kyc_${hex(`admin-receiver:${i}:ref`, 4)}` : null, tosSentAt: rec.kycStatus === "pending_user" ? hoursAgo(r.int(2, 90)) : null });
  }
  const payable = receivers.filter((x) => x.kycStatus === "approved");
  const payins: AdminPayin[] = [];
  for (let i = 0; i < 30; i++) {
    const rec = r.pick(payable.length ? payable : receivers);
    payins.push({ ...seedPayin(r, `admin-payin:${i}`, i, i * 11 + r.next() * 6, rec.id), consumerId: rec.consumerId, environment: rec.environment });
  }
  const payouts: AdminPayout[] = [];
  for (let i = 0; i < 26; i++) {
    const rec = r.pick(payable.length ? payable : receivers);
    payouts.push({ ...seedPayout(r, `admin-payout:${i}`, i, i * 13 + r.next() * 7, rec.id), consumerId: rec.consumerId, environment: rec.environment });
  }
  const webhookEndpoints: Record<string, number> = {};
  for (const c of consumers) webhookEndpoints[c.id] = c.weight ? r.int(1, 4) : 0;
  return {
    consumers,
    paymentIntents: seedPaymentIntents(r, consumers),
    swaps: seedSwaps(r, consumers),
    chainSwaps: seedChainSwaps(r, consumers),
    crossChainSwaps: seedCrossChainSwaps(r, consumers),
    customers: seedCustomers(r, consumers),
    products: seedProducts(r, consumers),
    receivers,
    payins,
    payouts,
    webhookEndpoints,
  };
}

/* Swaps are never sample data (src/lib/mock/real-swaps.ts): the admin's swap lists are the real
   swaps opened here, under the shared public consumer. */
const PUBLIC_CONSUMER_ID = "cosmos_public";
const owned = (rec: any) => ({ ...rec, consumerId: PUBLIC_CONSUMER_ID });
const realAdminSwaps = (): AdminSwap[] => realRecords("swaps").filter((s) => !s.chain || s.chain === "stellar").map(owned);
const realAdminChainSwaps = (): AdminChainSwap[] => realRecords("swaps").filter((s) => s.chain === "solana" || s.chain === "monad").map(owned);
const realAdminCrossChainSwaps = (): AdminCrossChainSwap[] => realRecords("cross").map(owned);

function adminData(): AdminData {
  return mockStore("admin", seedAdmin);
}

/** A row with its owning consumer attached, as adminProxy enriches it. */
function attributed<T extends { consumerId: string }>(data: AdminData, row: T): T & { consumer: AdminConsumerRef | null } {
  const c = data.consumers.find((x) => x.id === row.consumerId);
  return { ...row, consumer: c ? consumerRef(c) : null };
}

/** Filter a list by the admin query (consumer, network, chain, status), newest first, paged. */
function adminList<T extends Owned & { status?: string | null; network?: string; chain?: string }>(
  req: MockRequest,
  rows: T[],
  keys: ("network" | "chain" | "status")[],
): Response {
  const gate = adminGate(req);
  if (gate) return gate;
  const data = adminData();
  const q = req.url.searchParams;
  const consumer = q.get("consumer");
  const filtered = rows
    .filter((x) => !consumer || x.consumerId === consumer)
    .filter((x) => keys.every((k) => !q.get(k) || String(x[k] ?? "") === q.get(k)))
    .sort(newestFirst)
    .map((x) => attributed(data, x));
  return ok(adminPage(filtered, req.url), "OK");
}

function tally(values: (string | null | undefined)[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of values) {
    const k = typeof v === "string" ? v : "unknown";
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

const totalOf = (counts: Record<string, number>) => Object.values(counts).reduce((a, b) => a + b, 0);

function adminSummary(req: MockRequest): Response {
  const gate = adminGate(req);
  if (gate) return gate;
  const data = adminData();
  const network = req.url.searchParams.get("network") || null;
  const onNet = <T extends { network: string }>(rows: T[]) => (network ? rows.filter((x) => x.network === network) : rows);
  const intents = onNet(data.paymentIntents);
  const paymentIntents = tally(intents.map((x) => x.status));
  const swaps = tally(onNet(realAdminSwaps()).map((x) => x.status));
  const chainSwaps = tally(onNet(realAdminChainSwaps()).map((x) => x.status));
  const crossChainSwaps = tally(onNet(realAdminCrossChainSwaps()).map((x) => x.status));
  const receivers = tally(data.receivers.map((x) => x.kycStatus));
  const payins = tally(data.payins.map((x) => x.status));
  const payouts = tally(data.payouts.map((x) => x.status));

  // Settled volume per asset: an asset code is only unique per chain, so another chain prefixes it.
  const vol = new Map<string, { amount: number; count: number }>();
  for (const i of intents.filter((x) => x.status === "SUCCEEDED")) {
    const code = !i.asset || i.asset === "native" ? "XLM" : i.asset;
    const k = i.chain === "stellar" ? code : `${i.chain}:${i.asset}`;
    const cur = vol.get(k) ?? { amount: 0, count: 0 };
    cur.amount += num(i.amount);
    cur.count += 1;
    vol.set(k, cur);
  }
  const volume = [...vol.entries()].map(([asset, v]) => ({ asset, amount: Number(v.amount.toFixed(7)).toString(), count: v.count }));

  return ok(
    {
      network: network ?? "all",
      consumers: data.consumers.length,
      customers: data.customers.length,
      products: data.products.length,
      webhookEndpoints: Object.values(data.webhookEndpoints).reduce((a, b) => a + b, 0),
      paymentIntents: { total: totalOf(paymentIntents), byStatus: paymentIntents },
      swaps: { total: totalOf(swaps), byStatus: swaps },
      chainSwaps: { total: totalOf(chainSwaps), byStatus: chainSwaps },
      crossChainSwaps: { total: totalOf(crossChainSwaps), byStatus: crossChainSwaps },
      fiat: {
        receivers: { total: totalOf(receivers), byStatus: receivers },
        payins: { total: totalOf(payins), byStatus: payins },
        payouts: { total: totalOf(payouts), byStatus: payouts },
      },
      volume,
    },
    "OK",
  );
}

function adminConsumers(req: MockRequest): Response {
  const gate = adminGate(req);
  if (gate) return gate;
  const data = adminData();
  const count = <T extends { consumerId: string }>(rows: T[], id: string) => rows.filter((x) => x.consumerId === id).length;
  const rows = [...data.consumers].sort(newestFirst).map((c) => ({
    id: c.id,
    apisixUsername: c.apisixUsername,
    credentialId: c.credentialId,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    displayName: displayNameOf(c),
    accountName: c.accountName,
    accountEmail: c.accountEmail,
    organizations: c.organizations,
    _count: {
      paymentIntents: count(data.paymentIntents, c.id),
      swaps: count(data.swaps, c.id),
      chainSwaps: count(data.chainSwaps, c.id),
      crossChainSwaps: count(data.crossChainSwaps, c.id),
      products: count(data.products, c.id),
      customers: count(data.customers, c.id),
      webhookEndpoints: data.webhookEndpoints[c.id] ?? 0,
      blindpayReceivers: count(data.receivers, c.id),
      payins: count(data.payins, c.id),
      payouts: count(data.payouts, c.id),
    },
  }));
  return ok(adminPage(rows, req.url), "OK");
}

/* ---- Admin receiver review (global) ---- */

function findAdminReceiver(id: string): AdminReceiver | undefined {
  return adminData().receivers.find((x) => x.id === id);
}

function approveReceiver<T extends Receiver>(rec: T, body: Record<string, unknown> | null): Response | T {
  const expected = body?.expected_version;
  if (rec.kycStatus !== "pending_review") return conflict(`Cannot move receiver from '${rec.kycStatus}' to 'pending_user'`);
  if (typeof expected === "number" && expected !== rec.dossierVersion) {
    return conflict("The receiver's KYC data changed since it was opened. Review it again before approving.");
  }
  rec.kycStatus = "pending_user";
  rec.reviewedVersion = rec.dossierVersion;
  rec.updatedAt = nowIso();
  return rec;
}

function enableReceiver<T extends Receiver>(rec: T, body: Record<string, unknown> | null): Response | T {
  if (!str(body, "tos_id")) return badRequest("tos_id is required");
  if (rec.kycStatus !== "pending_user") return conflict(`Cannot move receiver from '${rec.kycStatus}' to 'verifying'`);
  rec.kycStatus = "verifying";
  rec.blindpayId = rec.blindpayId ?? bpId("re", `${rec.id}:enabled`);
  rec.updatedAt = nowIso();
  return rec;
}

function setAccess<T extends Receiver>(rec: T, body: Record<string, unknown> | null): Response | T {
  if (typeof body?.disabled !== "boolean") return badRequest("disabled must be a boolean");
  rec.disabled = body.disabled;
  rec.updatedAt = nowIso();
  return rec;
}

function tosResend(rec: Receiver, body: Record<string, unknown> | null, scope: "admin" | "org"): Response {
  const channel = str(body, "channel") ?? "email";
  if (!str(body, "redirect_url")) return badRequest("redirect_url is required");
  if (rec.kycStatus !== "pending_user") return conflict("The terms can only be sent to a receiver waiting for the customer.");
  const url = `https://app.blindpay.com/e/terms-of-service?idempotency_key=${hex(`${rec.id}:tos`, 8)}`;
  if (channel === "code") return ok({ channel: "code", url, email: rec.email }, "OK");
  if (!rec.email) return badRequest("This receiver has no email on file to send the terms to.");
  return ok({ channel: "email", emailed: true, email: rec.email }, scope === "admin" ? "Verification email sent." : "Terms of service sent by email.");
}

/* ======================= Fiat: the organization's view (per environment) ======================= */

interface FiatWallet {
  id: string;
  blindpayId: string;
  name: string;
  network: string;
  address: string;
  is_account_abstraction: boolean;
  createdAt: string;
}

interface FiatBank {
  id: string;
  blindpayId: string;
  name: string;
  rail: string;
  type: string;
  beneficiary_name: string | null;
  country: string | null;
  account_number: string | null;
  routing_number: string | null;
  createdAt: string;
}

interface FiatQuote {
  id: string;
  kind: "onramp" | "offramp";
  sender_amount: number;
  receiver_amount: number;
  receiver_local_amount?: number;
  currency: string;
  token: string;
  network: string;
  payment_method?: string;
  rail?: string;
  bank_account_id?: string;
  commercial_quotation: number;
  blindpay_quotation: number;
  flat_fee: number;
  partner_fee_amount: number;
  expires_at: number;
}

interface FiatData {
  receivers: Receiver[];
  wallets: Record<string, FiatWallet[]>;
  banks: Record<string, FiatBank[]>;
  payins: Payin[];
  payouts: Payout[];
  quotes: FiatQuote[];
}

function seedFiat(env: MockEnv): FiatData {
  const r = rng(`fiat:${env}`);
  // Every stage of the KYC lifecycle once, then a few more.
  const order = ["approved", "pending_review", "pending_user", "verifying", "inactive", "approved", "rejected", "pending_review", "approved"];
  const receivers = order.map((status, i) => {
    const rec = seedReceiver(r, `fiat:${env}:receiver:${i}`, i);
    const atProvider = status === "verifying" || status === "approved" || status === "rejected";
    return {
      ...rec,
      kycStatus: status,
      blindpayId: atProvider ? bpId("re", `fiat:${env}:receiver:${i}`) : null,
      dossierVersion: status === "inactive" ? 0 : Math.max(1, rec.dossierVersion),
      reviewedVersion: atProvider || status === "pending_user" ? Math.max(1, rec.dossierVersion) : null,
      disabled: i === 5,
    };
  });
  const wallets: Record<string, FiatWallet[]> = {};
  const banks: Record<string, FiatBank[]> = {};
  for (const rec of receivers) {
    if (!rec.blindpayId) continue;
    const net = env === "prod" ? "stellar" : "stellar_testnet";
    wallets[rec.id] = [
      { id: cuid(`${rec.id}:wallet:0`), blindpayId: bpId("bw", `${rec.id}:0`), name: "Primary wallet", network: net, address: stellarAccount(`${rec.id}:wallet:0`), is_account_abstraction: true, createdAt: rec.updatedAt },
      ...(r.chance(0.5) ? [{ id: cuid(`${rec.id}:wallet:1`), blindpayId: bpId("bw", `${rec.id}:1`), name: "Base treasury", network: "base", address: evmAddress(`${rec.id}:wallet:1`), is_account_abstraction: false, createdAt: rec.updatedAt }] : []),
    ];
    const fc = FIAT_COUNTRIES.find((f) => f.country === rec.country) ?? FIAT_COUNTRIES[4];
    banks[rec.id] = [
      { id: cuid(`${rec.id}:bank:0`), blindpayId: bpId("ba", `${rec.id}:0`), name: `${rec.name ?? "Receiver"} ${fc.currency}`, rail: fc.rail, type: fc.rail, beneficiary_name: rec.name, country: rec.country, account_number: `••••${String(r.int(1000, 9999))}`, routing_number: fc.country === "US" ? "021000021" : null, createdAt: rec.updatedAt },
    ];
  }
  const payable = receivers.filter((x) => x.kycStatus === "approved");
  const payins = Array.from({ length: 14 }, (_, i) => seedPayin(r, `fiat:${env}:payin:${i}`, i, i * 15 + r.next() * 8, r.pick(payable).id));
  const payouts = Array.from({ length: 12 }, (_, i) => seedPayout(r, `fiat:${env}:payout:${i}`, i, i * 18 + r.next() * 9, r.pick(payable).id));
  return { receivers, wallets, banks, payins, payouts, quotes: [] };
}

function fiat(env: MockEnv): FiatData {
  return mockEnvStore("fiat", env, seedFiat);
}

/** The sample account's role in the organization the call names (null: not a member). */
function orgRole(req: MockRequest): "owner" | "admin" | "member" | null {
  if (!req.org) return "owner";
  const org = MOCK_ORG_SEEDS.find((o) => o.id === req.org);
  return org ? org.role : null;
}

/** blindpayProxy: a member of the organization reads; a mutation needs payments:create. */
function fiatGate(req: MockRequest): Response | null {
  const role = orgRole(req);
  if (!role) return forbidden("You are not a member of this organization.");
  return null;
}

/** The kill switch, the approval and the terms email: an owner or admin of the organization. */
function managerGate(req: MockRequest, action: string): Response | null {
  if (!req.org) return badRequest("An organization is required");
  const role = orgRole(req);
  if (!role) return forbidden("You are not a member of this organization.");
  if (role === "member") return forbidden(`Only an owner or admin can ${action}.`);
  return null;
}

function findReceiver(req: MockRequest): Receiver | undefined {
  return fiat(req.env).receivers.find((x) => x.id === req.params.id);
}

const RECEIVER_FIELDS = ["type", "kyc_type", "email", "country"];

/* ======================= Routes ======================= */

export const routes: MockRoute[] = [
  /* ---- Platform admin (global) ---- */
  route("GET", "/api/admin/summary", adminSummary),
  route("GET", "/api/admin/consumers", adminConsumers),
  route("GET", "/api/admin/payment-intents", (req) => adminList(req, adminData().paymentIntents, ["network", "status"])),
  route("GET", "/api/admin/swaps", (req) => adminList(req, realAdminSwaps(), ["network", "status"])),
  route("GET", "/api/admin/chain-swaps", (req) => adminList(req, realAdminChainSwaps(), ["chain", "status"])),
  route("GET", "/api/admin/cross-chain-swaps", (req) => adminList(req, realAdminCrossChainSwaps(), ["status"])),
  route("GET", "/api/admin/customers", (req) => adminList(req, adminData().customers, [])),
  route("GET", "/api/admin/products", (req) => adminList(req, adminData().products, [])),
  route("GET", "/api/admin/receivers", (req) => {
    const gate = adminGate(req);
    if (gate) return gate;
    const data = adminData();
    const consumer = req.url.searchParams.get("consumer");
    const status = req.url.searchParams.get("status");
    const rows = data.receivers
      .filter((x) => (!consumer || x.consumerId === consumer) && (!status || x.kycStatus === status))
      .sort(newestFirst)
      .map((x) => attributed(data, x));
    return ok(adminPage(rows, req.url), "OK");
  }),
  route("GET", "/api/admin/payins", (req) => adminList(req, adminData().payins, ["status"])),
  route("GET", "/api/admin/payouts", (req) => adminList(req, adminData().payouts, ["status"])),
  route("PATCH", "/api/admin/receivers/:id/access", (req) => {
    const gate = adminGate(req);
    if (gate) return gate;
    const rec = findAdminReceiver(req.params.id);
    if (!rec) return notFound("Receiver not found");
    const out = setAccess(rec, req.body);
    return out instanceof Response ? out : ok(attributed(adminData(), out), "OK");
  }),
  route("POST", "/api/admin/receivers/:id/approve", (req) => {
    const gate = adminGate(req);
    if (gate) return gate;
    const rec = findAdminReceiver(req.params.id);
    if (!rec) return notFound("Receiver not found");
    if (!str(req.body, "redirect_url")) return badRequest("redirect_url is required");
    const out = approveReceiver(rec, req.body);
    if (out instanceof Response) return out;
    out.tosSentAt = nowIso();
    // No mail transport in mock mode: approved, nothing emailed (the real route says the same).
    return ok({ approved: true, emailed: false, email: out.email, receiver: attributed(adminData(), out) }, "Approved.");
  }),
  route("POST", "/api/admin/receivers/:id/enable", (req) => {
    const gate = adminGate(req);
    if (gate) return gate;
    const rec = findAdminReceiver(req.params.id);
    if (!rec) return notFound("Receiver not found");
    const out = enableReceiver(rec, req.body);
    return out instanceof Response ? out : ok(attributed(adminData(), out), "OK");
  }),
  route("POST", "/api/admin/receivers/:id/tos", (req) => {
    const gate = adminGate(req);
    if (gate) return gate;
    const rec = findAdminReceiver(req.params.id);
    if (!rec) return notFound("Receiver not found");
    const res = tosResend(rec, { ...(req.body ?? {}), channel: "email" }, "admin");
    if (res.ok) rec.tosSentAt = nowIso();
    return res;
  }),

  /* ---- Fiat: KYC receivers ---- */
  route("GET", "/api/kyc/receivers", (req) => {
    const gate = fiatGate(req);
    if (gate) return gate;
    return ok(fiatPage([...fiat(req.env).receivers].sort(newestFirst), req.url), "OK");
  }),
  route("POST", "/api/kyc/receivers", (req) => {
    const gate = fiatGate(req);
    if (gate) return gate;
    const type = str(req.body, "type");
    if (type !== "individual" && type !== "business") return badRequest("type must be individual or business");
    if (!str(req.body, "email")) return badRequest("email is required");
    const data = fiat(req.env);
    const b = req.body ?? {};
    const name = type === "business" ? str(b, "legal_name") : [str(b, "first_name"), str(b, "last_name")].filter(Boolean).join(" ");
    // Registered with its KYC data: it waits for the owner's review; without it, it is inactive.
    const hasKyc = Object.keys(b).some((k) => !RECEIVER_FIELDS.includes(k));
    const now = nowIso();
    const rec: Receiver = {
      id: cuid(`fiat:${req.env}:receiver:new:${now}:${data.receivers.length}`),
      blindpayId: null,
      type,
      kycType: (["light", "standard", "enhanced"] as const).find((k) => k === str(b, "kyc_type")) ?? "standard",
      kycStatus: hasKyc ? "pending_review" : "inactive",
      email: str(b, "email") ?? null,
      name: name || null,
      country: (str(b, "country") ?? "US").toUpperCase(),
      externalId: str(b, "external_id") ?? null,
      disabled: false,
      dossierVersion: hasKyc ? 1 : 0,
      reviewedVersion: null,
      createdAt: now,
      updatedAt: now,
    };
    data.receivers.unshift(rec);
    return created(rec, "Created");
  }),
  route("GET", "/api/kyc/receivers/:id", (req) => {
    const gate = fiatGate(req);
    if (gate) return gate;
    const rec = findReceiver(req);
    return rec ? ok(rec, "OK") : notFound("Receiver not found");
  }),
  route("PATCH", "/api/kyc/receivers/:id", (req) => {
    const gate = fiatGate(req);
    if (gate) return gate;
    const rec = findReceiver(req);
    if (!rec) return notFound("Receiver not found");
    if (str(req.body, "email")) rec.email = str(req.body, "email") ?? rec.email;
    if (str(req.body, "country")) rec.country = (str(req.body, "country") ?? rec.country).toUpperCase();
    // A KYC edit after the review sends it back to review, on a new version of the dossier.
    if (rec.kycStatus === "inactive" || rec.kycStatus === "pending_user") rec.kycStatus = "pending_review";
    rec.dossierVersion += 1;
    rec.updatedAt = nowIso();
    return ok(rec, "OK");
  }),
  route("DELETE", "/api/kyc/receivers/:id", (req) => {
    const gate = fiatGate(req);
    if (gate) return gate;
    const data = fiat(req.env);
    const i = data.receivers.findIndex((x) => x.id === req.params.id);
    if (i < 0) return notFound("Receiver not found");
    data.receivers.splice(i, 1);
    return ok({ id: req.params.id, deleted: true }, "OK");
  }),
  route("POST", "/api/kyc/receivers/:id/approve", (req) => {
    const gate = managerGate(req, "approve a fiat account");
    if (gate) return gate;
    const rec = findReceiver(req);
    if (!rec) return notFound("Receiver not found");
    if (!str(req.body, "redirect_url")) return badRequest("redirect_url is required");
    const out = approveReceiver(rec, req.body);
    if (out instanceof Response) return out;
    return ok({ approved: true, emailed: false, email: out.email, receiver: out }, "Approved.");
  }),
  route("POST", "/api/kyc/receivers/:id/tos", (req) => {
    const gate = managerGate(req, "send the terms of service");
    if (gate) return gate;
    const rec = findReceiver(req);
    return rec ? tosResend(rec, req.body, "org") : notFound("Receiver not found");
  }),
  route("POST", "/api/kyc/receivers/:id/enable", (req) => {
    const gate = fiatGate(req);
    if (gate) return gate;
    const rec = findReceiver(req);
    if (!rec) return notFound("Receiver not found");
    const out = enableReceiver(rec, req.body);
    if (out instanceof Response) return out;
    const data = fiat(req.env);
    data.wallets[out.id] ??= [];
    data.banks[out.id] ??= [];
    return ok(out, "OK");
  }),
  route("PATCH", "/api/kyc/receivers/:id/access", (req) => {
    const gate = managerGate(req, "enable or disable a fiat account");
    if (gate) return gate;
    const rec = findReceiver(req);
    if (!rec) return notFound("Receiver not found");
    const out = setAccess(rec, req.body);
    return out instanceof Response ? out : ok(out, out.disabled ? "Fiat account disabled." : "Fiat account enabled.");
  }),

  /* ---- Fiat: a receiver's wallets and bank accounts ---- */
  route("GET", "/api/kyc/receivers/:id/wallets/sign-message", (req) => {
    const gate = fiatGate(req);
    if (gate) return gate;
    const rec = findReceiver(req);
    return rec ? ok({ message: `BlindPay wallet ownership for ${rec.blindpayId ?? rec.id}: ${hex(`${rec.id}:sign`, 8)}` }, "OK") : notFound("Receiver not found");
  }),
  route("GET", "/api/kyc/receivers/:id/wallets", (req) => {
    const gate = fiatGate(req);
    if (gate) return gate;
    const rec = findReceiver(req);
    if (!rec) return notFound("Receiver not found");
    return ok(fiatPage(fiat(req.env).wallets[rec.id] ?? [], req.url), "OK");
  }),
  route("POST", "/api/kyc/receivers/:id/wallets", (req) => {
    const gate = fiatGate(req);
    if (gate) return gate;
    const rec = findReceiver(req);
    if (!rec) return notFound("Receiver not found");
    const name = str(req.body, "name");
    const network = str(req.body, "network");
    const address = str(req.body, "address");
    if (!name || !network || !address) return badRequest("name, network and address are required");
    const data = fiat(req.env);
    const list = (data.wallets[rec.id] ??= []);
    const now = nowIso();
    const w: FiatWallet = { id: cuid(`${rec.id}:wallet:new:${now}:${list.length}`), blindpayId: bpId("bw", `${rec.id}:${now}`), name, network, address, is_account_abstraction: req.body?.is_account_abstraction === true, createdAt: now };
    list.push(w);
    return created(w, "Created");
  }),
  route("DELETE", "/api/kyc/receivers/:id/wallets/:walletId", (req) => {
    const gate = fiatGate(req);
    if (gate) return gate;
    const list = fiat(req.env).wallets[req.params.id] ?? [];
    const i = list.findIndex((x) => x.id === req.params.walletId);
    if (i < 0) return notFound("Wallet not found");
    list.splice(i, 1);
    return ok({ id: req.params.walletId, deleted: true }, "OK");
  }),
  route("GET", "/api/kyc/receivers/:id/bank-accounts", (req) => {
    const gate = fiatGate(req);
    if (gate) return gate;
    const rec = findReceiver(req);
    if (!rec) return notFound("Receiver not found");
    return ok(fiatPage(fiat(req.env).banks[rec.id] ?? [], req.url), "OK");
  }),
  route("POST", "/api/kyc/receivers/:id/bank-accounts", (req) => {
    const gate = fiatGate(req);
    if (gate) return gate;
    const rec = findReceiver(req);
    if (!rec) return notFound("Receiver not found");
    const type = str(req.body, "type");
    const name = str(req.body, "name");
    if (!type || !name) return badRequest("type and name are required");
    const data = fiat(req.env);
    const list = (data.banks[rec.id] ??= []);
    const now = nowIso();
    const account = str(req.body, "account_number");
    const b: FiatBank = {
      id: cuid(`${rec.id}:bank:new:${now}:${list.length}`),
      blindpayId: bpId("ba", `${rec.id}:${now}`),
      name,
      rail: type,
      type,
      beneficiary_name: str(req.body, "beneficiary_name") ?? null,
      country: str(req.body, "country") ?? null,
      account_number: account ? `••••${account.slice(-4)}` : null,
      routing_number: str(req.body, "routing_number") ?? null,
      createdAt: now,
    };
    list.push(b);
    return created(b, "Created");
  }),
  route("DELETE", "/api/kyc/receivers/:id/bank-accounts/:bankId", (req) => {
    const gate = fiatGate(req);
    if (gate) return gate;
    const list = fiat(req.env).banks[req.params.id] ?? [];
    const i = list.findIndex((x) => x.id === req.params.bankId);
    if (i < 0) return notFound("Bank account not found");
    list.splice(i, 1);
    return ok({ id: req.params.bankId, deleted: true }, "OK");
  }),

  /* ---- Fiat: KYC helpers ---- */
  route("POST", "/api/kyc/upload", (req) => {
    const gate = fiatGate(req);
    if (gate) return gate;
    return ok({ file_url: `https://files.blindpay.com/onboarding/mock-${hex(`upload:${nowIso()}`, 8)}.pdf` }, "OK");
  }),
  route("POST", "/api/kyc/terms-of-service", (req) => {
    const gate = fiatGate(req);
    if (gate) return gate;
    return ok({ url: `https://app.blindpay.com/e/terms-of-service?idempotency_key=${hex(`tos:${nowIso()}`, 8)}` }, "OK");
  }),
  route("GET", "/api/kyc/rails", (req) => {
    const gate = fiatGate(req);
    if (gate) return gate;
    return ok(
      [
        { label: "ACH", value: "ach", country: "US" },
        { label: "Wire", value: "wire", country: "US" },
        { label: "RTP", value: "rtp", country: "US" },
        { label: "PIX", value: "pix", country: "BR" },
        { label: "PIX Safe", value: "pix_safe", country: "BR" },
        { label: "TED", value: "ted", country: "BR" },
        { label: "SPEI", value: "spei_bitso", country: "MX" },
        { label: "Transfers 3.0", value: "transfers_bitso", country: "AR" },
        { label: "ACH Colombia", value: "ach_cop_bitso", country: "CO" },
        { label: "International SWIFT", value: "international_swift", country: "US" },
        { label: "SEPA", value: "sepa", country: "DE" },
      ],
      "OK",
    );
  }),

  /* ---- Onramp (fiat to stablecoin) ---- */
  route("POST", "/api/onramp/quotes", (req) => {
    const gate = fiatGate(req);
    if (gate) return gate;
    const wallet = str(req.body, "blockchain_wallet_id");
    const amount = Math.trunc(Number(req.body?.request_amount));
    if (!wallet || !(amount > 0)) return badRequest("blockchain_wallet_id and a positive request_amount are required");
    const method = str(req.body, "payment_method") ?? "pix";
    const fc = FIAT_COUNTRIES.find((f) => f.payin === method) ?? FIAT_COUNTRIES[4];
    const receiverSide = str(req.body, "currency_type") === "receiver";
    const sender = receiverSide ? Math.round(amount * fc.rate * 1.012) : amount;
    const receiver = receiverSide ? amount : Math.round((amount / fc.rate) * 0.988);
    const now = nowIso();
    const data = fiat(req.env);
    const q: FiatQuote = {
      id: bpId("qu", `onramp:${now}:${data.quotes.length}`),
      kind: "onramp",
      sender_amount: sender,
      receiver_amount: receiver,
      currency: fc.currency,
      token: str(req.body, "token") ?? "USDC",
      network: req.env === "prod" ? "stellar" : "stellar_testnet",
      payment_method: method,
      commercial_quotation: fc.rate,
      blindpay_quotation: Number((fc.rate * 1.012).toFixed(4)),
      flat_fee: 0,
      partner_fee_amount: 0,
      expires_at: Math.floor(Date.parse(hoursFromNow(0.25)) / 1000),
    };
    data.quotes.push(q);
    return ok(q, "OK");
  }),
  route("POST", "/api/onramp/payins", (req) => {
    const gate = fiatGate(req);
    if (gate) return gate;
    const quoteId = str(req.body, "payin_quote_id");
    if (!quoteId) return badRequest("payin_quote_id is required");
    const data = fiat(req.env);
    const q = data.quotes.find((x) => x.id === quoteId && x.kind === "onramp");
    if (!q) return notFound("Quote not found or expired");
    const now = nowIso();
    const key = `payin:new:${now}:${data.payins.length}`;
    const p: Payin = {
      id: cuid(key),
      receiverId: data.receivers.find((x) => x.kycStatus === "approved")?.id ?? null,
      blindpayId: bpId("pi", key),
      quoteId: q.id,
      status: "pending",
      token: q.token,
      network: q.network,
      paymentMethod: q.payment_method ?? "pix",
      currency: q.currency,
      senderAmount: fixed(q.sender_amount / 100),
      receiverAmount: fixed(q.receiver_amount / 100),
      instructions: payinInstructions(q.payment_method ?? "pix", key),
      createdAt: now,
      updatedAt: now,
    };
    data.payins.unshift(p);
    return created(p, "Created");
  }),
  route("GET", "/api/onramp/payins", (req) => {
    const gate = fiatGate(req);
    if (gate) return gate;
    return ok(fiatPage([...fiat(req.env).payins].sort(newestFirst), req.url), "OK");
  }),
  route("GET", "/api/onramp/payins/:id", (req) => {
    const gate = fiatGate(req);
    if (gate) return gate;
    const p = fiat(req.env).payins.find((x) => x.id === req.params.id);
    return p ? ok(p, "OK") : notFound("Payin not found");
  }),

  /* ---- Offramp (stablecoin to fiat) ---- */
  route("POST", "/api/offramp/quotes", (req) => {
    const gate = fiatGate(req);
    if (gate) return gate;
    const bank = str(req.body, "bank_account_id");
    const amount = Math.trunc(Number(req.body?.request_amount));
    if (!bank || !(amount > 0)) return badRequest("bank_account_id and a positive request_amount are required");
    const data = fiat(req.env);
    const account = Object.values(data.banks).flat().find((b) => b.id === bank || b.blindpayId === bank);
    const fc = FIAT_COUNTRIES.find((f) => f.rail === account?.rail) ?? FIAT_COUNTRIES[0];
    const receiverSide = str(req.body, "currency_type") === "receiver";
    const sender = receiverSide ? Math.round((amount / fc.rate) * 1.012) : amount;
    const local = receiverSide ? amount : Math.round(amount * fc.rate * 0.988);
    const now = nowIso();
    const q: FiatQuote = {
      id: bpId("qu", `offramp:${now}:${data.quotes.length}`),
      kind: "offramp",
      sender_amount: sender,
      receiver_amount: Math.round(local / fc.rate),
      receiver_local_amount: local,
      currency: fc.currency,
      token: str(req.body, "token") ?? "USDC",
      network: str(req.body, "network") ?? "stellar",
      rail: fc.rail,
      bank_account_id: bank,
      commercial_quotation: fc.rate,
      blindpay_quotation: Number((fc.rate * 0.988).toFixed(4)),
      flat_fee: req.body?.cover_fees === true ? 0 : 50,
      partner_fee_amount: 0,
      expires_at: Math.floor(Date.parse(hoursFromNow(0.25)) / 1000),
    };
    data.quotes.push(q);
    return ok(q, "OK");
  }),
  route("POST", "/api/offramp/payouts/authorize", (req) => {
    const gate = fiatGate(req);
    if (gate) return gate;
    const quoteId = str(req.body, "quote_id");
    const sender = str(req.body, "sender_wallet_address");
    if (!quoteId || !sender) return badRequest("quote_id and sender_wallet_address are required");
    const q = fiat(req.env).quotes.find((x) => x.id === quoteId && x.kind === "offramp");
    if (!q) return notFound("Quote not found or expired");
    const amount = fixed(q.sender_amount / 100, 7);
    const deposit = stellarAccount(`blindpay:deposit:${req.env}`);
    return ok({ transaction: unsignedPayment(req.env, sender, deposit, amount, quoteId) }, "OK");
  }),
  route("POST", "/api/offramp/payouts", (req) => {
    const gate = fiatGate(req);
    if (gate) return gate;
    const quoteId = str(req.body, "quote_id");
    const sender = str(req.body, "sender_wallet_address");
    if (!quoteId || !sender) return badRequest("quote_id and sender_wallet_address are required");
    const data = fiat(req.env);
    const q = data.quotes.find((x) => x.id === quoteId && x.kind === "offramp");
    if (!q) return notFound("Quote not found or expired");
    const now = nowIso();
    const key = `payout:new:${now}:${data.payouts.length}`;
    const owner = Object.entries(data.banks).find(([, list]) => list.some((b) => b.id === q.bank_account_id || b.blindpayId === q.bank_account_id));
    const p: Payout = {
      id: cuid(key),
      blindpayId: bpId("po", key),
      status: "processing",
      token: q.token,
      network: q.network,
      rail: q.rail ?? "pix",
      senderAmount: fixed(q.sender_amount / 100),
      receiverAmount: fixed((q.receiver_local_amount ?? q.receiver_amount) / 100),
      senderWalletAddress: sender,
      receiverId: owner ? owner[0] : null,
      quoteId: q.id,
      bankAccountId: q.bank_account_id ?? null,
      createdAt: now,
      updatedAt: now,
    };
    data.payouts.unshift(p);
    return created(p, "Created");
  }),
  route("GET", "/api/offramp/payouts", (req) => {
    const gate = fiatGate(req);
    if (gate) return gate;
    return ok(fiatPage([...fiat(req.env).payouts].sort(newestFirst), req.url), "OK");
  }),
  route("GET", "/api/offramp/payouts/:id", (req) => {
    const gate = fiatGate(req);
    if (gate) return gate;
    const p = fiat(req.env).payouts.find((x) => x.id === req.params.id);
    return p ? ok(p, "OK") : notFound("Payout not found");
  }),
];
