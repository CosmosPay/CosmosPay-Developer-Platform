/* The chains Cosmos Pay settles on, in one place for every screen, route and script that
   names them: display names, native coins, what an address looks like, the tokens offered as
   presets and the explorers. The Payments API stays the authority (it checks checksums, mints
   and contracts); these are its shapes, checked early. Pure, so it is unit-tested. */

export const CHAINS = ["stellar", "solana", "monad"] as const;
export type Chain = (typeof CHAINS)[number];
/* The Payments API reports every chain's network in one vocabulary: public or testnet. */
export type Tier = "public" | "testnet";

export const CHAIN_NAMES: Record<Chain, string> = { stellar: "Stellar", solana: "Solana", monad: "Monad" };
export const NATIVE_CODES: Record<Chain, string> = { stellar: "XLM", solana: "SOL", monad: "MON" };
export const NATIVE_DECIMALS: Record<Chain, number> = { stellar: 7, solana: 9, monad: 18 };
/* What each chain calls its test network (the sandbox), by its own name. */
export const TEST_NETWORKS: Record<Chain, string> = { stellar: "Testnet", solana: "Devnet", monad: "Testnet" };

export function isChain(value: unknown): value is Chain {
  return typeof value === "string" && (CHAINS as readonly string[]).includes(value);
}

/* "public" for a mainnet, whatever the chain calls it; anything else is the test network. */
export function tierOf(network: string | null | undefined): Tier {
  return network === "public" || network === "mainnet" || network === "mainnet-beta" ? "public" : "testnet";
}

/* An account (and a token's issuer, mint or contract, which share the shape) per chain. */
export const ADDRESS_PATTERNS: Record<Chain, RegExp> = {
  stellar: /^G[A-Z2-7]{55}$/,
  solana: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
  monad: /^0x[0-9a-fA-F]{40}$/,
};
export const ADDRESS_MESSAGES: Record<Chain, string> = {
  stellar: "Must be a valid Stellar public key (G...56 chars).",
  solana: "Must be a valid Solana address (base58).",
  monad: "Must be a valid Monad (EVM) address (0x + 40 hex).",
};
export const ADDRESS_PLACEHOLDERS: Record<Chain, string> = { stellar: "G…", solana: "Base58…", monad: "0x…" };

export function isAddress(chain: Chain, value: string): boolean {
  return ADDRESS_PATTERNS[chain].test(value.trim());
}

/* Tokens offered by name on Solana and Monad (Stellar's are in stellar-assets.ts). Mainnet
   contracts are the ones NEAR Intents lists; Solana devnet's USDC is Circle's mint, checked
   on-chain. Monad's test network has no USDC we can vouch for, so it offers none. */
export interface TokenPreset {
  code: string;
  issuer: string;
  decimals: number;
}
export const TOKEN_PRESETS: Record<Exclude<Chain, "stellar">, Record<Tier, TokenPreset[]>> = {
  solana: {
    public: [{ code: "USDC", issuer: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", decimals: 6 }],
    testnet: [{ code: "USDC", issuer: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU", decimals: 6 }],
  },
  monad: {
    public: [{ code: "USDC", issuer: "0x754704bc059f8c67012fed69bc8a327a5aafb603", decimals: 6 }],
    testnet: [],
  },
};

/* Explorers, the same ones the wallet links. A hash or address is checked against the chain's
   alphabet first, so a crafted value can't turn into a different URL. */
const TX_HASH: Record<Chain, RegExp> = {
  stellar: /^[0-9a-f]{64}$/i,
  solana: /^[1-9A-HJ-NP-Za-km-z]{43,90}$/,
  monad: /^0x[0-9a-f]{64}$/i,
};
const EXPLORER_TX: Record<Chain, Record<Tier, (hash: string) => string>> = {
  stellar: {
    public: (h) => `https://stellar.expert/explorer/public/tx/${h}`,
    testnet: (h) => `https://stellar.expert/explorer/testnet/tx/${h}`,
  },
  solana: {
    public: (h) => `https://solscan.io/tx/${h}`,
    testnet: (h) => `https://explorer.solana.com/tx/${h}?cluster=devnet`,
  },
  monad: {
    public: (h) => `https://monadscan.com/tx/${h}`,
    testnet: (h) => `https://testnet.monadexplorer.com/tx/${h}`,
  },
};
const EXPLORER_ACCOUNT: Record<Chain, Record<Tier, (address: string) => string>> = {
  stellar: {
    public: (a) => `https://stellar.expert/explorer/public/account/${a}`,
    testnet: (a) => `https://stellar.expert/explorer/testnet/account/${a}`,
  },
  solana: {
    public: (a) => `https://solscan.io/account/${a}`,
    testnet: (a) => `https://explorer.solana.com/address/${a}?cluster=devnet`,
  },
  monad: {
    public: (a) => `https://monadscan.com/address/${a}`,
    testnet: (a) => `https://testnet.monadexplorer.com/address/${a}`,
  },
};

export function explorerTxUrl(chain: Chain, tier: Tier, hash: string | null | undefined): string | null {
  if (!hash || !TX_HASH[chain].test(hash)) return null;
  return EXPLORER_TX[chain][tier](hash);
}

export function explorerAccountUrl(chain: Chain, tier: Tier, address: string | null | undefined): string | null {
  if (!address || !isAddress(chain, address)) return null;
  return EXPLORER_ACCOUNT[chain][tier](address.trim());
}

/* An asset as a person reads it: the chain's coin for "native" (or nothing), a code before
   its issuer, and a long mint or contract shortened. */
export function assetLabel(chain: Chain, asset: string | null | undefined): string {
  if (!asset || asset === "native") return NATIVE_CODES[chain];
  const code = asset.split(":")[0];
  return code.length > 12 ? `${code.slice(0, 4)}…${code.slice(-4)}` : code;
}

/* Every network cross-chain swaps (NEAR Intents) reach, by the id the Payments API names it with,
   and how it is named to people: Stellar, Solana and Monad under their own ids, the others under
   1Click's code. The assets endpoint also sends each name; this table names a stored swap's
   networks without it. */
export const NETWORK_NAMES: Record<string, string> = {
  stellar: "Stellar", solana: "Solana", monad: "Monad",
  eth: "Ethereum", base: "Base", arb: "Arbitrum", op: "Optimism", bsc: "BNB Chain", pol: "Polygon",
  avax: "Avalanche", gnosis: "Gnosis", bera: "Berachain", scroll: "Scroll", xlayer: "X Layer",
  abs: "Abstract", plasma: "Plasma", hood: "Robinhood Chain", hypercore: "Hyperliquid",
  btc: "Bitcoin", ltc: "Litecoin", doge: "Dogecoin", bch: "Bitcoin Cash", dash: "Dash", zec: "Zcash",
  xrp: "XRP Ledger", tron: "Tron", ton: "TON", near: "NEAR", sui: "Sui", aptos: "Aptos",
  movement: "Movement", starknet: "Starknet", cardano: "Cardano", aleo: "Aleo", fogo: "Fogo",
};
export const NETWORK_IDS = Object.keys(NETWORK_NAMES);

/* Networks only USDT0 reaches from here (LayerZero's OFT from Stellar, src/lib/usdt0.ts), not NEAR
   Intents: named for people, never accepted as a cross-chain swap's network. The OFT's other
   destinations (Ethereum, Arbitrum, Optimism, Polygon, Berachain, Plasma, X Layer, Monad) are
   already above. */
export const OFT_NETWORK_NAMES: Record<string, string> = {
  conflux: "Conflux eSpace", flare: "Flare", hyperevm: "HyperEVM", hedera: "Hedera", ink: "Ink", mantle: "Mantle",
  megaeth: "MegaETH", morph: "Morph", rootstock: "Rootstock", sei: "Sei", stable: "Stable", tempo: "Tempo", unichain: "Unichain",
};
export const networkName = (id: string | null | undefined) => (id ? NETWORK_NAMES[id] || OFT_NETWORK_NAMES[id] || id.toUpperCase() : "");

/* What an address looks like on each network, as a field's placeholder. */
const EVM_HINT = "0x…";
export const NETWORK_PLACEHOLDERS: Record<string, string> = {
  ...ADDRESS_PLACEHOLDERS,
  eth: EVM_HINT, base: EVM_HINT, arb: EVM_HINT, op: EVM_HINT, bsc: EVM_HINT, pol: EVM_HINT, avax: EVM_HINT,
  gnosis: EVM_HINT, bera: EVM_HINT, scroll: EVM_HINT, xlayer: EVM_HINT, abs: EVM_HINT, plasma: EVM_HINT,
  hood: EVM_HINT, hypercore: EVM_HINT, sui: EVM_HINT, aptos: EVM_HINT, movement: EVM_HINT, starknet: EVM_HINT,
  btc: "bc1… / 1… / 3…", ltc: "ltc1… / L…", doge: "D…", bch: "bitcoincash:q…", dash: "X…", zec: "t1… / u1…",
  xrp: "r…", tron: "T…", ton: "UQ… / EQ…", near: "name.near", cardano: "addr1…", aleo: "aleo1…", fogo: "Base58…",
};
export const placeholderFor = (id: string) => NETWORK_PLACEHOLDERS[id] || (OFT_NETWORK_NAMES[id] ? EVM_HINT : "");
