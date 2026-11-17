/* NEAR: NEP-413 `signMessage`. The wallet signs, with an Ed25519 key of the account,
     sha256(borsh(2^31 + 413 as u32) ++ borsh({ message, nonce: [u8; 32], recipient, callbackUrl: None }))
   and answers its account id, public key (`ed25519:<base58>`) and signature (base64). A
   signature alone proves the key, not the account: the key must be one of the account's FULL
   access keys, which the chain says (`view_access_key` over RPC). An implicit account (64 hex) not
   created on-chain yet (`view_account` says so) is its key's by definition. Server-only; the RPC is a parameter, so a test
   answers it. */
import { ed25519 } from "@noble/curves/ed25519";
import { sha256 } from "@noble/hashes/sha2.js";
import { base58 } from "@scure/base";
import { concat, fromBase64, fromHex, str, toHex, utf8 } from "@/lib/wallet-proofs/bytes";

export interface NearProof {
  publicKey: string;
  signature: string;
}

export interface NearExpectations {
  message: string;
  /** The challenge's nonce, 32 bytes as hex. */
  nonce: string;
  recipient: string;
}

/** A JSON-RPC call to a NEAR node: the result, or the error the node answered. */
export type NearRpc = (method: string, params: unknown) => Promise<{ result?: unknown; error?: { cause?: { name?: string } ; name?: string; data?: unknown } }>;

const NEP413_TAG = 2147484061;

function u32le(n: number): Uint8Array {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n, true);
  return b;
}
const borshString = (s: string) => {
  const bytes = utf8(s);
  return concat(u32le(bytes.length), bytes);
};

/** The 32 bytes a NEP-413 signature is made over. */
export function nep413Digest(message: string, nonce: Uint8Array, recipient: string): Uint8Array {
  return sha256(concat(u32le(NEP413_TAG), borshString(message), nonce, borshString(recipient), Uint8Array.of(0)));
}

export function readNearProof(value: unknown): NearProof | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const publicKey = str(v.publicKey);
  const signature = str(v.signature);
  return publicKey && signature ? { publicKey, signature } : null;
}

/** The raw Ed25519 key of `ed25519:<base58>`, or null. */
export function nearKeyBytes(publicKey: string): Uint8Array | null {
  if (!publicKey.startsWith("ed25519:")) return null;
  try {
    const key = base58.decode(publicKey.slice("ed25519:".length));
    return key.length === 32 ? key : null;
  } catch {
    return null;
  }
}

const isImplicit = (accountId: string) => /^[0-9a-f]{64}$/.test(accountId);

export async function verifyNear(accountId: string, proof: NearProof, expected: NearExpectations, rpc: NearRpc): Promise<boolean> {
  const key = nearKeyBytes(proof.publicKey);
  const signature = fromBase64(proof.signature);
  const nonce = fromHex(expected.nonce);
  if (!key || !signature || signature.length !== 64 || !nonce || nonce.length !== 32) return false;
  let valid = false;
  try {
    valid = ed25519.verify(signature, nep413Digest(expected.message, nonce, expected.recipient), key);
  } catch {
    valid = false;
  }
  if (!valid) return false;

  const account = accountId.trim();
  const answer = await rpc("query", { request_type: "view_access_key", finality: "final", account_id: account, public_key: proof.publicKey });
  const result = answer.result as { permission?: unknown } | undefined;
  if (result && result.permission === "FullAccess") return true;
  // An implicit account (64 hex) that is not on chain yet belongs to the key it is named after.
  // Once it exists, its keys are what the chain says, like any other account's.
  if (!isImplicit(account) || toHex(key) !== account) return false;
  const known = await rpc("query", { request_type: "view_account", finality: "final", account_id: account });
  if (known.result && !(known.result as { error?: unknown }).error) return false;
  return /UNKNOWN_ACCOUNT|does not exist/i.test(JSON.stringify(known.error ?? (known.result as { error?: unknown } | undefined)?.error ?? ""));
}
