/* Checks a wallet's proof (src/lib/org-wallets.ts): the signature over the proof message must
   come from the address being connected. Server-only. One scheme per network, each the one its
   wallets implement:
   - Stellar: SEP-53 (Freighter's signMessage), Ed25519 over SHA-256("Stellar Signed Message:\n" + text).
   - Solana: Ed25519 over the text's UTF-8 bytes (Phantom's and Solflare's signMessage).
   - Monad (EVM): EIP-191 personal_sign, secp256k1 over keccak-256 of the prefixed text; the
     signer's address is recovered from the signature and compared.
   Signatures arrive as base64 (Stellar, Solana) or 0x-hex (EVM). Anything malformed is a
   failed proof, never an exception. */
import { createHash, createPublicKey, verify } from "node:crypto";
import { Keypair } from "@stellar/stellar-sdk";
import { secp256k1 } from "@noble/curves/secp256k1";
import { keccak_256 } from "@noble/hashes/sha3.js";
import type { Chain } from "@/lib/chains";

const SEP53_PREFIX = "Stellar Signed Message:\n";
const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/** Base58 (Bitcoin alphabet) to bytes; null when it is not base58. Bounded: Solana addresses only. */
export function decodeBase58(value: string): Uint8Array | null {
  if (!value || value.length > 64) return null;
  let n = 0n;
  for (const ch of value) {
    const digit = BASE58.indexOf(ch);
    if (digit < 0) return null;
    n = n * 58n + BigInt(digit);
  }
  const bytes: number[] = [];
  while (n > 0n) {
    bytes.unshift(Number(n % 256n));
    n /= 256n;
  }
  for (const ch of value) {
    if (ch !== "1") break;
    bytes.unshift(0);
  }
  return Uint8Array.from(bytes);
}

function fromBase64(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return null;
  return new Uint8Array(Buffer.from(value, "base64"));
}

function fromHex(value: string): Uint8Array | null {
  const hex = value.startsWith("0x") ? value.slice(2) : value;
  if (!/^[0-9a-fA-F]*$/.test(hex) || hex.length % 2) return null;
  return new Uint8Array(Buffer.from(hex, "hex"));
}

function verifyStellar(address: string, message: string, signature: string): boolean {
  const sig = fromBase64(signature);
  if (!sig || sig.length !== 64) return false;
  const payload = createHash("sha256").update(SEP53_PREFIX + message, "utf8").digest();
  return Keypair.fromPublicKey(address).verify(payload, Buffer.from(sig));
}

function verifySolana(address: string, message: string, signature: string): boolean {
  const key = decodeBase58(address);
  const sig = fromBase64(signature);
  if (!key || key.length !== 32 || !sig || sig.length !== 64) return false;
  const publicKey = createPublicKey({ key: { kty: "OKP", crv: "Ed25519", x: Buffer.from(key).toString("base64url") }, format: "jwk" });
  return verify(null, Buffer.from(message, "utf8"), publicKey, Buffer.from(sig));
}

/** The EVM address (lower-case 0x…) that signed `message` with personal_sign, or null. */
export function recoverEvmSigner(message: string, signature: string): string | null {
  const sig = fromHex(signature);
  if (!sig || sig.length !== 65) return null;
  const v = sig[64];
  const recovery = v >= 27 ? v - 27 : v;
  if (recovery !== 0 && recovery !== 1) return null;
  const text = new TextEncoder().encode(message);
  const digest = keccak_256(new Uint8Array([...new TextEncoder().encode(`\x19Ethereum Signed Message:\n${text.length}`), ...text]));
  try {
    const point = secp256k1.Signature.fromCompact(sig.slice(0, 64)).addRecoveryBit(recovery).recoverPublicKey(digest);
    const uncompressed = point.toRawBytes(false);
    return `0x${Buffer.from(keccak_256(uncompressed.slice(1)).slice(-20)).toString("hex")}`;
  } catch {
    return null;
  }
}

/** Whether `signature` over `message` was made by `address` on `chain`. */
export function verifyWalletProof(chain: Chain, address: string, message: string, signature: string): boolean {
  try {
    if (chain === "stellar") return verifyStellar(address, message, signature);
    if (chain === "solana") return verifySolana(address, message, signature);
    return recoverEvmSigner(message, signature) === address.trim().toLowerCase();
  } catch {
    return false;
  }
}
