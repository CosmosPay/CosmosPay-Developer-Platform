/* The swap form's tokens and routes, as pure functions (unit-tested).

   The catalogue joins two sources. NEAR Intents lists what it can swap between chains (every
   network the Payments API validates, mainnet assets). Stellar, Solana and Monad also have
   their own market for swaps within the chain (the Stellar DEX, Jupiter, Kuru Flow): Stellar's
   in both environments (testnet in the sandbox, with the environment's standard assets), Solana's
   and Monad's on mainnet only. A token records whether each route can take it.

   A pair's route: on one of those three chains, both tokens on its market; between chains, or
   within any other chain, NEAR Intents, both tokens listed there. The Payments API refuses NEAR
   Intents within Stellar, Solana or Monad (their market settles it), so neither does this.
   USDT0 on Stellar to USDT or USDT0 on a network LayerZero's OFT reaches (src/lib/usdt0.ts) goes
   through the OFT instead: 1:1, no slippage, LayerZero's fee in XLM. Its destinations join the
   catalogue, and a network NEAR Intents does not list gets its USDT0 as a token of its own. */
import { CHAIN_NAMES, NATIVE_CODES, NATIVE_DECIMALS, TOKEN_PRESETS, isChain, networkName, type Chain, type Tier } from "@/lib/chains";
import { standardAssets } from "@/lib/stellar-assets";
import { isUsdt0OnStellar, type Usdt0Route } from "@/lib/usdt0";

/* What GET /api/cross-chain-swaps/assets lists: one NEAR Intents token. */
export interface NearAsset {
  chain: string;
  chainName?: string;
  symbol: string;
  assetId: string;
  decimals: number;
  contract: string | null;
  priceUsd?: number | null;
}

export interface SwapToken {
  /** Unique in the catalogue: chain, symbol and issuer / mint / contract. */
  key: string;
  chain: string;
  chainName: string;
  symbol: string;
  /** Stellar issuer, SPL mint or contract; null for the chain's coin. */
  contract: string | null;
  /** Who issues it, where the catalogue knows (Stellar's standard assets). */
  issuerName: string | null;
  decimals: number | null;
  /** Indicative USD price from NEAR Intents' list, for an estimate before a quote. */
  priceUsd: number | null;
  /** How a NEAR Intents quote names it; null when NEAR Intents does not list it. */
  near: string | null;
  /** Tradable on its chain's own market in this environment. */
  dex: boolean;
  /** Reached from Stellar's USDT0 through LayerZero's OFT (USDT on Ethereum, USDT0 elsewhere). */
  usdt0?: boolean;
}

/* The chains with their own market for swaps within the chain. */
export const DEX_CHAINS: readonly Chain[] = ["stellar", "solana", "monad"];
const hasDex = (chain: string): chain is Chain => isChain(chain);

/* NEAR Intents' spelling of an asset: a Stellar token as CODE:ISSUER, else its contract, or the
   coin's symbol. */
export const nearValue = (a: Pick<NearAsset, "chain" | "symbol" | "contract">) =>
  a.contract && a.chain === "stellar" ? `${a.symbol}:${a.contract}` : a.contract || a.symbol;

const caseless = (chain: string) => chain !== "stellar" && chain !== "solana";
const sameContract = (chain: string, a: string | null, b: string | null) =>
  a === null || b === null ? a === b : caseless(chain) ? a.toLowerCase() === b.toLowerCase() : a === b;
const keyOf = (chain: string, symbol: string, contract: string | null) => `${chain}:${symbol}:${contract ?? ""}`;
const chainNameOf = (chain: string, listed?: string) => listed || (isChain(chain) ? CHAIN_NAMES[chain] : chain.toUpperCase());

function fromNear(a: NearAsset, dex: boolean): SwapToken {
  return {
    key: keyOf(a.chain, a.symbol, a.contract),
    chain: a.chain,
    chainName: chainNameOf(a.chain, a.chainName),
    symbol: a.symbol,
    contract: a.contract,
    issuerName: null,
    decimals: a.decimals,
    priceUsd: a.priceUsd ?? null,
    near: nearValue(a),
    dex,
  };
}

/* The tokens the form offers in this environment. */
export function buildCatalog(near: readonly NearAsset[], tier: Tier, usdt0Routes: readonly Usdt0Route[] = []): SwapToken[] {
  const out: SwapToken[] = [];
  const onChain = (chain: string) => near.filter((a) => a.chain === chain);
  const uniqueSymbol = (list: readonly NearAsset[], symbol: string) => {
    const found = list.filter((a) => a.symbol.toUpperCase() === symbol.toUpperCase());
    return found.length === 1 ? found[0] : null;
  };

  // Stellar: the environment's standard assets trade on the DEX. NEAR Intents lists mainnet
  // assets, so in the sandbox an asset reaches it by symbol (a dry quote prices it), and the
  // mainnet-only listings are left out: their issuers do not exist on testnet.
  const nearStellar = onChain("stellar");
  for (const s of standardAssets(tier)) {
    const exact = nearStellar.find((a) => sameContract("stellar", a.contract, s.issuer));
    const match = exact || (tier === "testnet" ? uniqueSymbol(nearStellar, s.code) : null);
    out.push({
      key: keyOf("stellar", s.code, s.issuer),
      chain: "stellar",
      chainName: CHAIN_NAMES.stellar,
      symbol: s.code,
      contract: s.issuer,
      issuerName: s.issuerName,
      decimals: NATIVE_DECIMALS.stellar,
      priceUsd: match?.priceUsd ?? null,
      near: match ? (exact && tier === "public" ? nearValue(match) : match.symbol) : null,
      dex: true,
    });
  }
  if (tier === "public") {
    for (const a of nearStellar) if (!out.some((t) => t.chain === "stellar" && sameContract("stellar", t.contract, a.contract))) out.push(fromNear(a, true));
  }

  // Solana and Monad: their markets are mainnet only. On mainnet the verified presets join NEAR
  // Intents' list; in the sandbox only NEAR Intents' list (quotes, not markets) applies.
  for (const chain of ["solana", "monad"] as const) {
    const listed = onChain(chain);
    const dex = tier === "public";
    if (dex) {
      const coin = listed.find((a) => !a.contract);
      out.push({
        key: keyOf(chain, NATIVE_CODES[chain], null), chain, chainName: CHAIN_NAMES[chain], symbol: NATIVE_CODES[chain], contract: null,
        issuerName: null, decimals: NATIVE_DECIMALS[chain], priceUsd: coin?.priceUsd ?? null, near: coin ? nearValue(coin) : null, dex,
      });
      for (const p of TOKEN_PRESETS[chain].public) {
        const match = listed.find((a) => sameContract(chain, a.contract, p.issuer));
        out.push({
          key: keyOf(chain, p.code, p.issuer), chain, chainName: CHAIN_NAMES[chain], symbol: p.code, contract: p.issuer,
          issuerName: null, decimals: p.decimals, priceUsd: match?.priceUsd ?? null, near: match ? nearValue(match) : null, dex,
        });
      }
    }
    for (const a of listed) if (!out.some((t) => t.chain === chain && sameContract(chain, t.contract, a.contract))) out.push(fromNear(a, dex));
  }

  // Every other network: NEAR Intents only.
  for (const a of near) if (!hasDex(a.chain)) out.push(fromNear(a, false));

  // USDT0's destinations, on mainnet: the network's listed USDT / USDT0 when NEAR Intents has it
  // (the same token, now reachable both ways), else USDT0 as a token of its own.
  if (tier === "public") {
    for (const r of usdt0Routes) {
      const listed = out.filter((t) => t.chain === r.chain && ["USDT", "USDT0"].includes(t.symbol.toUpperCase()));
      if (listed.length) {
        for (const t of listed) t.usdt0 = true;
      } else {
        out.push({
          key: keyOf(r.chain, r.receives, "oft"), chain: r.chain, chainName: r.name || networkName(r.chain), symbol: r.receives, contract: null,
          issuerName: "Tether", decimals: 6, priceUsd: 1, near: null, dex: false, usdt0: true,
        });
      }
    }
  }
  return out;
}

export type Route =
  | { kind: "dex"; chain: Chain }
  | { kind: "near" }
  | { kind: "usdt0"; chain: string }
  | { kind: "none"; reason: "same-token" | "production-only" | "unsupported" };

/* How a pair is swapped in this environment, or why it cannot be. */
export function routeFor(from: SwapToken, to: SwapToken, tier: Tier): Route {
  if (from.key === to.key) return { kind: "none", reason: "same-token" };
  // Stellar's USDT0 out through the OFT, ahead of NEAR Intents: 1:1, and to networks it lists too.
  if (isUsdt0OnStellar(from) && to.usdt0 && to.chain !== "stellar") return { kind: "usdt0", chain: to.chain };
  if (from.chain === to.chain && hasDex(from.chain)) {
    if (from.dex && to.dex) return { kind: "dex", chain: from.chain };
    // Solana's and Monad's markets exist on mainnet only.
    return { kind: "none", reason: tier === "testnet" && from.chain !== "stellar" ? "production-only" : "unsupported" };
  }
  if (from.near && to.near) return { kind: "near" };
  return { kind: "none", reason: "unsupported" };
}

/* An indicative amount out from the listed USD prices, before a quote; null without both. */
export function estimateOut(amountIn: string, from: SwapToken, to: SwapToken): number | null {
  const n = Number(amountIn);
  if (!Number.isFinite(n) || n <= 0 || !from.priceUsd || !to.priceUsd) return null;
  return (n * from.priceUsd) / to.priceUsd;
}

/* An amount the token can carry: a positive decimal within its decimals (Stellar's 7). */
export function amountFits(amount: string, token: SwapToken | null): boolean {
  if (!/^\d+(\.\d+)?$/.test(amount.trim()) || !(Number(amount) > 0)) return false;
  const places = amount.trim().split(".")[1]?.length ?? 0;
  return places <= (token?.decimals ?? 18);
}

/* Search across symbol, network, issuer and address; every word must match. */
export function tokenMatches(t: SwapToken, query: string): boolean {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const hay = `${t.symbol} ${t.chainName} ${t.chain} ${t.issuerName ?? ""} ${t.contract ?? ""}`.toLowerCase();
  return words.every((w) => hay.includes(w));
}

/* The order the picker lists tokens in: by network (ours first, then the largest, then by name),
   and within a network the coin, the big stablecoins, then by symbol. */
const POPULAR = ["USDC", "USDT", "USDT0", "EURC"];
const NETWORK_ORDER = ["stellar", "solana", "monad", "eth", "btc", "base", "arb", "op", "bsc", "pol", "avax", "near", "ton", "tron", "sui", "xrp"];
export function networkRank(chain: string): number {
  const i = NETWORK_ORDER.indexOf(chain);
  return i < 0 ? NETWORK_ORDER.length : i;
}
export function tokenRank(t: SwapToken): number {
  if (!t.contract && !t.usdt0) return 0;
  const i = POPULAR.indexOf(t.symbol.toUpperCase());
  return i >= 0 ? 1 + i : 10;
}
export function sortTokens(list: readonly SwapToken[]): SwapToken[] {
  return [...list].sort((a, b) => networkRank(a.chain) - networkRank(b.chain) || a.chainName.localeCompare(b.chainName) || tokenRank(a) - tokenRank(b) || a.symbol.localeCompare(b.symbol));
}
