/* The networks Cosmos Pay settles on, in one place for every screen, route and script that
   names them: display names, native coins, what an address looks like, the tokens offered as
   presets and the explorers. `Chain` is the three with a wallet link and a test network of their
   own (Stellar, Solana, Monad); `NetworkId` is every network, those three included. The Payments API stays the authority (it checks checksums, mints
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

/** An account on `chain`: one of the three chains or any other network, by its shape. */
export function isAddress(chain: string, value: string): boolean {
  return isNetworkAddress(chain, value);
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

/* Every network cross-chain swaps (NEAR Intents) reach, by the id the Payments API names it with,
   and how it is named to people: Stellar, Solana and Monad under their own ids, the others under
   1Click's code. It is also every network a payment link settles on: Stellar, Solana and Monad
   with their own wallet links (and test networks), every other one through a deposit address made
   for each payment, on mainnet only. The community server keeps the same list
   (`CROSS_CHAIN_NETWORK_IDS`); the assets endpoint also sends each name. */
export const NETWORK_NAMES = {
  stellar: "Stellar", solana: "Solana", monad: "Monad",
  eth: "Ethereum", base: "Base", arb: "Arbitrum", op: "Optimism", bsc: "BNB Chain", pol: "Polygon",
  avax: "Avalanche", gnosis: "Gnosis", bera: "Berachain", scroll: "Scroll", xlayer: "X Layer",
  abs: "Abstract", plasma: "Plasma", hood: "Robinhood Chain", hypercore: "Hyperliquid",
  btc: "Bitcoin", ltc: "Litecoin", doge: "Dogecoin", bch: "Bitcoin Cash", dash: "Dash", zec: "Zcash",
  xrp: "XRP Ledger", tron: "Tron", ton: "TON", near: "NEAR", sui: "Sui", aptos: "Aptos",
  movement: "Movement", starknet: "Starknet", cardano: "Cardano", aleo: "Aleo", fogo: "Fogo",
} as const satisfies Record<string, string>;
export type NetworkId = keyof typeof NETWORK_NAMES;
export const NETWORK_IDS = Object.keys(NETWORK_NAMES) as NetworkId[];
/* A network a payment link settles on through a deposit address: every one but the three chains
   with their own wallet links. */
export type DepositNetwork = Exclude<NetworkId, Chain>;

export function isNetwork(value: unknown): value is NetworkId {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(NETWORK_NAMES, value);
}

/** Whether a payment on `value` is paid through a deposit address made for it (mainnet only). */
export function isDepositNetwork(value: unknown): value is DepositNetwork {
  return isNetwork(value) && !isChain(value);
}

/* The networks by their names, for a picker: alphabetical, so no network is listed first for
   being one of ours. */
export const NETWORKS_BY_NAME: readonly NetworkId[] = [...NETWORK_IDS].sort((a, b) => NETWORK_NAMES[a].localeCompare(NETWORK_NAMES[b], "en"));

/* The native coin's ticker on every network (the community server's `nativeSymbol`). */
export const NETWORK_NATIVE_CODES: Record<NetworkId, string> = {
  ...NATIVE_CODES,
  eth: "ETH", base: "ETH", arb: "ETH", op: "ETH", bsc: "BNB", pol: "POL", avax: "AVAX", gnosis: "xDAI",
  bera: "BERA", scroll: "ETH", xlayer: "OKB", abs: "ETH", plasma: "XPL", hood: "ETH", hypercore: "HYPE",
  btc: "BTC", ltc: "LTC", doge: "DOGE", bch: "BCH", dash: "DASH", zec: "ZEC", xrp: "XRP", tron: "TRX",
  ton: "TON", near: "NEAR", sui: "SUI", aptos: "APT", movement: "MOVE", starknet: "STRK", cardano: "ADA",
  aleo: "ALEO", fogo: "FOGO",
};

/* What an account looks like on every network, mirroring the community server's rules
   (`CROSS_CHAIN_NETWORKS` and the patterns in `cross-chain-swaps.constants.ts`): shape only, the
   Payments API has the last word. Bech32 and cashaddr strings are matched in one case (BIP-173
   forbids mixing). */
const EVM = /^0x[0-9a-fA-F]{40}$/;
const BASE58_32 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const singleCase = (v: string) => (v === v.toLowerCase() || v === v.toUpperCase() ? v.toLowerCase() : null);
const bech32 = (re: RegExp) => (v: string) => {
  const lower = singleCase(v);
  return lower !== null && re.test(lower);
};
const either = (...checks: ((v: string) => boolean)[]) => (v: string) => checks.some((check) => check(v));
const pattern = (re: RegExp) => (v: string) => re.test(v);
const BTC_BASE58 = pattern(/^[13][1-9A-HJ-NP-Za-km-z]{25,34}$/);

interface AddressRule {
  test: (address: string) => boolean;
  /* Completes "Must be …", in English: the wording a route or a schema refuses a request with. */
  message: string;
  /* Hex encodings: two spellings that differ in case are one account. */
  hex: boolean;
}
const evmNetwork: AddressRule = { test: pattern(EVM), message: "an EVM address (0x + 40 hex)", hex: true };

export const NETWORK_ADDRESS_RULES: Record<NetworkId, AddressRule> = {
  stellar: { test: pattern(ADDRESS_PATTERNS.stellar), message: "a Stellar public key (G…, 56 characters)", hex: false },
  solana: { test: pattern(ADDRESS_PATTERNS.solana), message: "a Solana address (base58)", hex: false },
  monad: { test: pattern(ADDRESS_PATTERNS.monad), message: "a Monad (EVM) address (0x + 40 hex)", hex: true },
  eth: evmNetwork, base: evmNetwork, arb: evmNetwork, op: evmNetwork, bsc: evmNetwork, pol: evmNetwork,
  avax: evmNetwork, gnosis: evmNetwork, bera: evmNetwork, scroll: evmNetwork, xlayer: evmNetwork,
  abs: evmNetwork, plasma: evmNetwork, hood: evmNetwork, hypercore: evmNetwork,
  btc: { test: either(BTC_BASE58, bech32(/^bc1[02-9ac-hj-np-z]{39,59}$/)), message: "a Bitcoin address (bc1…, 1… or 3…)", hex: false },
  ltc: { test: either(pattern(/^[LM3][1-9A-HJ-NP-Za-km-z]{26,33}$/), bech32(/^ltc1[02-9ac-hj-np-z]{39,59}$/)), message: "a Litecoin address (ltc1…, L…, M… or 3…)", hex: false },
  doge: { test: pattern(/^[DA9][1-9A-HJ-NP-Za-km-z]{25,33}$/), message: "a Dogecoin address (D…, A… or 9…)", hex: false },
  bch: { test: either(BTC_BASE58, bech32(/^(?:bitcoincash:)?[qp](?:[02-9ac-hj-np-z]{41}|[02-9ac-hj-np-z]{60})$/)), message: "a Bitcoin Cash address (q…, p…, or legacy 1… / 3…)", hex: false },
  dash: { test: pattern(/^[X7][1-9A-HJ-NP-Za-km-z]{33}$/), message: "a Dash address (X… or 7…)", hex: false },
  zec: { test: either(pattern(/^t[13][1-9A-HJ-NP-Za-km-z]{33}$/), bech32(/^u1[02-9ac-hj-np-z]{100,1000}$/)), message: "a Zcash transparent (t1…, t3…) or unified (u1…) address", hex: false },
  xrp: { test: pattern(/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/), message: "an XRP Ledger address (r…)", hex: false },
  tron: { test: pattern(/^T[1-9A-HJ-NP-Za-km-z]{33}$/), message: "a Tron address (T…, 34 characters)", hex: false },
  ton: { test: either(pattern(/^[A-Za-z0-9_-]{48}$|^[A-Za-z0-9+/]{48}$/), pattern(/^(?:0|-1):[0-9a-fA-F]{64}$/)), message: "a TON address (48 characters, or 0: and 64 hex)", hex: false },
  near: { test: pattern(/^(?=.{2,64}$)(?:(?:[a-z\d]+[-_])*[a-z\d]+\.)*(?:[a-z\d]+[-_])*[a-z\d]+$/), message: "a NEAR account (alice.near, or 64 hex)", hex: false },
  sui: { test: pattern(/^0x[0-9a-fA-F]{64}$/), message: "a Sui address (0x + 64 hex)", hex: true },
  aptos: { test: pattern(/^0x[0-9a-fA-F]{1,64}$/), message: "an Aptos address (0x + up to 64 hex)", hex: true },
  movement: { test: pattern(/^0x[0-9a-fA-F]{1,64}$/), message: "a Movement address (0x + up to 64 hex)", hex: true },
  starknet: { test: pattern(/^0x[0-9a-fA-F]{1,64}$/), message: "a Starknet address (0x + up to 64 hex)", hex: true },
  cardano: { test: pattern(/^addr1[02-9ac-hj-np-z]{50,200}$/), message: "a Cardano address (addr1…)", hex: false },
  aleo: { test: pattern(/^aleo1[02-9ac-hj-np-z]{58}$/), message: "an Aleo address (aleo1…)", hex: false },
  fogo: { test: pattern(BASE58_32), message: "a Fogo address (base58)", hex: false },
};

/** Whether `value` has the shape of an account on `network` (an unknown network: never). */
export function isNetworkAddress(network: string, value: string): boolean {
  return isNetwork(network) && NETWORK_ADDRESS_RULES[network].test(value.trim());
}

/** "Must be a … address.", in English, for a route's or a schema's refusal. */
export function networkAddressMessage(network: string): string {
  return isNetwork(network) ? `Must be ${NETWORK_ADDRESS_RULES[network].message}.` : "Unknown network.";
}

/** Two addresses of one network are one account: hex ones whatever their case. */
export function sameNetworkAddress(network: string, a: string, b: string): boolean {
  const hex = isNetwork(network) && NETWORK_ADDRESS_RULES[network].hex;
  return hex ? a.trim().toLowerCase() === b.trim().toLowerCase() : a.trim() === b.trim();
}

/* Explorers, the same ones the wallet links, per network and tier. Stellar, Solana and Monad have
   a test network; every other network is reached on mainnet only, so it has no explorer on the
   sandbox tier. A network with no explorer we checked (Robinhood Chain, Aleo, Fogo) has none:
   the screens still copy and preview what they show. A hash or address is checked against the
   network's alphabet first, so a crafted value can't turn into a different URL. */
const HEX64 = /^[0-9a-f]{64}$/i;
const EVM_TX = /^0x[0-9a-f]{64}$/i;
const BASE58_TX = /^[1-9A-HJ-NP-Za-km-z]{43,90}$/;
const BASE58_DIGEST = /^[1-9A-HJ-NP-Za-km-z]{43,44}$/;
const TX_HASH: Record<NetworkId, RegExp> = {
  stellar: HEX64, solana: BASE58_TX, monad: EVM_TX,
  eth: EVM_TX, base: EVM_TX, arb: EVM_TX, op: EVM_TX, bsc: EVM_TX, pol: EVM_TX, avax: EVM_TX, gnosis: EVM_TX,
  bera: EVM_TX, scroll: EVM_TX, xlayer: EVM_TX, abs: EVM_TX, plasma: EVM_TX, hood: EVM_TX, hypercore: EVM_TX,
  btc: HEX64, ltc: HEX64, doge: HEX64, bch: HEX64, dash: HEX64, zec: HEX64, xrp: HEX64, tron: HEX64, cardano: HEX64,
  ton: /^[0-9a-fA-F]{64}$|^[A-Za-z0-9+/_-]{43}=?$/,
  near: BASE58_DIGEST, sui: BASE58_DIGEST,
  aptos: EVM_TX, movement: EVM_TX, starknet: /^0x[0-9a-f]{1,64}$/i,
  aleo: /^at1[02-9ac-hj-np-z]{58}$/, fogo: BASE58_TX,
};

type Explorer = { tx: (hash: string) => string; account: (address: string) => string };
/* An Etherscan-style explorer: /tx/<hash> and /address/<address>. */
const scan = (origin: string): Explorer => ({ tx: (h) => `${origin}/tx/${h}`, account: (a) => `${origin}/address/${a}` });
/* Blockchair, for the Bitcoin family: /<chain>/transaction/<hash> and /<chain>/address/<address>. */
const blockchair = (chain: string): Explorer => ({
  tx: (h) => `https://blockchair.com/${chain}/transaction/${h}`,
  account: (a) => `https://blockchair.com/${chain}/address/${a}`,
});
const enc = encodeURIComponent;

const EXPLORERS: Record<NetworkId, Partial<Record<Tier, Explorer>>> = {
  stellar: {
    public: { tx: (h) => `https://stellar.expert/explorer/public/tx/${h}`, account: (a) => `https://stellar.expert/explorer/public/account/${a}` },
    testnet: { tx: (h) => `https://stellar.expert/explorer/testnet/tx/${h}`, account: (a) => `https://stellar.expert/explorer/testnet/account/${a}` },
  },
  solana: {
    public: { tx: (h) => `https://solscan.io/tx/${h}`, account: (a) => `https://solscan.io/account/${a}` },
    testnet: { tx: (h) => `https://explorer.solana.com/tx/${h}?cluster=devnet`, account: (a) => `https://explorer.solana.com/address/${a}?cluster=devnet` },
  },
  monad: { public: scan("https://monadscan.com"), testnet: scan("https://testnet.monadexplorer.com") },
  eth: { public: scan("https://etherscan.io") },
  base: { public: scan("https://basescan.org") },
  arb: { public: scan("https://arbiscan.io") },
  op: { public: scan("https://optimistic.etherscan.io") },
  bsc: { public: scan("https://bscscan.com") },
  pol: { public: scan("https://polygonscan.com") },
  avax: { public: scan("https://snowtrace.io") },
  gnosis: { public: scan("https://gnosisscan.io") },
  bera: { public: scan("https://berascan.com") },
  scroll: { public: scan("https://scrollscan.com") },
  xlayer: { public: scan("https://www.oklink.com/xlayer") },
  abs: { public: scan("https://abscan.org") },
  plasma: { public: scan("https://plasmascan.to") },
  hood: {},
  hypercore: { public: { tx: (h) => `https://app.hyperliquid.xyz/explorer/tx/${h}`, account: (a) => `https://app.hyperliquid.xyz/explorer/address/${a}` } },
  btc: { public: blockchair("bitcoin") },
  ltc: { public: blockchair("litecoin") },
  doge: { public: blockchair("dogecoin") },
  bch: { public: blockchair("bitcoin-cash") },
  dash: { public: blockchair("dash") },
  zec: { public: blockchair("zcash") },
  xrp: { public: { tx: (h) => `https://livenet.xrpl.org/transactions/${h}`, account: (a) => `https://livenet.xrpl.org/accounts/${a}` } },
  tron: { public: { tx: (h) => `https://tronscan.org/#/transaction/${h}`, account: (a) => `https://tronscan.org/#/address/${a}` } },
  ton: { public: { tx: (h) => `https://tonviewer.com/transaction/${enc(h)}`, account: (a) => `https://tonviewer.com/${enc(a)}` } },
  near: { public: { tx: (h) => `https://nearblocks.io/txns/${h}`, account: (a) => `https://nearblocks.io/address/${a}` } },
  sui: { public: { tx: (h) => `https://suiscan.xyz/mainnet/tx/${h}`, account: (a) => `https://suiscan.xyz/mainnet/account/${a}` } },
  aptos: { public: { tx: (h) => `https://explorer.aptoslabs.com/txn/${h}?network=mainnet`, account: (a) => `https://explorer.aptoslabs.com/account/${a}?network=mainnet` } },
  movement: { public: { tx: (h) => `https://explorer.movementnetwork.xyz/txn/${h}?network=mainnet`, account: (a) => `https://explorer.movementnetwork.xyz/account/${a}?network=mainnet` } },
  starknet: { public: { tx: (h) => `https://voyager.online/tx/${h}`, account: (a) => `https://voyager.online/contract/${a}` } },
  cardano: { public: { tx: (h) => `https://cardanoscan.io/transaction/${h}`, account: (a) => `https://cardanoscan.io/address/${a}` } },
  aleo: {},
  fogo: {},
};

export function explorerTxUrl(chain: string, tier: Tier, hash: string | null | undefined): string | null {
  if (!hash || !isNetwork(chain) || !TX_HASH[chain].test(hash)) return null;
  const explorer = EXPLORERS[chain][tier];
  return explorer ? explorer.tx(hash) : null;
}

export function explorerAccountUrl(chain: string, tier: Tier, address: string | null | undefined): string | null {
  if (!address || !isNetwork(chain) || !isNetworkAddress(chain, address)) return null;
  const explorer = EXPLORERS[chain][tier];
  return explorer ? explorer.account(address.trim()) : null;
}

/* An asset as a person reads it: the network's coin for "native" (or nothing), a code before
   its issuer, and a long mint or contract shortened. */
export function assetLabel(chain: string, asset: string | null | undefined): string {
  if (!asset || asset === "native") return isNetwork(chain) ? NETWORK_NATIVE_CODES[chain] : "";
  const code = asset.split(":")[0];
  return code.length > 12 ? `${code.slice(0, 4)}…${code.slice(-4)}` : code;
}

/* Networks only USDT0 reaches from here (LayerZero's OFT from Stellar, src/lib/usdt0.ts), not NEAR
   Intents: named for people, never accepted as a cross-chain swap's network. The OFT's other
   destinations (Ethereum, Arbitrum, Optimism, Polygon, Berachain, Plasma, X Layer, Monad) are
   already above. */
export const OFT_NETWORK_NAMES: Record<string, string> = {
  conflux: "Conflux eSpace", flare: "Flare", hyperevm: "HyperEVM", hedera: "Hedera", ink: "Ink", mantle: "Mantle",
  megaeth: "MegaETH", morph: "Morph", rootstock: "Rootstock", sei: "Sei", stable: "Stable", tempo: "Tempo", unichain: "Unichain",
};
export const networkName = (id: string | null | undefined) => (id ? (isNetwork(id) ? NETWORK_NAMES[id] : OFT_NETWORK_NAMES[id]) || id.toUpperCase() : "");

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
