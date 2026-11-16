/* Proving a wallet on the networks whose wallets sign with their own standard (src/lib/org-wallets.ts,
   WALLET_PROVIDERS): the browser wallets that can do it in one click, and what a pasted proof
   looks like where any wallet can sign and the result is copied back. The page never sees a key;
   each wallet shows what it signs and the person approves it there. The server checks every
   proof (src/lib/org-wallets-verify.ts). Browser-only; nothing is loaded or asked before a click.
   - Tron: TronLink (and wallets that inject its `tronLink` / `tronWeb`), TIP-191 signMessageV2.
   - TON: any wallet with a TON Connect JS bridge (`window[key].tonconnect`: Tonkeeper,
     MyTonWallet, OpenMask...), ton_proof over the challenge's nonce; the address comes with it.
   - NEAR: MyNearWallet's NEP-413 sign-message page in a popup, which redirects back to this origin
     with the result in the URL's fragment.
   - Sui, Aptos and Movement: Wallet Standard wallets (src/lib/wallets/standard.ts) with
     `sui:signPersonalMessage` or `aptos:signMessage`.
   - Starknet: injected wallets (`window.starknet_*`: Argent X, Braavos...), SNIP-12 typed data.
   - Cardano: CIP-30 wallets (`window.cardano.*`: Eternl, Lace, Yoroi...), signData.
   - Aleo: Leo Wallet (`window.leoWallet`), signMessage.
   - Bitcoin: Unisat, OKX, Xverse and Leather, BIP-322 (or BIP-137 for a legacy address).
   The XRP Ledger and the rest of the Bitcoin family have no browser standard: their wallets sign
   the message and the result is pasted (`PASTE_FIELDS`). */
import type { NetworkId } from "@/lib/chains";
import type { WalletProvider } from "@/lib/org-wallets";
import { standardWallets, type StandardWallet } from "@/lib/wallets/standard";

/** A challenge as POST /api/organizations/{id}/wallets/challenge answers it. */
export interface WalletChallengeAnswer {
  chain: NetworkId;
  address: string | null;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
  message: string | null;
  domain: string;
  manifestUrl: string | null;
  typedData: Record<string, unknown> | null;
}

/** What the connect route takes besides the challenge's nonce. */
export interface ProofPayload {
  provider: WalletProvider;
  signature?: string;
  proof?: Record<string, unknown>;
}

export type NetworkProofProblem = "missing" | "declined";

export class NetworkProofError extends Error {
  readonly problem: NetworkProofProblem;
  constructor(problem: NetworkProofProblem, message: string) {
    super(message);
    this.problem = problem;
  }
}

/** A browser wallet that proves an address on one network. */
export interface NetworkSigner {
  id: string;
  name: string;
  icon?: string;
  /** Whether `account()` answers null: the wallet names its address only while signing (TON). */
  addressWithProof?: boolean;
  /** Whether the address is typed first: the wallet signs for an account it is told (NEAR's web wallet). */
  needsAddress?: boolean;
  /** The wallet's address, once the person allows it. */
  account(): Promise<string | null>;
  /** The proof over the challenge, and the address it was made for. */
  sign(challenge: WalletChallengeAnswer, address: string | null): Promise<{ address: string; payload: ProofPayload }>;
}

type AnyRecord = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const w = () => window as unknown as AnyRecord;
const declined = (e: unknown) => new NetworkProofError("declined", e instanceof Error ? e.message : typeof e === "string" ? e : "The wallet refused the request");
const utf8 = (s: string) => new TextEncoder().encode(s);
const toHex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
const fromHex = (h: string) => Uint8Array.from((h.replace(/^0x/, "").match(/.{2}/g) || []).map((x) => parseInt(x, 16)));
const toBase64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));
const asText = (v: unknown): string => (typeof v === "string" ? v : v instanceof Uint8Array ? toHex(v) : v && typeof (v as { toString(): string }).toString === "function" ? String(v) : "");
const message = (c: WalletChallengeAnswer) => {
  if (!c.message) throw new NetworkProofError("declined", "The challenge carries no message");
  return c.message;
};

/* ── Tron ── */
function tronSigners(): NetworkSigner[] {
  const link = w().tronLink;
  const web = () => (w().tronLink?.tronWeb || w().tronWeb) as AnyRecord | undefined;
  if (!link && !w().tronWeb) return [];
  return [{
    id: "tronlink",
    name: "TronLink",
    async account() {
      try {
        if (link?.request) await link.request({ method: "tron_requestAccounts" });
      } catch (e) {
        throw declined(e);
      }
      const address = web()?.defaultAddress?.base58;
      if (!address) throw new NetworkProofError("declined", "The wallet shared no address");
      return address;
    },
    async sign(challenge, address) {
      const tw = web();
      if (!tw?.trx?.signMessageV2) throw new NetworkProofError("missing", "TronLink is not answering");
      try {
        const signature = await tw.trx.signMessageV2(message(challenge));
        return { address: address!, payload: { provider: "tip191", signature: String(signature) } };
      } catch (e) {
        throw declined(e);
      }
    },
  }];
}

/* ── TON ── */
const TON_BRIDGE_KEYS = ["tonkeeper", "mytonwallet", "openmask", "tonwallet", "bitgetTonWallet", "okxTonWallet", "safepalwallet", "xtonwallet", "hot"];
function tonSigners(): NetworkSigner[] {
  const keys = new Set(TON_BRIDGE_KEYS.filter((k) => typeof w()[k]?.tonconnect?.connect === "function"));
  for (const k of Object.keys(window)) {
    try {
      if (typeof w()[k]?.tonconnect?.connect === "function") keys.add(k);
    } catch {
      /* a property that throws on read */
    }
  }
  return [...keys].map((key) => {
    const bridge = w()[key].tonconnect as AnyRecord;
    const info = (bridge.walletInfo || {}) as AnyRecord;
    return {
      id: `ton:${key}`,
      name: String(info.name || key),
      icon: typeof info.image === "string" ? info.image : undefined,
      addressWithProof: true,
      async account() {
        return null;
      },
      async sign(challenge) {
        if (!challenge.manifestUrl) throw new NetworkProofError("declined", "The challenge carries no manifest");
        let event: AnyRecord;
        try {
          event = await bridge.connect(2, { manifestUrl: challenge.manifestUrl, items: [{ name: "ton_addr" }, { name: "ton_proof", payload: challenge.nonce }] });
        } catch (e) {
          throw declined(e);
        }
        if (event?.event !== "connect") throw declined(event?.payload?.message || "The wallet refused the request");
        const items = (event.payload?.items || []) as AnyRecord[];
        const addr = items.find((i) => i.name === "ton_addr");
        const proof = items.find((i) => i.name === "ton_proof");
        if (!addr?.address || !proof?.proof) throw new NetworkProofError("declined", "The wallet sent no proof");
        // The wallet's TON Connect session is not kept: it proved the address and that is all.
        try { bridge.disconnect?.(); } catch { /* nothing to close */ }
        return { address: String(addr.address), payload: { provider: "tonproof", proof: { publicKey: addr.publicKey, walletStateInit: addr.walletStateInit, proof: proof.proof } } };
      },
    };
  });
}

/* ── NEAR (MyNearWallet's sign-message page, NEP-413) ── */
const MY_NEAR_WALLET = "https://app.mynearwallet.com";
function nearSigners(): NetworkSigner[] {
  return [{
    id: "mynearwallet",
    name: "MyNearWallet",
    needsAddress: true,
    async account() {
      return null;
    },
    async sign(challenge, address) {
      const url = new URL("/sign-message", MY_NEAR_WALLET);
      url.searchParams.set("message", message(challenge));
      url.searchParams.set("nonce", toBase64(fromHex(challenge.nonce)));
      url.searchParams.set("recipient", challenge.domain);
      // Back to this origin (a static file), where the result in the fragment can be read.
      url.searchParams.set("callbackUrl", new URL("/favicon.svg", window.location.origin).toString());
      const popup = window.open(url.toString(), "cosmospay-near-proof", "popup,width=480,height=720");
      if (!popup) throw new NetworkProofError("declined", "The browser blocked the wallet's window");
      const hash = await new Promise<string>((resolve, reject) => {
        const started = Date.now();
        const timer = window.setInterval(() => {
          if (popup.closed) { window.clearInterval(timer); reject(new NetworkProofError("declined", "The wallet's window was closed")); return; }
          if (Date.now() - started > 10 * 60_000) { window.clearInterval(timer); popup.close(); reject(new NetworkProofError("declined", "The wallet took too long")); return; }
          try {
            if (popup.location.origin === window.location.origin) { window.clearInterval(timer); const h = popup.location.hash; popup.close(); resolve(h); }
          } catch {
            /* still on the wallet's origin */
          }
        }, 400);
      });
      const params = new URLSearchParams(hash.replace(/^#/, ""));
      const accountId = params.get("accountId");
      const publicKey = params.get("publicKey");
      const signature = params.get("signature");
      if (params.get("error") || !accountId || !publicKey || !signature) throw declined(params.get("error") || "The wallet sent no signature");
      if (address && accountId !== address) throw new NetworkProofError("declined", `The wallet signed as ${accountId}, not ${address}`);
      return { address: accountId, payload: { provider: "nep413", proof: { publicKey, signature } } };
    },
  }];
}

/* ── Sui (Wallet Standard) ── */
function suiSigners(): NetworkSigner[] {
  return standardWallets(["standard:connect", "sui:signPersonalMessage"])
    .filter((x) => !x.chains || x.chains.some((c) => c.startsWith("sui:")))
    .map((wallet) => standardSigner(wallet, "sui", async (account, challenge) => {
      const feature = wallet.features["sui:signPersonalMessage"] as AnyRecord;
      const out = await feature.signPersonalMessage({ message: utf8(message(challenge)), account });
      return { provider: "sui", signature: String(out.signature) };
    }));
}

/* ── Aptos and Movement (Wallet Standard, AIP-62) ── */
function aptosSigners(): NetworkSigner[] {
  return standardWallets(["aptos:connect", "aptos:signMessage"]).map((wallet) => {
    let publicKey = "";
    return {
      id: `aptos:${wallet.name}`,
      name: wallet.name,
      icon: wallet.icon,
      async account() {
        try {
          const res = await (wallet.features["aptos:connect"] as AnyRecord).connect();
          const info = res?.status ? (res.status === "Approved" ? res.args : null) : res;
          if (!info) throw new NetworkProofError("declined", "The wallet refused the request");
          publicKey = asText(info.publicKey);
          return asText(info.address);
        } catch (e) {
          if (e instanceof NetworkProofError) throw e;
          throw declined(e);
        }
      },
      async sign(challenge, address) {
        let out: AnyRecord;
        try {
          const res = await (wallet.features["aptos:signMessage"] as AnyRecord).signMessage({ message: message(challenge), nonce: challenge.nonce });
          out = res?.status ? (res.status === "Approved" ? res.args : null) : res;
        } catch (e) {
          throw declined(e);
        }
        if (!out?.fullMessage) throw new NetworkProofError("declined", "The wallet refused the request");
        return { address: address!, payload: { provider: "aip62", proof: { publicKey: ed25519Hex(publicKey), signature: ed25519Hex(asText(out.signature), 64), fullMessage: String(out.fullMessage) } } };
      },
    };
  });
}

/* A single-key account's key or signature carries its scheme in front (AnyPublicKey, AnySignature). */
function ed25519Hex(value: string, size = 32): string {
  const bytes = fromHex(value);
  if (bytes.length === size + 2 && bytes[0] === 0 && bytes[1] === size) return `0x${toHex(bytes.slice(2))}`;
  if (bytes.length === size + 1 && bytes[0] === 0) return `0x${toHex(bytes.slice(1))}`;
  return `0x${toHex(bytes)}`;
}

function standardSigner(wallet: StandardWallet, prefix: string, sign: (account: AnyRecord, challenge: WalletChallengeAnswer) => Promise<ProofPayload>): NetworkSigner {
  let current: AnyRecord | null = null;
  return {
    id: `${prefix}:${wallet.name}`,
    name: wallet.name,
    icon: wallet.icon,
    async account() {
      try {
        const res = await (wallet.features["standard:connect"] as AnyRecord).connect();
        current = (res?.accounts || wallet.accounts || []).find((a: AnyRecord) => !a.chains || a.chains.some((c: string) => c.startsWith(`${prefix}:`))) ?? null;
      } catch (e) {
        throw declined(e);
      }
      if (!current?.address) throw new NetworkProofError("declined", "The wallet shared no address");
      return String(current.address);
    },
    async sign(challenge, address) {
      if (!current) throw new NetworkProofError("declined", "The wallet is not connected");
      try {
        return { address: address!, payload: await sign(current, challenge) };
      } catch (e) {
        throw declined(e);
      }
    },
  };
}

/* ── Starknet (injected, get-starknet's window objects) ── */
function starknetSigners(): NetworkSigner[] {
  const seen = new Set<unknown>();
  const out: NetworkSigner[] = [];
  for (const key of Object.keys(window).filter((k) => k.startsWith("starknet"))) {
    const sn = w()[key] as AnyRecord | undefined;
    if (!sn || seen.has(sn) || (typeof sn.request !== "function" && typeof sn.enable !== "function")) continue;
    seen.add(sn);
    out.push({
      id: `starknet:${sn.id || key}`,
      name: String(sn.name || key),
      icon: typeof sn.icon === "string" ? sn.icon : undefined,
      async account() {
        try {
          const accounts = typeof sn.request === "function" ? await sn.request({ type: "wallet_requestAccounts" }) : await sn.enable();
          const address = Array.isArray(accounts) ? accounts[0] : sn.selectedAddress;
          if (!address) throw new NetworkProofError("declined", "The wallet shared no address");
          return String(address);
        } catch (e) {
          if (e instanceof NetworkProofError) throw e;
          throw declined(e);
        }
      },
      async sign(challenge, address) {
        if (!challenge.typedData) throw new NetworkProofError("declined", "The challenge carries no typed data");
        try {
          const signature = typeof sn.request === "function"
            ? await sn.request({ type: "wallet_signTypedData", params: challenge.typedData })
            : await sn.account.signMessage(challenge.typedData);
          const felts = (Array.isArray(signature) ? signature : [signature?.r, signature?.s]).map((x: unknown) => (typeof x === "bigint" ? `0x${x.toString(16)}` : String(x)));
          return { address: address!, payload: { provider: "snip12", proof: { signature: felts } } };
        } catch (e) {
          throw declined(e);
        }
      },
    });
  }
  return out;
}

/* ── Cardano (CIP-30) ── */
function cardanoSigners(): NetworkSigner[] {
  const root = w().cardano as AnyRecord | undefined;
  if (!root) return [];
  const seen = new Set<string>();
  const out: NetworkSigner[] = [];
  for (const [key, entry] of Object.entries(root)) {
    const wallet = entry as AnyRecord;
    if (!wallet || typeof wallet.enable !== "function" || !wallet.name || seen.has(wallet.name)) continue;
    seen.add(wallet.name);
    let api: AnyRecord | null = null;
    let addressHex = "";
    out.push({
      id: `cardano:${key}`,
      name: String(wallet.name),
      icon: typeof wallet.icon === "string" ? wallet.icon : undefined,
      async account() {
        try {
          api = await wallet.enable();
          const used: string[] = (await api!.getUsedAddresses?.().catch(() => [])) || [];
          addressHex = (await api!.getChangeAddress?.().catch(() => "")) || used[0] || "";
        } catch (e) {
          throw declined(e);
        }
        if (!addressHex) throw new NetworkProofError("declined", "The wallet shared no address");
        const { bech32 } = await import("@scure/base");
        const bytes = fromHex(addressHex);
        return bech32.encode((bytes[0] & 0x0f) === 1 ? "addr" : "addr_test", bech32.toWords(bytes), 200);
      },
      async sign(challenge, address) {
        if (!api) throw new NetworkProofError("declined", "The wallet is not connected");
        try {
          const signed = await api.signData(addressHex, toHex(utf8(message(challenge))));
          return { address: address!, payload: { provider: "cip30", proof: { signature: String(signed.signature), key: String(signed.key) } } };
        } catch (e) {
          throw declined(e);
        }
      },
    });
  }
  return out;
}

/* ── Aleo (Leo Wallet) ── */
function aleoSigners(): NetworkSigner[] {
  const leo = (w().leoWallet || w().leo) as AnyRecord | undefined;
  if (!leo || typeof leo.signMessage !== "function") return [];
  return [{
    id: "leo",
    name: "Leo Wallet",
    async account() {
      try {
        await leo.connect("NO_DECRYPT", "mainnet").catch(() => leo.connect("NO_DECRYPT", "mainnetbeta"));
      } catch (e) {
        throw declined(e);
      }
      const address = leo.publicKey;
      if (!address) throw new NetworkProofError("declined", "The wallet shared no address");
      return String(address);
    },
    async sign(challenge, address) {
      try {
        const out = await leo.signMessage(utf8(message(challenge)));
        const bytes = out?.signature ?? out;
        const signature = typeof bytes === "string" ? bytes : new TextDecoder().decode(new Uint8Array(bytes));
        return { address: address!, payload: { provider: "aleo", signature } };
      } catch (e) {
        throw declined(e);
      }
    },
  }];
}

/* ── Bitcoin ── */
const isLegacyBtc = (address: string) => /^1/.test(address);
function bitcoinSigners(): NetworkSigner[] {
  const out: NetworkSigner[] = [];
  const pick = (address: string): WalletProvider => (isLegacyBtc(address) ? "signmessage" : "bip322");
  const unisat = w().unisat as AnyRecord | undefined;
  if (unisat?.requestAccounts) {
    out.push({
      id: "unisat",
      name: "Unisat",
      async account() {
        try {
          const accounts = await unisat.requestAccounts();
          return accounts?.[0] ? String(accounts[0]) : null;
        } catch (e) {
          throw declined(e);
        }
      },
      async sign(challenge, address) {
        const provider = pick(address!);
        try {
          const signature = await unisat.signMessage(message(challenge), provider === "bip322" ? "bip322-simple" : "ecdsa");
          return { address: address!, payload: { provider, signature: String(signature) } };
        } catch (e) {
          throw declined(e);
        }
      },
    });
  }
  const okx = w().okxwallet?.bitcoin as AnyRecord | undefined;
  if (okx?.connect) {
    out.push({
      id: "okx-btc",
      name: "OKX Wallet",
      async account() {
        try {
          const res = await okx.connect();
          return res?.address ? String(res.address) : null;
        } catch (e) {
          throw declined(e);
        }
      },
      async sign(challenge, address) {
        const provider = pick(address!);
        try {
          const signature = await okx.signMessage(message(challenge), provider === "bip322" ? "bip322-simple" : "ecdsa");
          return { address: address!, payload: { provider, signature: String(signature) } };
        } catch (e) {
          throw declined(e);
        }
      },
    });
  }
  const xverse = (w().XverseProviders?.BitcoinProvider || w().BitcoinProvider) as AnyRecord | undefined;
  if (xverse?.request) {
    out.push({
      id: "xverse",
      name: "Xverse",
      async account() {
        const res = await xverse.request("getAccounts", { purposes: ["payment"] }).catch((e: unknown) => { throw declined(e); });
        const account = (res?.result || [])[0];
        if (res?.error || !account?.address) throw declined(res?.error?.message || "The wallet shared no address");
        return String(account.address);
      },
      async sign(challenge, address) {
        const provider = pick(address!);
        const res = await xverse.request("signMessage", { address, message: message(challenge), protocol: provider === "bip322" ? "BIP322" : "ECDSA" }).catch((e: unknown) => { throw declined(e); });
        if (res?.error || !res?.result?.signature) throw declined(res?.error?.message || "The wallet sent no signature");
        return { address: address!, payload: { provider, signature: String(res.result.signature) } };
      },
    });
  }
  const leather = w().LeatherProvider as AnyRecord | undefined;
  if (leather?.request) {
    let paymentType = "p2wpkh";
    out.push({
      id: "leather",
      name: "Leather",
      async account() {
        const res = await leather.request("getAddresses").catch((e: unknown) => { throw declined(e); });
        const btc = (res?.result?.addresses || []).find((a: AnyRecord) => a.symbol === "BTC" && a.type === "p2wpkh") || (res?.result?.addresses || []).find((a: AnyRecord) => a.symbol === "BTC");
        if (!btc?.address) throw declined("The wallet shared no address");
        paymentType = btc.type || "p2wpkh";
        return String(btc.address);
      },
      async sign(challenge, address) {
        const res = await leather.request("signMessage", { message: message(challenge), paymentType, network: "mainnet" }).catch((e: unknown) => { throw declined(e); });
        if (!res?.result?.signature) throw declined("The wallet sent no signature");
        return { address: address!, payload: { provider: "bip322", signature: String(res.result.signature) } };
      },
    });
  }
  return out;
}

/** The browser wallets in this browser that can prove an address on `chain` (empty where none is installed). */
export function networkSigners(chain: NetworkId): NetworkSigner[] {
  if (typeof window === "undefined") return [];
  try {
    switch (chain) {
      case "tron": return tronSigners();
      case "ton": return tonSigners();
      case "near": return nearSigners();
      case "sui": return suiSigners();
      case "aptos":
      case "movement": return aptosSigners();
      case "starknet": return starknetSigners();
      case "cardano": return cardanoSigners();
      case "aleo": return aleoSigners();
      case "btc": return bitcoinSigners();
      default: return [];
    }
  } catch {
    return [];
  }
}

/* What a pasted proof is made of, per network: the fields the person fills and how they become
   the connect route's `signature` / `proof`. TON and Starknet have none: only their wallets can
   make the proof. */
export type PasteField = "signature" | "publicKey" | "fullMessage" | "coseKey";
export const PASTE_FIELDS: Partial<Record<NetworkId, { provider: WalletProvider; fields: PasteField[] }>> = {
  tron: { provider: "tip191", fields: ["signature"] },
  near: { provider: "nep413", fields: ["publicKey", "signature"] },
  sui: { provider: "sui", fields: ["signature"] },
  aptos: { provider: "aip62", fields: ["publicKey", "signature", "fullMessage"] },
  movement: { provider: "aip62", fields: ["publicKey", "signature", "fullMessage"] },
  cardano: { provider: "cip30", fields: ["signature", "coseKey"] },
  xrp: { provider: "xrpl", fields: ["publicKey", "signature"] },
  aleo: { provider: "aleo", fields: ["signature"] },
  btc: { provider: "bip322", fields: ["signature"] },
  ltc: { provider: "signmessage", fields: ["signature"] },
  doge: { provider: "signmessage", fields: ["signature"] },
  bch: { provider: "signmessage", fields: ["signature"] },
  dash: { provider: "signmessage", fields: ["signature"] },
  zec: { provider: "signmessage", fields: ["signature"] },
};

/** The connect route's proof from pasted fields. A Bitcoin compact signature (65 bytes) is BIP-137, else BIP-322. */
export function pastedPayload(chain: NetworkId, values: Partial<Record<PasteField, string>>): ProofPayload | null {
  const spec = PASTE_FIELDS[chain];
  if (!spec) return null;
  const v = (k: PasteField) => (values[k] || "").trim();
  if (spec.fields.some((f) => !v(f))) return null;
  switch (spec.provider) {
    case "nep413":
      return { provider: "nep413", proof: { publicKey: v("publicKey"), signature: v("signature") } };
    case "aip62":
      // The full message is signed byte for byte: only line endings a paste may have changed are restored.
      return { provider: "aip62", proof: { publicKey: v("publicKey"), signature: v("signature"), fullMessage: (values.fullMessage || "").replace(/\r\n/g, "\n").replace(/^\s+|\s+$/g, "") } };
    case "cip30":
      return { provider: "cip30", proof: { signature: v("signature"), key: v("coseKey") } };
    case "xrpl":
      return { provider: "xrpl", proof: { publicKey: v("publicKey"), signature: v("signature") } };
    case "bip322": {
      let compact = false;
      try { compact = atob(v("signature")).length === 65; } catch { compact = false; }
      return { provider: compact ? "signmessage" : "bip322", signature: v("signature") };
    }
    default:
      return { provider: spec.provider, signature: v("signature") };
  }
}
