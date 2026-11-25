/* Tron: TIP-191 `signMessageV2` (TronLink's signMessageV2, TronWeb's trx.signMessageV2), a
   65-byte secp256k1 signature, 0x-hex, over keccak256("\x19TRON Signed Message:\n" + length +
   message). The address is base58check of 0x41 + the last 20 bytes of keccak256 of the recovered
   public key. Server-only, pure. */
import { secp256k1 } from "@noble/curves/secp256k1";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { base58check } from "@scure/base";
import { concat, equalBytes, fromHex, utf8 } from "@/lib/wallet-proofs/bytes";

const b58 = base58check(sha256);

/** The Tron address (`T…`) of an uncompressed secp256k1 public key (65 bytes). */
export function tronAddressOf(uncompressed: Uint8Array): string {
  return b58.encode(concat(Uint8Array.of(0x41), keccak_256(uncompressed.slice(1)).slice(-20)));
}

export function verifyTron(address: string, message: string, signatureHex: string): boolean {
  const sig = fromHex(signatureHex);
  if (!sig || sig.length !== 65) return false;
  const v = sig[64];
  const recovery = v >= 27 ? v - 27 : v;
  if (recovery !== 0 && recovery !== 1) return false;
  const body = utf8(message);
  const digest = keccak_256(concat(utf8(`\x19TRON Signed Message:\n${body.length}`), body));
  try {
    const point = secp256k1.Signature.fromCompact(sig.slice(0, 64)).addRecoveryBit(recovery).recoverPublicKey(digest);
    return equalBytes(utf8(tronAddressOf(point.toRawBytes(false))), utf8(address.trim()));
  } catch {
    return false;
  }
}
