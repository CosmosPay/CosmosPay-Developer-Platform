/* Proving a wallet from the browser, to connect it to an organization (src/lib/org-wallets.ts):
   the wallet shares its address, then signs the proof message for it. The page never sees a key;
   each wallet shows the text and the person approves it there. One way per wallet:
   - Freighter (Stellar): SEP-53 signMessage, base64 back.
   - Phantom and Solflare (Solana): their injected provider's signMessage over UTF-8, base64 back.
   - An EVM wallet (Monad): the injected EIP-1193 provider's personal_sign, 0x-hex back.
   `detectWallets` says which are installed; nothing is loaded or asked before a click. */
import type { WalletProvider } from "@/lib/org-wallets";

export type ProveProblem = "missing" | "declined";

export class WalletProofError extends Error {
  constructor(readonly problem: ProveProblem, message: string) {
    super(message);
  }
}

type SolanaProvider = {
  connect(): Promise<{ publicKey?: { toString(): string } } | void>;
  publicKey?: { toString(): string } | null;
  signMessage(message: Uint8Array, encoding?: string): Promise<{ signature: Uint8Array } | Uint8Array>;
};
type Eip1193 = { request(args: { method: string; params?: unknown[] }): Promise<unknown>; isMetaMask?: boolean; isRabby?: boolean; isPhantom?: boolean; isCoinbaseWallet?: boolean };
type WalletWindow = Window & { phantom?: { solana?: SolanaProvider & { isPhantom?: boolean } }; solana?: SolanaProvider & { isPhantom?: boolean }; solflare?: SolanaProvider & { isSolflare?: boolean }; ethereum?: Eip1193 };

const DETECT_TIMEOUT_MS = 2500;
const withTimeout = <T,>(p: Promise<T>, ms: number, fallback: T): Promise<T> =>
  Promise.race([p, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const toHex = (text: string) => `0x${Array.from(new TextEncoder().encode(text), (b) => b.toString(16).padStart(2, "0")).join("")}`;

function phantom(): SolanaProvider | null {
  const w = window as WalletWindow;
  return w.phantom?.solana ?? (w.solana?.isPhantom ? w.solana : null) ?? null;
}
function solflare(): SolanaProvider | null {
  return (window as WalletWindow).solflare ?? null;
}
function evm(): Eip1193 | null {
  return (window as WalletWindow).ethereum ?? null;
}

/** The name an injected EVM wallet goes by, for its button. */
export function evmWalletName(): string | null {
  const e = evm();
  if (!e) return null;
  if (e.isRabby) return "Rabby";
  if (e.isCoinbaseWallet) return "Coinbase Wallet";
  if (e.isPhantom) return "Phantom";
  if (e.isMetaMask) return "MetaMask";
  return null;
}

/** Which wallets this browser has, per provider (Freighter answers asynchronously). */
export async function detectWallets(): Promise<Record<WalletProvider, boolean>> {
  let freighter = false;
  try {
    const api = await import("@stellar/freighter-api");
    freighter = (await withTimeout(api.isConnected().catch(() => ({ isConnected: false })), DETECT_TIMEOUT_MS, { isConnected: false })).isConnected === true;
  } catch {
    freighter = false;
  }
  return { freighter, phantom: !!phantom(), solflare: !!solflare(), evm: !!evm() };
}

const declined = (e: unknown) => new WalletProofError("declined", e instanceof Error ? e.message : typeof e === "string" ? e : "The wallet refused the request");

/** The wallet's address, then its signature over `messageFor(address)`. */
export async function proveWallet(provider: WalletProvider, messageFor: (address: string) => string): Promise<{ address: string; signature: string }> {
  if (provider === "freighter") {
    const api = await import("@stellar/freighter-api");
    const conn = await withTimeout(api.isConnected().catch(() => ({ isConnected: false })), DETECT_TIMEOUT_MS, { isConnected: false });
    if (!conn.isConnected) throw new WalletProofError("missing", "Freighter is not installed or not answering");
    const access = await api.requestAccess().catch((e) => ({ address: "", error: e }));
    if (access.error || !access.address) throw declined(access.error);
    const address = access.address;
    const res = await api.signMessage(messageFor(address), { address }).catch((e) => ({ error: e, signedMessage: null, signerAddress: "" }));
    if (res.error || !res.signedMessage) throw declined(res.error);
    if (res.signerAddress && res.signerAddress !== address) throw new WalletProofError("declined", `Freighter signed with ${res.signerAddress}, not ${address}`);
    const signed = res.signedMessage as unknown;
    if (typeof signed === "string") return { address, signature: signed };
    if (signed instanceof Uint8Array) return { address, signature: toBase64(signed) };
    if (signed && typeof signed === "object" && Array.isArray((signed as { data?: unknown }).data)) return { address, signature: toBase64(Uint8Array.from((signed as { data: number[] }).data)) };
    throw new WalletProofError("declined", "Freighter returned no usable signature");
  }

  if (provider === "phantom" || provider === "solflare") {
    const wallet = provider === "phantom" ? phantom() : solflare();
    if (!wallet) throw new WalletProofError("missing", `${provider === "phantom" ? "Phantom" : "Solflare"} is not installed`);
    let address: string;
    try {
      const res = await wallet.connect();
      address = (res && "publicKey" in res && res.publicKey ? res.publicKey : wallet.publicKey)?.toString() ?? "";
    } catch (e) {
      throw declined(e);
    }
    if (!address) throw new WalletProofError("declined", "The wallet shared no address");
    try {
      const signed = await wallet.signMessage(new TextEncoder().encode(messageFor(address)), "utf8");
      const bytes = signed instanceof Uint8Array ? signed : signed.signature;
      return { address, signature: toBase64(new Uint8Array(bytes)) };
    } catch (e) {
      throw declined(e);
    }
  }

  const eth = evm();
  if (!eth) throw new WalletProofError("missing", "No EVM wallet is installed");
  try {
    const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
    const address = accounts?.[0];
    if (!address) throw new WalletProofError("declined", "The wallet shared no address");
    const signature = (await eth.request({ method: "personal_sign", params: [toHex(messageFor(address)), address] })) as string;
    return { address, signature };
  } catch (e) {
    if (e instanceof WalletProofError) throw e;
    throw declined(e);
  }
}
