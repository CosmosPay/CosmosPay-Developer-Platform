/* Aptos and Movement: AIP-62 `aptos:signMessage` (Wallet Standard). The wallet signs, with an
   Ed25519 key, the UTF-8 of its `fullMessage`: "APTOS\n", optional address / application / chainId
   lines, then "message: <message>\nnonce: <nonce>". The signature proves the key; the account is
   the key's only when the chain's authentication key for the address is that key's (legacy
   Ed25519: SHA3-256(key ++ 0x00); single-key: SHA3-256(bcs(AnyPublicKey::Ed25519) ++ 0x02)). An
   account not on chain yet has its address as its authentication key. Movement is an Aptos-VM
   network with the same standard. Server-only; the account read is a parameter. */
import { ed25519 } from "@noble/curves/ed25519";
import { sha3_256 } from "@noble/hashes/sha3.js";
import { concat, fromHex, str, toHex, utf8 } from "@/lib/wallet-proofs/bytes";

export interface AptosProof {
  publicKey: string;
  signature: string;
  fullMessage: string;
}

/** The chain's authentication key of an account (0x + 64 hex), null when the account does not exist. */
export type AptosAuthKeyReader = (address: string) => Promise<string | null>;

export function readAptosProof(value: unknown): AptosProof | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const publicKey = str(v.publicKey);
  const signature = str(v.signature);
  const fullMessage = str(v.fullMessage);
  return publicKey && signature && fullMessage !== null ? { publicKey, signature, fullMessage } : null;
}

/** An Aptos address in its long form (0x + 64 lowercase hex); null when it is not one. */
export function longAptosAddress(address: string): string | null {
  const a = address.trim().toLowerCase();
  if (!/^0x[0-9a-f]{1,64}$/.test(a)) return null;
  return `0x${a.slice(2).padStart(64, "0")}`;
}

/** The authentication keys an Ed25519 key may stand behind. */
export function authKeysOf(publicKey: Uint8Array): string[] {
  const legacy = sha3_256(concat(publicKey, Uint8Array.of(0x00)));
  const singleKey = sha3_256(concat(Uint8Array.of(0x00, 0x20), publicKey, Uint8Array.of(0x02)));
  return [`0x${toHex(legacy)}`, `0x${toHex(singleKey)}`];
}

/** Whether `fullMessage` is AIP-62's envelope around exactly this message and nonce, for `address` if it names one. */
export function isAip62Envelope(fullMessage: string, address: string, message: string, nonce: string): boolean {
  if (!fullMessage.startsWith("APTOS\n")) return false;
  const tail = `message: ${message}\nnonce: ${nonce}`;
  if (!fullMessage.endsWith(tail)) return false;
  const head = fullMessage.slice("APTOS\n".length, fullMessage.length - tail.length);
  if (head === "") return true;
  if (!head.endsWith("\n")) return false;
  for (const line of head.slice(0, -1).split("\n")) {
    const [key, ...rest] = line.split(": ");
    const value = rest.join(": ");
    if (key === "address") {
      if (longAptosAddress(value) !== longAptosAddress(address)) return false;
    } else if (key !== "application" && key !== "chainId") {
      return false;
    }
  }
  return true;
}

export async function verifyAptos(address: string, message: string, nonce: string, proof: AptosProof, readAuthKey: AptosAuthKeyReader): Promise<boolean> {
  const account = longAptosAddress(address);
  const key = fromHex(proof.publicKey);
  const sig = fromHex(proof.signature);
  if (!account || !key || key.length !== 32 || !sig || sig.length !== 64) return false;
  if (!isAip62Envelope(proof.fullMessage, account, message, nonce)) return false;
  let valid = false;
  try {
    valid = ed25519.verify(sig, utf8(proof.fullMessage), key);
  } catch {
    valid = false;
  }
  if (!valid) return false;
  const onChain = await readAuthKey(account);
  const authKey = onChain === null ? account : longAptosAddress(onChain);
  return authKey !== null && authKeysOf(key).includes(authKey);
}
