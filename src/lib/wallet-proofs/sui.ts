/* Sui: a personal message signature (`sui:signPersonalMessage`, Wallet Standard). The wallet
   signs the intent message [3, 0, 0] ++ bcs(vector<u8> message), hashed with BLAKE2b-256, and
   answers flag ++ signature ++ public key in base64. Ed25519 (flag 0) signs the digest; Secp256k1
   (1) and Secp256r1 (2) sign SHA-256 of it. The address is BLAKE2b-256(flag ++ public key).
   zkLogin and multisig signatures carry no single key to tie to the address and are refused.
   Server-only, pure. */
import { ed25519 } from "@noble/curves/ed25519";
import { secp256k1 } from "@noble/curves/secp256k1";
import { p256 } from "@noble/curves/p256";
import { blake2b } from "@noble/hashes/blake2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { concat, fromBase64, fromHex, equalBytes, utf8 } from "@/lib/wallet-proofs/bytes";

function uleb128(n: number): Uint8Array {
  const out: number[] = [];
  do {
    let byte = n & 0x7f;
    n >>>= 7;
    if (n) byte |= 0x80;
    out.push(byte);
  } while (n);
  return Uint8Array.from(out);
}

const SCHEMES: Record<number, { keyLength: number; verify: (sig: Uint8Array, digest: Uint8Array, key: Uint8Array) => boolean }> = {
  0: { keyLength: 32, verify: (sig, digest, key) => ed25519.verify(sig, digest, key) },
  1: { keyLength: 33, verify: (sig, digest, key) => secp256k1.verify(sig, sha256(digest), key, { prehash: false }) },
  2: { keyLength: 33, verify: (sig, digest, key) => p256.verify(sig, sha256(digest), key, { prehash: false }) },
};

export function verifySui(address: string, message: string, signatureB64: string): boolean {
  const raw = fromBase64(signatureB64);
  if (!raw || raw.length < 1) return false;
  const scheme = SCHEMES[raw[0]];
  if (!scheme || raw.length !== 1 + 64 + scheme.keyLength) return false;
  const sig = raw.slice(1, 65);
  const key = raw.slice(65);
  const expected = fromHex(address.trim().toLowerCase());
  if (!expected || expected.length !== 32) return false;
  if (!equalBytes(blake2b(concat(Uint8Array.of(raw[0]), key), { dkLen: 32 }), expected)) return false;
  const body = utf8(message);
  const digest = blake2b(concat(Uint8Array.of(3, 0, 0), uleb128(body.length), body), { dkLen: 32 });
  try {
    return scheme.verify(sig, digest, key);
  } catch {
    return false;
  }
}
