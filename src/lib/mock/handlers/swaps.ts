/* Mock answers for the swap and DeFi routes: same-chain swaps (Stellar DEX, Jupiter, Kuru Flow),
   cross-chain swaps (NEAR Intents), USDT0 out of Stellar (LayerZero's OFT), Stellar liquidity pools
   and private (ZK) payments. Shapes are the Payments API's (src/lib/cosmos.ts), and the environment
   rules are the real ones: Stellar swaps and liquidity in both environments; Solana, Monad,
   cross-chain swaps and USDT0 on mainnet only (the sandbox lists assets and quotes, creating is
   refused); private payments on testnet only. A signed transaction handed to a submit moves its
   record on by itself a few seconds later, so the screens that follow a record can be watched. */
import type {
  ChainSwap,
  CrossChainAsset,
  CrossChainQuote,
  CrossChainSwap,
  LiquidityOperation,
  LiquidityPool,
  LiquidityPosition,
  LiquidityReserve,
  Swap,
  SwapQuote,
  Usdt0Quote,
  Usdt0RoutesView,
  Usdt0Transfer,
  ZkConfig,
  ZkPayment,
} from "@/lib/cosmos";
import {
  badRequest,
  created,
  notFound,
  ok,
  page,
  route,
  str,
  type MockEnv,
  type MockRequest,
  type MockRoute,
} from "@/lib/mock/http";
import { mockEnvStore } from "@/lib/mock/store";
import { mockOptions } from "@/lib/mock/mode";
import { mockOrgPlan } from "@/lib/mock/handlers/platform";
import { realList, realSwap, recordPath } from "@/lib/mock/real-swaps";
import { DEFAULT_MOCK_ORG_ID, MOCK_PUBLIC_ORG, mockCustomerSeeds, mockOrgWalletSeeds } from "@/lib/mock/shared";
import {
  EURC_ISSUER,
  USDC_ISSUER,
  evmAddress,
  evmTxHash,
  hex,
  hoursAgo,
  nowIso,
  qrImage,
  rng,
  solanaAddress,
  solanaSignature,
  stellarAccount,
  stellarContract,
  stellarNetwork,
  txHash,
  uuid,
  type Rng,
} from "@/lib/mock/fixtures";
import { planSwapFeeBps } from "@/lib/plans";
import { nearValue } from "@/lib/swap-catalog";
import { USDT0_STELLAR, bridgedAmount } from "@/lib/usdt0";

/* ------------------------------------------------------------------ helpers */

const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";
const PUBLIC_PASSPHRASE = "Public Global Stellar Network ; September 2015";
const USDB_ISSUER = "GCQSSIMOW5OCGULZATDXKU5MOJBOMFX6G65X6CXZDQ7AIB3SKFUZ67NX";
const SOL_USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const SOL_USDT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
const SOL_JUP = "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN";
const MON_USDC = "0x754704bc059f8c67012fed69bc8a327a5aafb603";
const MONAD_CHAIN_ID = 143;

/** An amount as the API writes it: at most `places` decimals, no trailing zeros. */
function amt(n: number, places = 7): string {
  if (!Number.isFinite(n) || n <= 0) return "0";
  const s = n.toFixed(places);
  return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
}

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

const isNativeCode = (code: string | undefined | null) => !code || ["xlm", "native"].includes(code.trim().toLowerCase());

/** Something that reads like a transaction envelope (the views only show and copy it). */
function fakeXdr(label: string): string {
  return Buffer.concat([Buffer.from([0, 0, 0, 2, 0, 0, 0, 0]), Buffer.from(hex(`xdr:${label}`, 196), "hex")]).toString("base64");
}

function sep7Tx(xdr: string, env: MockEnv): string {
  const pass = env === "prod" ? "" : `&network_passphrase=${encodeURIComponent(TESTNET_PASSPHRASE)}`;
  return `web+stellar:tx?xdr=${encodeURIComponent(xdr)}${pass}`;
}

function minutesAfter(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

/** Hours ago, weighted toward the last weeks but spread over a year. */
function spreadHours(r: Rng): number {
  const x = r.next();
  return 2 + x * x * 24 * 360;
}

/** USD reference prices (mock), by symbol. */
const PRICE: Record<string, number> = {
  XLM: 0.31, USDC: 1, EURC: 1.08, USDT0: 1, USDT: 1, USDB: 1, DAI: 1, XDAI: 1, SOL: 162.4, JUP: 0.86, MON: 0.046,
  ETH: 3150, WETH: 3150, BTC: 96200, WBTC: 96150, CBBTC: 96100, BNB: 612, POL: 0.38, AVAX: 27.4, ARB: 0.62, OP: 1.41,
  BERA: 3.52, NEAR: 2.94, SUI: 3.08, APT: 7.21, TON: 4.92, TRX: 0.243, XRP: 2.21, DOGE: 0.171, LTC: 88.3, BCH: 362,
  DASH: 27.9, ZEC: 45.6, ADA: 0.624, STRK: 0.142, HYPE: 32.4,
};
const priceOf = (symbol: string): number => PRICE[symbol.toUpperCase()] ?? 1;

/** A Stellar asset as the swap records name it: "native", or its code with the issuer apart. */
interface StellarAsset {
  code: string;
  issuer: string | null;
}
const XLM: StellarAsset = { code: "native", issuer: null };
const labelOf = (a: StellarAsset) => (a.code === "native" ? "XLM" : a.code);

function stellarAssets(env: MockEnv): Record<string, StellarAsset> {
  return env === "prod"
    ? { XLM, USDC: { code: "USDC", issuer: USDC_ISSUER.prod }, EURC: { code: "EURC", issuer: EURC_ISSUER.prod }, USDT0: { code: "USDT0", issuer: USDT0_STELLAR.issuer } }
    : { XLM, USDC: { code: "USDC", issuer: USDC_ISSUER.dev }, USDB: { code: "USDB", issuer: USDB_ISSUER } };
}

/** The asset a request names (code + issuer), or null when a non-native code has no issuer. */
function assetFromBody(code: string | undefined, issuer: string | undefined, env: MockEnv): StellarAsset | null {
  if (isNativeCode(code)) return XLM;
  const c = code!.trim();
  const known = stellarAssets(env)[c.toUpperCase()];
  if (issuer && issuer.trim()) return { code: c, issuer: issuer.trim() };
  return known ?? null;
}

const sameAsset = (a: { asset: string; issuer: string | null }, b: StellarAsset) =>
  (a.asset === "native" && b.code === "native") || (a.asset === b.code && a.issuer === b.issuer);

/** The sample organization's Stellar accounts (Settings' wallets), the source of most records. */
function orgStellarAccounts(): string[] {
  return mockOrgWalletSeeds(DEFAULT_MOCK_ORG_ID).filter((w) => w.chain === "stellar").map((w) => w.address);
}

/* The commission an organization's swaps pay: its owner's plan's (src/lib/organizations.ts
   orgSwapContext); the shared public consumer's, on the public swap pages, is the community plan's,
   as the gateway's consumer carries it. The sample records go by the sample account's plan. */
const planBps = (org?: string | null) => planSwapFeeBps(org === MOCK_PUBLIC_ORG ? "community" : org ? mockOrgPlan(org) : mockOptions().plan);

/* ------------------------------------------------------------------ NEAR Intents assets */

type AssetRow = [chain: string, chainName: string, symbol: string, decimals: number, contract: string | null];

const ASSET_ROWS: AssetRow[] = [
  ["stellar", "Stellar", "XLM", 7, null],
  ["stellar", "Stellar", "USDC", 7, USDC_ISSUER.prod],
  ["stellar", "Stellar", "EURC", 7, EURC_ISSUER.prod],
  ["solana", "Solana", "SOL", 9, null],
  ["solana", "Solana", "USDC", 6, SOL_USDC],
  ["solana", "Solana", "USDT", 6, SOL_USDT],
  ["solana", "Solana", "JUP", 6, SOL_JUP],
  ["monad", "Monad", "MON", 18, null],
  ["monad", "Monad", "USDC", 6, MON_USDC],
  ["eth", "Ethereum", "ETH", 18, null],
  ["eth", "Ethereum", "USDC", 6, "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"],
  ["eth", "Ethereum", "USDT", 6, "0xdac17f958d2ee523a2206206994597c13d831ec7"],
  ["eth", "Ethereum", "WBTC", 8, "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599"],
  ["eth", "Ethereum", "DAI", 18, "0x6b175474e89094c44da98b954eedeac495271d0f"],
  ["base", "Base", "ETH", 18, null],
  ["base", "Base", "USDC", 6, "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"],
  ["base", "Base", "cbBTC", 8, "0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf"],
  ["arb", "Arbitrum", "ETH", 18, null],
  ["arb", "Arbitrum", "USDC", 6, "0xaf88d065e77c8cc2239327c5edb3a432268e5831"],
  ["arb", "Arbitrum", "USDT", 6, "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"],
  ["arb", "Arbitrum", "ARB", 18, "0x912ce59144191c1204e64559fe8253a0e49e6548"],
  ["op", "Optimism", "ETH", 18, null],
  ["op", "Optimism", "USDC", 6, "0x0b2c639c533813f4aa9d7837caf62653d097ff85"],
  ["op", "Optimism", "OP", 18, "0x4200000000000000000000000000000000000042"],
  ["bsc", "BNB Chain", "BNB", 18, null],
  ["bsc", "BNB Chain", "USDT", 18, "0x55d398326f99059ff775485246999027b3197955"],
  ["bsc", "BNB Chain", "USDC", 18, "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d"],
  ["pol", "Polygon", "POL", 18, null],
  ["pol", "Polygon", "USDC", 6, "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359"],
  ["pol", "Polygon", "USDT", 6, "0xc2132d05d31c914a87c6611c10748aeb04b58e8f"],
  ["avax", "Avalanche", "AVAX", 18, null],
  ["avax", "Avalanche", "USDC", 6, "0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e"],
  ["gnosis", "Gnosis", "XDAI", 18, null],
  ["bera", "Berachain", "BERA", 18, null],
  ["hypercore", "Hyperliquid", "HYPE", 8, null],
  ["btc", "Bitcoin", "BTC", 8, null],
  ["ltc", "Litecoin", "LTC", 8, null],
  ["doge", "Dogecoin", "DOGE", 8, null],
  ["bch", "Bitcoin Cash", "BCH", 8, null],
  ["dash", "Dash", "DASH", 8, null],
  ["zec", "Zcash", "ZEC", 8, null],
  ["xrp", "XRP Ledger", "XRP", 6, null],
  ["tron", "Tron", "TRX", 6, null],
  ["tron", "Tron", "USDT", 6, "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"],
  ["ton", "TON", "TON", 9, null],
  ["ton", "TON", "USDT", 6, "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs"],
  ["near", "NEAR", "NEAR", 24, null],
  ["near", "NEAR", "USDC", 6, "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1"],
  ["sui", "Sui", "SUI", 9, null],
  ["sui", "Sui", "USDC", 6, "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC"],
  ["aptos", "Aptos", "APT", 8, null],
  ["starknet", "Starknet", "STRK", 18, null],
  ["cardano", "Cardano", "ADA", 6, null],
];

const ASSETS: CrossChainAsset[] = ASSET_ROWS.map(([chain, chainName, symbol, decimals, contract]) => ({
  chain,
  chainName,
  symbol,
  assetId: contract ? `nep141:${chain}-${hex(`asset:${chain}:${contract}`, 20)}.omft.near` : `nep141:${chain}.omft.near`,
  decimals,
  contract,
  priceUsd: priceOf(symbol),
}));

/** The listing a cross-chain body names (its NEAR value, or in the sandbox the bare symbol). */
function findAsset(chain: string, value: string): CrossChainAsset | null {
  const v = value.trim();
  const onChain = ASSETS.filter((a) => a.chain === chain);
  return (
    onChain.find((a) => nearValue(a) === v) ??
    onChain.find((a) => (a.contract ?? "").toLowerCase() === v.toLowerCase()) ??
    onChain.find((a) => a.symbol.toUpperCase() === v.split(":")[0].toUpperCase()) ??
    null
  );
}

/* ------------------------------------------------------------------ chain formats */

const EVM_CHAINS = new Set(["eth", "base", "arb", "op", "bsc", "pol", "avax", "gnosis", "bera", "scroll", "xlayer", "abs", "plasma", "hood", "hypercore", "monad"]);
const B32 = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";

function bech(label: string, length: number): string {
  return Array.from(Buffer.from(hex(`bech:${label}`, length), "hex"), (b) => B32[b % 32]).join("");
}

function addressFor(chain: string, label: string): string {
  if (chain === "stellar") return stellarAccount(label);
  if (chain === "solana") return solanaAddress(label);
  if (EVM_CHAINS.has(chain)) return evmAddress(`${chain}:${label}`);
  if (chain === "btc") return `bc1q${bech(label, 38)}`;
  if (chain === "ltc") return `ltc1q${bech(label, 38)}`;
  if (chain === "tron") return `T${solanaAddress(`tron:${label}`).slice(0, 33)}`;
  if (chain === "xrp") return `r${solanaAddress(`xrp:${label}`).slice(0, 32)}`;
  if (chain === "near") return hex(`near:${label}`);
  if (chain === "sui" || chain === "aptos") return `0x${hex(`${chain}:${label}`)}`;
  return `${chain}1${bech(label, 40)}`;
}

function hashFor(chain: string, label: string): string {
  if (chain === "solana") return solanaSignature(label);
  if (EVM_CHAINS.has(chain)) return evmTxHash(`${chain}:${label}`);
  return txHash(`${chain}:${label}`);
}

const EXPLORERS: Record<string, string> = {
  stellar: "https://stellar.expert/explorer/public/tx/",
  solana: "https://solscan.io/tx/",
  monad: "https://monadscan.com/tx/",
  eth: "https://etherscan.io/tx/",
  base: "https://basescan.org/tx/",
  arb: "https://arbiscan.io/tx/",
  op: "https://optimistic.etherscan.io/tx/",
  bsc: "https://bscscan.com/tx/",
  pol: "https://polygonscan.com/tx/",
  btc: "https://mempool.space/tx/",
  tron: "https://tronscan.org/#/transaction/",
};
const explorerFor = (chain: string, hash: string) => `${EXPLORERS[chain] ?? "https://explorer.near-intents.org/transactions/"}${hash}`;

/** A wallet link where the origin network has a standard one, else null (pay the address). */
function depositUriFor(chain: string, address: string, amount: string, memo: string | null): string | null {
  if (chain === "stellar") return `web+stellar:pay?destination=${address}&amount=${amount}${memo ? `&memo=${memo}&memo_type=MEMO_ID` : ""}`;
  if (chain === "solana") return `solana:${address}?amount=${amount}`;
  if (chain === "eth") return `ethereum:${address}@1?value=${amount}`;
  if (chain === "btc") return `bitcoin:${address}?amount=${amount}`;
  return null;
}

/* ------------------------------------------------------------------ state */

interface DefiState {
  swaps: (Swap | ChainSwap)[];
  cross: CrossChainSwap[];
  usdt0: Usdt0Transfer[];
  pools: LiquidityPool[];
  positions: Record<string, LiquidityPosition[]>;
  operations: LiquidityOperation[];
  zk: ZkPayment[];
  /** When a record was handed a signed transaction here (ms), so it moves on by itself. */
  submittedAt: Record<string, number>;
}

const isChainSwap = (s: Swap | ChainSwap): s is ChainSwap => "chain" in s && (s.chain === "solana" || s.chain === "monad");

function stellarSwap(env: MockEnv, r: Rng, i: number, from: StellarAsset, to: StellarAsset, status: Swap["status"], createdAt: string, bps = planBps()): Swap {
  const id = uuid(`${env}:swap:${i}`);
  const sendAmount = from.code === "native" ? r.amount(40, 6000, 2) : r.amount(10, 2500, 2);
  const send = num(sendAmount);
  const fee = (send * bps) / 10_000;
  const swapAmount = send - fee;
  const estimated = (swapAmount * priceOf(labelOf(from))) / priceOf(labelOf(to)) * 0.997;
  const slippageBps = r.pick([50, 50, 100]);
  const source = r.chance(0.75) ? r.pick(orgStellarAccounts()) : stellarAccount(`${env}:swap-source:${i}`);
  const xdr = fakeXdr(`${env}:swap:${i}`);
  const open = status === "PENDING";
  const settledHash = status === "PENDING" || status === "EXPIRED" ? "" : txHash(`${env}:swap:${i}`);
  return {
    id,
    status,
    network: stellarNetwork(env),
    source,
    destination: r.chance(0.85) ? source : stellarAccount(`${env}:swap-dest:${i}`),
    sendAsset: from.code,
    sendAssetIssuer: from.issuer,
    sendAmount,
    feeAmount: amt(fee),
    feeBps: bps,
    swapAmount: amt(swapAmount),
    destAsset: to.code,
    destAssetIssuer: to.issuer,
    destEstimated: amt(estimated),
    destMin: amt(estimated * (1 - slippageBps / 10_000)),
    slippageBps,
    path: from.code !== "native" && to.code !== "native" ? [{ code: "XLM", issuer: null }] : [],
    memo: r.chance(0.2) ? String(r.int(1000, 99999)) : null,
    commissionMemo: bps > 0 ? "Cosmos Swap Commission" : null,
    trustline: open && to.issuer && r.chance(0.5) ? { code: to.code, issuer: to.issuer } : null,
    xdr,
    uri: sep7Tx(xdr, env),
    txHash: settledHash,
    qr: open ? qrImage(id) : "",
    createdAt,
    updatedAt: status === "PENDING" ? createdAt : minutesAfter(createdAt, r.int(1, 6)),
  };
}

type ChainPair = { chain: "solana" | "monad"; from: string; fromSymbol: string; to: string; toSymbol: string };

const CHAIN_PAIRS: ChainPair[] = [
  { chain: "solana", from: "native", fromSymbol: "SOL", to: SOL_USDC, toSymbol: "USDC" },
  { chain: "solana", from: SOL_USDC, fromSymbol: "USDC", to: "native", toSymbol: "SOL" },
  { chain: "solana", from: "native", fromSymbol: "SOL", to: SOL_USDT, toSymbol: "USDT" },
  { chain: "solana", from: SOL_USDC, fromSymbol: "USDC", to: SOL_JUP, toSymbol: "JUP" },
  { chain: "monad", from: "native", fromSymbol: "MON", to: MON_USDC, toSymbol: "USDC" },
  { chain: "monad", from: MON_USDC, fromSymbol: "USDC", to: "native", toSymbol: "MON" },
];

function chainSwap(env: MockEnv, r: Rng, i: number, pair: ChainPair, status: Swap["status"], createdAt: string, sendAmount?: string, source?: string, bps = planBps()): ChainSwap {
  const id = uuid(`${env}:chainswap:${i}`);
  const amount = sendAmount ?? (pair.fromSymbol === "USDC" ? r.amount(15, 1800, 2) : pair.fromSymbol === "SOL" ? r.amount(0.2, 30, 3) : r.amount(500, 90_000, 2));
  const gross = (num(amount) * priceOf(pair.fromSymbol)) / priceOf(pair.toSymbol) * 0.996;
  const fee = (gross * bps) / 10_000;
  const estimated = gross - fee;
  const slippageBps = 50;
  const decimals = pair.chain === "solana" ? 9 : 18;
  const from = source ?? addressFor(pair.chain, `${env}:chainswap-source:${i % 4}`);
  const transaction: Record<string, unknown> =
    pair.chain === "solana"
      ? { encoding: "base64", data: fakeXdr(`${env}:sol:${i}`) }
      : { to: evmAddress(`kuru-router`), data: `0x${hex(`kuru:${i}`, 132)}`, value: pair.from === "native" ? String(BigInt(Math.round(num(amount) * 1e6)) * 10n ** 12n) : "0", chainId: MONAD_CHAIN_ID };
  const approval =
    pair.chain === "monad" && pair.from !== "native" && status === "PENDING"
      ? { to: pair.from, data: `0x095ea7b3${hex(`approve:${i}`, 64)}`, value: "0", chainId: MONAD_CHAIN_ID }
      : null;
  const hash = status === "PENDING" || (status === "EXPIRED" && r.chance(0.7)) ? null : hashFor(pair.chain, `${env}:chainswap:${i}`);
  return {
    id,
    chain: pair.chain,
    network: "mainnet",
    provider: pair.chain === "solana" ? "jupiter" : "kuru",
    status,
    source: from,
    sendAsset: pair.from,
    sendAmount: amount,
    destAsset: pair.to,
    destEstimated: amt(estimated, Math.min(decimals, 7)),
    destMin: amt(estimated * (1 - slippageBps / 10_000), Math.min(decimals, 7)),
    feeBps: bps,
    feeAmount: amt(fee, 7),
    slippageBps,
    path: [{ code: pair.fromSymbol, issuer: null }, { code: pair.toSymbol, issuer: null }],
    transaction,
    approval,
    txHash: hash,
    idempotencyKey: null,
    expiresAt: minutesAfter(createdAt, 2),
    createdAt,
    updatedAt: status === "PENDING" ? createdAt : minutesAfter(createdAt, 1),
  };
}

const PROVIDER_STATUS: Record<CrossChainSwap["status"], string> = {
  AWAITING_DEPOSIT: "PENDING_DEPOSIT",
  DEPOSIT_DETECTED: "KNOWN_DEPOSIT_TX",
  INCOMPLETE_DEPOSIT: "INCOMPLETE_DEPOSIT",
  PROCESSING: "PROCESSING",
  SUCCEEDED: "SUCCESS",
  REFUNDED: "REFUNDED",
  FAILED: "FAILED",
  EXPIRED: "EXPIRED",
};

interface CrossInput {
  origin: CrossChainAsset;
  destination: CrossChainAsset;
  amount: string;
  recipient: string;
  refundTo: string;
  slippageBps: number;
}

function crossQuote(input: CrossInput, network: string, bps = planBps()): CrossChainQuote {
  const inUsd = num(input.amount) * (input.origin.priceUsd ?? 1);
  const fee = (num(input.amount) * bps) / 10_000;
  const outUsd = (num(input.amount) - fee) * (input.origin.priceUsd ?? 1) * 0.995;
  const out = outUsd / (input.destination.priceUsd ?? 1);
  const places = Math.min(input.destination.decimals, 8);
  return {
    network,
    origin: { chain: input.origin.chain, asset: input.origin.symbol, assetId: input.origin.assetId, contract: input.origin.contract, amount: input.amount, amountUsd: inUsd.toFixed(2) },
    destination: {
      chain: input.destination.chain,
      asset: input.destination.symbol,
      assetId: input.destination.assetId,
      contract: input.destination.contract,
      amount: amt(out, places),
      amountUsd: outUsd.toFixed(2),
      minimum: amt(out * (1 - input.slippageBps / 10_000), places),
    },
    fee: { bps, amount: amt(fee, Math.min(input.origin.decimals, 8)), asset: input.origin.symbol },
    slippageBps: input.slippageBps,
    timeEstimateSeconds: input.origin.chain === "btc" ? 900 : input.origin.chain === "eth" ? 120 : 40,
  };
}

function crossSwap(env: MockEnv, i: number, input: CrossInput, status: CrossChainSwap["status"], createdAt: string, idempotencyKey: string | null = null, bps = planBps()): CrossChainSwap {
  const id = uuid(`${env}:cross:${i}`);
  const q = crossQuote(input, "mainnet", bps);
  const depositAddress = addressFor(input.origin.chain, `${env}:cross-deposit:${i}`);
  const depositMemo = input.origin.chain === "stellar" ? String(100000 + i * 7919) : null;
  const waiting = status === "AWAITING_DEPOSIT" || status === "INCOMPLETE_DEPOSIT";
  const deposited = status !== "AWAITING_DEPOSIT" && status !== "EXPIRED";
  const done = status === "SUCCEEDED";
  const originHash = deposited ? hashFor(input.origin.chain, `${env}:cross-in:${i}`) : null;
  const destHash = done ? hashFor(input.destination.chain, `${env}:cross-out:${i}`) : null;
  return {
    id,
    status,
    providerStatus: PROVIDER_STATUS[status],
    network: "mainnet",
    originChain: input.origin.chain,
    originAsset: input.origin.symbol,
    originContract: input.origin.contract,
    destinationChain: input.destination.chain,
    destinationAsset: input.destination.symbol,
    destinationContract: input.destination.contract,
    amountIn: input.amount,
    feeBps: q.fee.bps,
    feeAmount: q.fee.amount,
    amountOutEstimated: q.destination.amount,
    amountOutMin: q.destination.minimum,
    slippageBps: input.slippageBps,
    recipient: input.recipient,
    refundTo: input.refundTo,
    depositAddress,
    depositMemo,
    depositUri: depositUriFor(input.origin.chain, depositAddress, input.amount, depositMemo),
    qr: waiting ? qrImage(id) : undefined,
    depositTxHash: originHash,
    amountOut: done ? amt(num(q.destination.amount) * 1.001, Math.min(input.destination.decimals, 8)) : null,
    refundedAmount: status === "REFUNDED" ? input.amount : null,
    originTxHashes: originHash ? [{ hash: originHash, explorerUrl: explorerFor(input.origin.chain, originHash) }] : null,
    destinationTxHashes: destHash ? [{ hash: destHash, explorerUrl: explorerFor(input.destination.chain, destHash) }] : null,
    timeEstimateSeconds: q.timeEstimateSeconds,
    correlationId: uuid(`${env}:cross-corr:${i}`),
    quoteSignature: `ed25519:${solanaSignature(`${env}:cross-sig:${i}`)}`,
    idempotencyKey,
    expiresAt: minutesAfter(createdAt, 60),
    createdAt,
    updatedAt: status === "AWAITING_DEPOSIT" ? createdAt : minutesAfter(createdAt, 3),
  };
}

const USDT0_ROUTES: Usdt0RoutesView["routes"] = [
  { chain: "eth", name: "Ethereum", eid: 30101, receives: "USDT" },
  { chain: "arb", name: "Arbitrum", eid: 30110, receives: "USDT0" },
  { chain: "op", name: "Optimism", eid: 30111, receives: "USDT0" },
  { chain: "pol", name: "Polygon", eid: 30109, receives: "USDT0" },
  { chain: "bera", name: "Berachain", eid: 30362, receives: "USDT0" },
  { chain: "plasma", name: "Plasma", eid: 30383, receives: "USDT0" },
  { chain: "xlayer", name: "X Layer", eid: 30274, receives: "USDT0" },
  { chain: "monad", name: "Monad", eid: 30390, receives: "USDT0" },
  { chain: "conflux", name: "Conflux eSpace", eid: 30212, receives: "USDT0" },
  { chain: "flare", name: "Flare", eid: 30295, receives: "USDT0" },
  { chain: "hyperevm", name: "HyperEVM", eid: 30367, receives: "USDT0" },
  { chain: "hedera", name: "Hedera", eid: 30316, receives: "USDT0" },
  { chain: "ink", name: "Ink", eid: 30339, receives: "USDT0" },
  { chain: "mantle", name: "Mantle", eid: 30181, receives: "USDT0" },
  { chain: "megaeth", name: "MegaETH", eid: 30398, receives: "USDT0" },
  { chain: "morph", name: "Morph", eid: 30322, receives: "USDT0" },
  { chain: "rootstock", name: "Rootstock", eid: 30333, receives: "USDT0" },
  { chain: "sei", name: "Sei", eid: 30280, receives: "USDT0" },
  { chain: "stable", name: "Stable", eid: 30396, receives: "USDT0" },
  { chain: "tempo", name: "Tempo", eid: 30401, receives: "USDT0" },
  { chain: "unichain", name: "Unichain", eid: 30320, receives: "USDT0" },
];
const USDT0_NATIVE_FEE = "1.8423117";


function usdt0Quote(to: Usdt0RoutesView["routes"][number], amount: string): Usdt0Quote {
  const sent = bridgedAmount(amount) ?? "0";
  const dust = amt(Math.max(0, num(amount) - num(sent)));
  return {
    to: to.chain,
    eid: to.eid,
    receives: to.receives,
    amount,
    amountSent: sent,
    amountReceived: sent,
    dust,
    feeBps: 0,
    feeAmount: "0",
    nativeFee: USDT0_NATIVE_FEE,
    minAmount: "0.01",
    maxAmount: "1000000",
  };
}

function usdt0Transfer(env: MockEnv, i: number, to: Usdt0RoutesView["routes"][number], amount: string, source: string, recipient: string, status: Usdt0Transfer["status"], createdAt: string): Usdt0Transfer {
  const id = uuid(`${env}:usdt0:${i}`);
  const q = usdt0Quote(to, amount);
  const open = status === "PENDING";
  const sent = status === "SUBMITTED" || status === "DELIVERED" || status === "FAILED";
  const guid = status === "SUBMITTED" || status === "DELIVERED" ? `0x${hex(`${env}:lz:${i}`)}` : null;
  const xdr = fakeXdr(`${env}:usdt0:${i}`);
  return {
    id,
    status,
    network: stellarNetwork(env),
    source,
    to: to.chain,
    eid: to.eid,
    receives: to.receives,
    recipient,
    amount,
    amountSent: q.amountSent,
    amountReceived: q.amountReceived,
    feeBps: q.feeBps,
    feeAmount: q.feeAmount,
    feeWallet: null,
    nativeFee: q.nativeFee,
    xdr: open ? xdr : null,
    uri: open ? sep7Tx(xdr, env) : null,
    qr: open ? qrImage(id) : null,
    txHash: sent ? txHash(`${env}:usdt0:${i}`) : null,
    guid,
    destinationTxHash: status === "DELIVERED" ? evmTxHash(`${env}:usdt0-dest:${i}`) : null,
    scanUrl: guid ? `https://layerzeroscan.com/tx/${guid}` : null,
    expiresAt: minutesAfter(createdAt, 3),
    createdAt,
    updatedAt: open ? createdAt : minutesAfter(createdAt, status === "DELIVERED" ? 2 : 1),
  };
}

/* --- liquidity --- */

function poolId(env: MockEnv, a: StellarAsset, b: StellarAsset): string {
  return hex(`pool:${env}:${a.code}:${a.issuer ?? ""}:${b.code}:${b.issuer ?? ""}`);
}

const reserve = (a: StellarAsset, amount: number): LiquidityReserve => ({ asset: a.code, issuer: a.issuer, amount: amt(amount) });

function makePool(env: MockEnv, a: StellarAsset, b: StellarAsset, amountA: number, amountB: number, trustlines: number): LiquidityPool {
  return {
    id: poolId(env, a, b),
    network: stellarNetwork(env),
    feeBp: 30,
    totalTrustlines: String(trustlines),
    totalShares: amt(Math.sqrt(amountA * amountB)),
    reserves: [reserve(a, amountA), reserve(b, amountB)],
  };
}

function seedPools(env: MockEnv): LiquidityPool[] {
  const s = stellarAssets(env);
  if (env === "prod") {
    const AQUA: StellarAsset = { code: "AQUA", issuer: "GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA" };
    const YXLM: StellarAsset = { code: "yXLM", issuer: "GARDNV3Q7YGT4AKSDF25LT32YSCCW4EV22Y2TV3I2PU2MMXJTEDL5T55" };
    return [
      makePool(env, XLM, s.USDC, 18_420_311.42, 5_710_296.54, 12_904),
      makePool(env, s.USDC, s.EURC, 1_204_993.1, 1_115_734.36, 2_311),
      makePool(env, XLM, s.EURC, 2_301_448.9, 660_601.71, 1_877),
      makePool(env, XLM, s.USDT0, 940_118.33, 291_436.68, 642),
      makePool(env, s.USDC, s.USDT0, 412_090.5, 411_870.12, 388),
      makePool(env, XLM, AQUA, 6_120_455.2, 2_931_008_442.6, 8_930),
      makePool(env, XLM, YXLM, 3_880_120.71, 3_874_904.02, 1_204),
      makePool(env, AQUA, s.USDC, 1_890_440_112.3, 1_253_118.9, 3_412),
    ];
  }
  return [
    makePool(env, XLM, s.USDC, 1_250_000, 387_500.25, 1_532),
    makePool(env, XLM, s.USDB, 640_210.5, 198_465.25, 421),
    makePool(env, s.USDC, s.USDB, 120_400, 120_388.7, 96),
    makePool(env, XLM, { code: "SRT", issuer: "GCDNJUBQSX7AJWLJACMJ7I4BC3Z47BQUTMHEICZLE6MU4KQBRYG5JY6B" }, 82_311.9, 41_155_950, 58),
    makePool(env, XLM, { code: "BTC", issuer: "GAUTUYY2THLF7SGITDFMXJVYH3LHDSMGEAKSBU267M2K7A3W543CKUEF" }, 455_120.3, 1.4623, 37),
    makePool(env, s.USDC, { code: "EURT", issuer: "GAP5LETOV6YIE62YAM56STDANPRDO7ZFDBGSNHJQIYGGKSMOZAHOOS2S" }, 50_210.4, 46_402.85, 22),
  ];
}

function position(pool: LiquidityPool, fraction: number): LiquidityPosition {
  const total = num(pool.totalShares);
  const shares = total * fraction;
  return {
    poolId: pool.id,
    shares: amt(shares),
    totalShares: pool.totalShares,
    shareOfPoolBps: Math.max(1, Math.round(fraction * 10_000)),
    reserves: pool.reserves,
    redeemable: pool.reserves.map((r) => ({ ...r, amount: amt(num(r.amount) * fraction) })),
  };
}

function liquidityOperation(
  env: MockEnv,
  i: number,
  kind: LiquidityOperation["kind"],
  pool: LiquidityPool,
  source: string,
  status: LiquidityOperation["status"],
  createdAt: string,
  sizes: { amountA: number; amountB: number; shares: number | null; slippageBps: number },
): LiquidityOperation {
  const id = uuid(`${env}:liq:${i}`);
  const [ra, rb] = pool.reserves;
  const bps = planBps();
  const price = num(rb.amount) / num(ra.amount);
  const xdr = fakeXdr(`${env}:liq:${i}`);
  const open = status === "PENDING";
  return {
    id,
    kind,
    status,
    network: pool.network,
    source,
    poolId: pool.id,
    assetA: ra.asset,
    assetAIssuer: ra.issuer,
    assetB: rb.asset,
    assetBIssuer: rb.issuer,
    amountA: amt(sizes.amountA),
    amountB: amt(sizes.amountB),
    shares: sizes.shares === null ? null : amt(sizes.shares),
    minPrice: kind === "DEPOSIT" ? amt(price * (1 - sizes.slippageBps / 10_000)) : null,
    maxPrice: kind === "DEPOSIT" ? amt(price * (1 + sizes.slippageBps / 10_000)) : null,
    slippageBps: sizes.slippageBps,
    feeBps: bps,
    feeAmountA: amt((sizes.amountA * bps) / 10_000),
    feeAmountB: amt((sizes.amountB * bps) / 10_000),
    feeWallet: bps > 0 ? stellarAccount("cosmos-liquidity-fees") : null,
    commissionMemo: bps > 0 ? "Cosmos Liquidity Commission" : null,
    xdr,
    uri: sep7Tx(xdr, env),
    txHash: status === "PENDING" || status === "EXPIRED" ? "" : txHash(`${env}:liq:${i}`),
    qr: open ? qrImage(id) : "",
    expiresAt: open || status === "EXPIRED" ? minutesAfter(createdAt, 5) : null,
    createdAt,
    updatedAt: open ? createdAt : minutesAfter(createdAt, 1),
  };
}

/* --- private payments --- */

const ZK_FEE_BPS = 18;
const ZK_DESCRIPTIONS = ["Invoice 1042", "Consulting, October", "Supplier settlement", "Payroll advance", "Annual license", "Private order 77", null, null] as const;

function zkSplitOf(amount: string): { net: string; fee: string } {
  const units = BigInt(Math.round(num(amount) * 1e7));
  const fee = (units * BigInt(ZK_FEE_BPS)) / 10_000n;
  const toXlm = (u: bigint) => amt(Number(u) / 1e7);
  return { net: toXlm(units - fee), fee: toXlm(fee) };
}

function zkFeeAccount(): string {
  return stellarAccount("cosmos-zk-fee-account");
}

function zkPayment(env: MockEnv, i: number, recipient: string, amount: string, status: ZkPayment["status"], createdAt: string, description: string | null, expiresInMinutes = 60): ZkPayment {
  const id = uuid(`${env}:zk:${i}`);
  const split = zkSplitOf(amount);
  const paid = status === "SUCCEEDED";
  return {
    id,
    status,
    network: "testnet",
    tokenContract: stellarContract("cosmos-confidential-xlm"),
    amount,
    netAmount: split.net,
    feeAmount: split.fee,
    feeBps: ZK_FEE_BPS,
    recipient,
    feeAccount: zkFeeAccount(),
    payer: paid ? stellarAccount(`${env}:zk-payer:${i % 6}`) : null,
    paymentTxHash: paid ? txHash(`${env}:zk-pay:${i}`) : null,
    feeTxHash: paid ? txHash(`${env}:zk-fee:${i}`) : null,
    description,
    expiresAt: minutesAfter(createdAt, expiresInMinutes),
    settledAt: paid ? minutesAfter(createdAt, 7) : null,
    createdAt,
    updatedAt: paid ? minutesAfter(createdAt, 7) : createdAt,
  };
}

/* --- the seed --- */

function statusFor<T extends string>(r: Rng, index: number, open: readonly T[], spread: readonly [T, number][]): T {
  if (index < open.length) return open[index];
  let x = r.next();
  for (const [status, p] of spread) {
    if (x < p) return status;
    x -= p;
  }
  return spread[0][0];
}

function seed(env: MockEnv): DefiState {
  const r = rng(`swaps-defi:${env}`);
  const s = stellarAssets(env);
  const swaps: (Swap | ChainSwap)[] = [];

  // Stellar DEX swaps, in both environments.
  const pairs: [StellarAsset, StellarAsset][] =
    env === "prod"
      ? [[XLM, s.USDC], [s.USDC, XLM], [s.USDC, s.EURC], [XLM, s.USDT0], [s.EURC, s.USDC], [s.USDT0, s.USDC], [XLM, s.EURC]]
      : [[XLM, s.USDC], [s.USDC, XLM], [XLM, s.USDB], [s.USDB, s.USDC], [s.USDC, s.USDB]];
  const stellarCount = env === "prod" ? 20 : 30;
  const swapSpread: [Swap["status"], number][] = [["SUCCEEDED", 0.74], ["FAILED", 0.1], ["EXPIRED", 0.16]];
  for (let i = 0; i < stellarCount; i++) {
    const status = statusFor<Swap["status"]>(r, i, ["PENDING", "SUBMITTED"], swapSpread);
    const createdAt = i === 0 ? hoursAgo(0.05) : i === 1 ? hoursAgo(0.2) : hoursAgo(spreadHours(r));
    const [from, to] = r.pick(pairs);
    swaps.push(stellarSwap(env, r, i, from, to, status, createdAt));
  }

  // Jupiter and Kuru Flow swaps: mainnet only.
  if (env === "prod") {
    for (let i = 0; i < 12; i++) {
      const pair = CHAIN_PAIRS[i % CHAIN_PAIRS.length];
      const status = statusFor<Swap["status"]>(r, i, ["PENDING"], swapSpread);
      const createdAt = i === 0 ? hoursAgo(0.03) : hoursAgo(spreadHours(r));
      swaps.push(chainSwap(env, r, i, pair, status, createdAt));
    }
  }

  // NEAR Intents and USDT0: mainnet only.
  const cross: CrossChainSwap[] = [];
  const usdt0: Usdt0Transfer[] = [];
  if (env === "prod") {
    const plan: [string, string, string, string, number][] = [
      ["stellar", "USDC", "solana", "USDC", 850],
      ["solana", "SOL", "stellar", "XLM", 12.5],
      ["eth", "ETH", "stellar", "USDC", 0.42],
      ["stellar", "XLM", "monad", "MON", 4200],
      ["base", "USDC", "stellar", "USDC", 1500],
      ["btc", "BTC", "solana", "USDC", 0.015],
      ["stellar", "USDC", "eth", "USDT", 2300],
      ["arb", "USDC", "stellar", "EURC", 640],
      ["tron", "USDT", "stellar", "USDC", 980],
      ["monad", "USDC", "solana", "SOL", 310],
      ["stellar", "EURC", "base", "USDC", 720],
      ["pol", "USDC", "stellar", "XLM", 260],
    ];
    const order: CrossChainSwap["status"][] = ["AWAITING_DEPOSIT", "DEPOSIT_DETECTED", "PROCESSING", "SUCCEEDED", "SUCCEEDED", "REFUNDED", "SUCCEEDED", "FAILED", "SUCCEEDED", "EXPIRED", "INCOMPLETE_DEPOSIT", "SUCCEEDED"];
    plan.forEach(([oc, os, dc, ds, amount], i) => {
      const origin = ASSETS.find((a) => a.chain === oc && a.symbol === os)!;
      const destination = ASSETS.find((a) => a.chain === dc && a.symbol === ds)!;
      const createdAt = i < 3 ? hoursAgo(0.1 + i * 0.3) : hoursAgo(spreadHours(r));
      cross.push(
        crossSwap(env, i, {
          origin,
          destination,
          amount: amt(amount, Math.min(origin.decimals, 8)),
          recipient: dc === "stellar" ? r.pick(orgStellarAccounts()) : addressFor(dc, `${env}:cross-recipient:${i}`),
          refundTo: oc === "stellar" ? r.pick(orgStellarAccounts()) : addressFor(oc, `${env}:cross-refund:${i}`),
          slippageBps: 100,
        }, order[i], createdAt),
      );
    });

    const statuses: Usdt0Transfer["status"][] = ["PENDING", "SUBMITTED", "DELIVERED", "DELIVERED", "FAILED", "DELIVERED", "EXPIRED", "DELIVERED"];
    statuses.forEach((status, i) => {
      const to = USDT0_ROUTES[[0, 1, 0, 7, 2, 3, 5, 1][i]];
      const createdAt = i < 2 ? hoursAgo(0.05 + i * 0.1) : hoursAgo(spreadHours(r));
      usdt0.push(usdt0Transfer(env, i, to, r.amount(50, 5000, 2), r.pick(orgStellarAccounts()), evmAddress(`${env}:usdt0-recipient:${i % 3}`), status, createdAt));
    });
  }

  // Liquidity: pools, the organization's positions, its operations.
  const pools = seedPools(env);
  const [main, fees] = orgStellarAccounts();
  const positions: Record<string, LiquidityPosition[]> = {
    [main]: [position(pools[0], 0.0042), position(pools[1], 0.0185), ...(env === "prod" ? [position(pools[4], 0.061)] : [])],
    [fees]: [position(pools[env === "prod" ? 3 : 2], 0.0091)],
  };
  const operations: LiquidityOperation[] = [];
  const opSpread: [LiquidityOperation["status"], number][] = [["SUCCEEDED", 0.78], ["FAILED", 0.08], ["EXPIRED", 0.14]];
  for (let i = 0; i < 16; i++) {
    const pool = pools[i % (env === "prod" ? 5 : 3)];
    const kind: LiquidityOperation["kind"] = i % 4 === 3 ? "WITHDRAW" : "DEPOSIT";
    const status = statusFor<LiquidityOperation["status"]>(r, i, ["PENDING", "SUBMITTED"], opSpread);
    const createdAt = i === 0 ? hoursAgo(0.08) : i === 1 ? hoursAgo(0.25) : hoursAgo(spreadHours(r));
    const [ra, rb] = pool.reserves;
    const amountA = num(r.amount(100, 12_000, 2));
    const amountB = (amountA * num(rb.amount)) / num(ra.amount);
    const shares = Math.sqrt(amountA * amountB);
    operations.push(
      liquidityOperation(env, i, kind, pool, i % 3 === 2 ? fees : main, status, createdAt, {
        amountA: kind === "WITHDRAW" ? amountA * 0.99 : amountA,
        amountB: kind === "WITHDRAW" ? amountB * 0.99 : amountB,
        shares: kind === "WITHDRAW" || status === "SUCCEEDED" ? shares : null,
        slippageBps: 100,
      }),
    );
  }

  // Private payments: testnet only.
  const zk: ZkPayment[] = [];
  if (env === "dev") {
    const recipients = mockCustomerSeeds(env).flatMap((c) => c.wallets.filter((w) => w.chain === "stellar").map((w) => w.address));
    const zkSpread: [ZkPayment["status"], number][] = [["SUCCEEDED", 0.7], ["EXPIRED", 0.3]];
    for (let i = 0; i < 20; i++) {
      const status = statusFor<ZkPayment["status"]>(r, i, ["PENDING", "PENDING", "PENDING"], zkSpread);
      const createdAt = i < 3 ? hoursAgo(0.1 + i * 0.4) : hoursAgo(spreadHours(r));
      zk.push(zkPayment(env, i, r.pick(recipients), r.amount(5, 4000, 2), status, createdAt, r.pick(ZK_DESCRIPTIONS), i < 3 ? 24 * 60 : 60));
    }
  }

  const newest = <T extends { createdAt: string }>(list: T[]) => list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return {
    swaps: newest(swaps),
    cross: newest(cross),
    usdt0: newest(usdt0),
    pools,
    positions,
    operations: newest(operations),
    zk: newest(zk),
    submittedAt: {},
  };
}

/** The environment's records, with every record handed a signed transaction moved on by time. */
function state(env: MockEnv): DefiState {
  const st = mockEnvStore("swaps-defi", env, seed);
  const now = Date.now();
  const since = (id: string) => (st.submittedAt[id] ? now - st.submittedAt[id] : -1);
  for (const s of st.swaps) {
    if (s.status === "SUBMITTED" && since(s.id) > 4000) {
      s.status = "SUCCEEDED";
      s.updatedAt = nowIso();
    }
  }
  for (const o of st.operations) {
    if (o.status === "SUBMITTED" && since(o.id) > 4000) {
      o.status = "SUCCEEDED";
      if (!o.shares) o.shares = amt(Math.sqrt(num(o.amountA) * num(o.amountB)));
      o.updatedAt = nowIso();
    }
  }
  for (const u of st.usdt0) {
    if (u.status === "SUBMITTED" && since(u.id) > 12_000) {
      u.status = "DELIVERED";
      u.destinationTxHash = evmTxHash(`delivered:${u.id}`);
      u.updatedAt = nowIso();
    }
  }
  for (const x of st.cross) {
    const t = since(x.id);
    if (t < 0) continue;
    const next: CrossChainSwap["status"] = t > 15_000 ? "SUCCEEDED" : t > 8000 ? "PROCESSING" : t > 3000 ? "DEPOSIT_DETECTED" : x.status;
    if (next === x.status) continue;
    x.status = next;
    x.providerStatus = PROVIDER_STATUS[next];
    x.updatedAt = nowIso();
    if (next === "SUCCEEDED") {
      x.amountOut = x.amountOutEstimated;
      const out = hashFor(x.destinationChain, `out:${x.id}`);
      x.destinationTxHashes = [{ hash: out, explorerUrl: explorerFor(x.destinationChain, out) }];
    }
  }
  return st;
}

/* ------------------------------------------------------------------ request helpers */

function requireOrg(req: MockRequest): Response | null {
  return req.org ? null : badRequest("An organization is required");
}

/** The organization of a create body (`org` in the body, as the real routes read it), else the query's. */
const orgOf = (req: MockRequest): string | null => str(req.body, "org") || req.org;

function bodyOrg(req: MockRequest): Response | null {
  return orgOf(req) ? null : badRequest("An organization is required");
}

/** The environment a create body names (`environment`), else the query's. */
const bodyEnv = (req: MockRequest): MockEnv => (str(req.body, "environment") === "prod" ? "prod" : str(req.body, "environment") === "dev" ? "dev" : req.env);

const positiveAmount = (v: string | undefined) => !!v && /^\d+(\.\d+)?$/.test(v.trim()) && num(v) > 0;

const byStatus = <T extends { status: string }>(rows: T[], url: URL) => {
  const status = url.searchParams.get("status");
  return status ? rows.filter((r) => r.status === status) : rows;
};


/* ------------------------------------------------------------------ swaps */



/* Every swap call is the real gateway's (src/lib/mock/real-swaps.ts): never sample quotes, records
   or transactions. The lists hold the swaps opened here, nothing sampled. */
const swapRoutes: MockRoute[] = [
  route("GET", "/api/swaps", (req) => {
    const denied = requireOrg(req);
    if (denied) return denied;
    const chain = req.url.searchParams.get("chain") || "stellar";
    return realList(req, "swaps", (s) => (chain === "stellar" ? !s.chain || s.chain === "stellar" : s.chain === chain));
  }),

  route("POST", "/api/swaps/quote", (req) => bodyOrg(req) ?? realSwap(req, "swaps/quote")),

  route("POST", "/api/swaps", (req) => bodyOrg(req) ?? realSwap(req, "swaps", { opens: "swaps" })),

  route("GET", "/api/swaps/:id", (req) => requireOrg(req) ?? realSwap(req, recordPath("swaps", req.params.id), { record: req.params.id, kind: "swaps" })),

  route("POST", "/api/swaps/:id/submit", (req) => requireOrg(req) ?? realSwap(req, recordPath("swaps", req.params.id, "submit"), { record: req.params.id })),
];

/* ------------------------------------------------------------------ cross-chain swaps */


const crossRoutes: MockRoute[] = [
  route("GET", "/api/cross-chain-swaps/assets", (req) => requireOrg(req) ?? realSwap(req, "cross-chain-swaps/assets")),

  route("POST", "/api/cross-chain-swaps/quote", (req) => bodyOrg(req) ?? realSwap(req, "cross-chain-swaps/quote")),

  route("GET", "/api/cross-chain-swaps", (req) => requireOrg(req) ?? realList(req, "cross")),

  route("POST", "/api/cross-chain-swaps", (req) => bodyOrg(req) ?? realSwap(req, "cross-chain-swaps", { opens: "cross" })),

  route("GET", "/api/cross-chain-swaps/:id", (req) => requireOrg(req) ?? realSwap(req, recordPath("cross", req.params.id), { record: req.params.id, kind: "cross" })),

  route("POST", "/api/cross-chain-swaps/:id/deposit", (req) => requireOrg(req) ?? realSwap(req, recordPath("cross", req.params.id, "deposit"), { record: req.params.id })),
];

/* ------------------------------------------------------------------ USDT0 */

const usdt0Routes_: MockRoute[] = [
  route("GET", "/api/usdt0/routes", (req) => requireOrg(req) ?? realSwap(req, "usdt0/routes")),

  route("POST", "/api/usdt0/quote", (req) => bodyOrg(req) ?? realSwap(req, "usdt0/quote")),

  route("GET", "/api/usdt0/transfers", (req) => requireOrg(req) ?? realList(req, "usdt0")),

  route("POST", "/api/usdt0/transfers", (req) => bodyOrg(req) ?? realSwap(req, "usdt0/transfers", { opens: "usdt0" })),

  route("GET", "/api/usdt0/transfers/:id", (req) => requireOrg(req) ?? realSwap(req, recordPath("usdt0", req.params.id), { record: req.params.id, kind: "usdt0" })),

  route("POST", "/api/usdt0/transfers/:id/submit", (req) => requireOrg(req) ?? realSwap(req, recordPath("usdt0", req.params.id, "submit"), { record: req.params.id })),
];

/* ------------------------------------------------------------------ liquidity */

function poolHas(pool: LiquidityPool, a: StellarAsset | null): boolean {
  return !a || pool.reserves.some((r) => sameAsset(r, a));
}

const liquidityRoutes: MockRoute[] = [
  route("GET", "/api/liquidity/pools", (req) => {
    const denied = requireOrg(req);
    if (denied) return denied;
    const p = req.url.searchParams;
    const a = p.get("assetACode") ? assetFromBody(p.get("assetACode") ?? undefined, p.get("assetAIssuer") ?? undefined, req.env) : null;
    const b = p.get("assetBCode") ? assetFromBody(p.get("assetBCode") ?? undefined, p.get("assetBIssuer") ?? undefined, req.env) : null;
    if ((p.get("assetACode") && !a) || (p.get("assetBCode") && !b)) return badRequest("A non-native asset needs its issuer");
    const st = state(req.env);
    const account = p.get("account");
    const held = account ? new Set((st.positions[account] ?? []).map((x) => x.poolId)) : null;
    const limit = Math.min(200, Math.max(1, Math.trunc(Number(p.get("limit"))) || 10));
    const rows = st.pools.filter((pool) => poolHas(pool, a) && poolHas(pool, b) && (!held || held.has(pool.id)));
    return ok({ data: rows.slice(0, limit), cursor: rows.length > limit ? rows[limit - 1].id : null }, "Liquidity pools fetched successfully");
  }),

  route("GET", "/api/liquidity/pools/:id", (req) => {
    const denied = requireOrg(req);
    if (denied) return denied;
    const pool = state(req.env).pools.find((x) => x.id === req.params.id);
    return pool ? ok(pool, "Liquidity pool fetched successfully") : notFound("Liquidity pool not found");
  }),

  route("GET", "/api/liquidity/positions", (req) => {
    const denied = requireOrg(req);
    if (denied) return denied;
    const account = req.url.searchParams.get("account");
    if (!account || !/^G[A-Z2-7]{55}$/.test(account)) return badRequest("A valid Stellar account (G…) is required");
    return ok({ account, network: stellarNetwork(req.env), data: state(req.env).positions[account] ?? [] }, "Liquidity positions fetched successfully");
  }),

  route("POST", "/api/liquidity/deposit", (req) => {
    const denied = bodyOrg(req);
    if (denied) return denied;
    const env = bodyEnv(req);
    const source = str(req.body, "source");
    if (!source || !/^G[A-Z2-7]{55}$/.test(source)) return badRequest("source must be a Stellar account (G...)");
    const maxA = str(req.body, "maxAmountA");
    if (!positiveAmount(maxA)) return badRequest("maxAmountA must be a positive number");
    const a = str(req.body, "assetACode") ? assetFromBody(str(req.body, "assetACode"), str(req.body, "assetAIssuer"), env) : XLM;
    const b = str(req.body, "assetBCode") ? assetFromBody(str(req.body, "assetBCode"), str(req.body, "assetBIssuer"), env) : stellarAssets(env).USDC;
    if (!a || !b) return badRequest("A non-native asset needs its issuer");
    if (a.code === b.code && a.issuer === b.issuer) return badRequest("A pool needs two different assets");
    const st = state(env);
    let pool = st.pools.find((x) => poolHas(x, a) && poolHas(x, b));
    const maxB = str(req.body, "maxAmountB");
    if (!pool) {
      // The first deposit creates the pool, at the price the two amounts set.
      const amountB = positiveAmount(maxB) ? num(maxB) : (num(maxA) * priceOf(labelOf(a))) / priceOf(labelOf(b));
      pool = makePool(env, a, b, num(maxA), amountB, 1);
      st.pools.push(pool);
    }
    const [ra, rb] = pool.reserves;
    const aFirst = sameAsset(ra, a);
    const ratio = num(rb.amount) / num(ra.amount);
    const amountA = aFirst ? num(maxA) : positiveAmount(maxB) ? num(maxB) : num(maxA) / ratio;
    const amountB = aFirst ? (positiveAmount(maxB) ? num(maxB) : num(maxA) * ratio) : num(maxA);
    const op = liquidityOperation(env, 1000 + st.operations.length, "DEPOSIT", pool, source, "PENDING", nowIso(), {
      amountA,
      amountB,
      shares: null,
      slippageBps: Math.trunc(num(req.body?.slippageBps)) || 100,
    });
    st.operations.unshift(op);
    return created(op, "Liquidity deposit created successfully");
  }),

  route("POST", "/api/liquidity/withdraw", (req) => {
    const denied = bodyOrg(req);
    if (denied) return denied;
    const env = bodyEnv(req);
    const source = str(req.body, "source");
    if (!source || !/^G[A-Z2-7]{55}$/.test(source)) return badRequest("source must be a Stellar account (G...)");
    const shares = str(req.body, "shares");
    if (!positiveAmount(shares)) return badRequest("shares must be a positive number");
    const st = state(env);
    const pool = st.pools.find((x) => x.id === str(req.body, "poolId"));
    if (!pool) return notFound("Liquidity pool not found");
    const fraction = Math.min(1, num(shares) / num(pool.totalShares));
    const slippageBps = Math.trunc(num(req.body?.slippageBps)) || 100;
    const [ra, rb] = pool.reserves;
    const op = liquidityOperation(env, 1000 + st.operations.length, "WITHDRAW", pool, source, "PENDING", nowIso(), {
      amountA: num(ra.amount) * fraction * (1 - slippageBps / 10_000),
      amountB: num(rb.amount) * fraction * (1 - slippageBps / 10_000),
      shares: num(shares),
      slippageBps,
    });
    st.operations.unshift(op);
    return created(op, "Liquidity withdrawal created successfully");
  }),

  route("GET", "/api/liquidity/operations", (req) => {
    const denied = requireOrg(req);
    if (denied) return denied;
    const kind = req.url.searchParams.get("kind");
    const rows = byStatus(state(req.env).operations, req.url).filter((o) => !kind || o.kind === kind);
    return ok(page(rows, req.url), "Liquidity operations fetched successfully");
  }),

  route("GET", "/api/liquidity/operations/:id", (req) => {
    const denied = requireOrg(req);
    if (denied) return denied;
    const op = state(req.env).operations.find((o) => o.id === req.params.id);
    return op ? ok(op, "Liquidity operation fetched successfully") : notFound("Liquidity operation not found");
  }),

  route("POST", "/api/liquidity/operations/:id/submit", (req) => {
    const denied = requireOrg(req);
    if (denied) return denied;
    const st = state(req.env);
    const op = st.operations.find((o) => o.id === req.params.id);
    if (!op) return notFound("Liquidity operation not found");
    const signed = str(req.body, "signedXdr");
    if (!signed || !signed.trim()) return badRequest("signedXdr is required");
    if (op.status !== "PENDING") return ok({ submitted: false, status: op.status, reason: `The operation is ${op.status.toLowerCase()}`, operation: op }, "Liquidity operation submitted");
    op.status = "SUBMITTED";
    op.txHash = txHash(`liq-submit:${op.id}`);
    op.qr = "";
    op.updatedAt = nowIso();
    st.submittedAt[op.id] = Date.now();
    return ok({ submitted: true, status: op.status, txHash: op.txHash, operation: op }, "Liquidity operation submitted");
  }),
];

/* ------------------------------------------------------------------ private (ZK) payments */

function zkConfig(): ZkConfig {
  return {
    enabled: true,
    network: "testnet",
    rpcUrl: "https://soroban-testnet.stellar.org",
    networkPassphrase: TESTNET_PASSPHRASE,
    token: { contractId: stellarContract("cosmos-confidential-xlm"), symbol: "CXLM", decimals: 7, underlying: stellarContract("xlm-sac-testnet"), deployedAtLedger: 1_402_118 },
    verifier: stellarContract("cosmos-zk-verifier"),
    auditorRegistry: stellarContract("cosmos-zk-auditors"),
    auditorId: 1,
    feeBps: ZK_FEE_BPS,
    feeAccount: zkFeeAccount(),
  };
}

const zkUnavailable = () =>
  new Response(JSON.stringify({ data: null, code: 503, status: "bad_request", message: "Private payments are not available on this network" }), {
    status: 503,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });

const zkRoutes: MockRoute[] = [
  route("GET", "/api/zk-payments/config", (req) => {
    const denied = requireOrg(req);
    if (denied) return denied;
    return req.env === "prod" ? zkUnavailable() : ok(zkConfig(), "Private payments configuration fetched successfully");
  }),

  route("GET", "/api/zk-payments", (req) => {
    const denied = requireOrg(req);
    if (denied) return denied;
    return ok(page(byStatus(state(req.env).zk, req.url), req.url), "Private payments fetched successfully");
  }),

  route("POST", "/api/zk-payments", (req) => {
    const denied = bodyOrg(req);
    if (denied) return denied;
    const env = bodyEnv(req);
    if (env === "prod") return zkUnavailable();
    const amount = str(req.body, "amount");
    if (!amount || !/^\d+(\.\d{1,7})?$/.test(amount.trim()) || num(amount) <= 0) return badRequest("amount must be a positive number with at most 7 decimals");
    const customerId = str(req.body, "customerId");
    const recipient = str(req.body, "recipient");
    if (!customerId || !recipient) return badRequest("customerId and recipient are required");
    const customer = mockCustomerSeeds(env).find((c) => c.id === customerId);
    if (!customer || !customer.wallets.some((w) => w.chain === "stellar" && w.address === recipient.trim())) {
      return badRequest("The receiving account must be a Stellar wallet of one of the organization's customers.");
    }
    const st = state(env);
    const minutes = Math.trunc(num(req.body?.expiresInMinutes)) || 60;
    const payment = zkPayment(env, 1000 + st.zk.length, recipient.trim(), amount.trim(), "PENDING", nowIso(), str(req.body, "description") ?? null, minutes);
    st.zk.unshift(payment);
    return created(payment, "Private payment created successfully");
  }),

  route("GET", "/api/zk-payments/:id", (req) => {
    const denied = requireOrg(req);
    if (denied) return denied;
    const payment = state(req.env).zk.find((p) => p.id === req.params.id);
    return payment ? ok(payment, "Private payment fetched successfully") : notFound("Private payment not found");
  }),
];

export const routes: MockRoute[] = [...swapRoutes, ...crossRoutes, ...usdt0Routes_, ...liquidityRoutes, ...zkRoutes];
