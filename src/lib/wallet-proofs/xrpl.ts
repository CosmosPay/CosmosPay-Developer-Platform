/* XRP Ledger: a message signed with the account's key as rippled's keypairs sign it (GemWallet's
   `signMessage`, `ripple-keypairs` `sign(hex(message), privateKey)`, any wallet that exports it).
   Secp256k1 keys (33 bytes) sign SHA-512Half of the message with a DER signature; Ed25519 keys
   (0xED ++ 32 bytes) sign the message itself. The account is the key's when its classic address
   is base58check(0x00 ++ RIPEMD-160(SHA-256(public key))) in the ledger's alphabet. A regular key
   or a multisigning list proves nothing here: only the master key of the address. Server-only, pure. */
import { ed25519 } from "@noble/curves/ed25519";
import { secp256k1 } from "@noble/curves/secp256k1";
import { sha256, sha512 } from "@noble/hashes/sha2.js";
import { ripemd160 } from "@noble/hashes/legacy.js";
import { base58xrp } from "@scure/base";
import { equalBytes, fromHex, sha256d, utf8 } from "@/lib/wallet-proofs/bytes";

/** The account id (20 bytes) of a classic address, or null when it is not one. */
export function xrplAccountId(address: string): Uint8Array | null {
  let raw: Uint8Array;
  try {
    raw = base58xrp.decode(address.trim());
  } catch {
    return null;
  }
  if (raw.length !== 25 || raw[0] !== 0x00) return null;
  const body = raw.slice(0, 21);
  return equalBytes(sha256d(body).slice(0, 4), raw.slice(21)) ? body.slice(1) : null;
}

export function verifyXrpl(address: string, message: string, publicKeyHex: string, signatureHex: string): boolean {
  const accountId = xrplAccountId(address);
  const key = fromHex(publicKeyHex);
  const sig = fromHex(signatureHex);
  if (!accountId || !key || key.length !== 33 || !sig) return false;
  if (!equalBytes(ripemd160(sha256(key)), accountId)) return false;
  const body = utf8(message);
  try {
    if (key[0] === 0xed) return sig.length === 64 && ed25519.verify(sig, body, key.slice(1));
    if (key[0] !== 0x02 && key[0] !== 0x03) return false;
    const digest = sha512(body).slice(0, 32);
    // rippled requires canonical (low-S) signatures; the keypairs library makes only those.
    return secp256k1.verify(secp256k1.Signature.fromDER(sig), digest, key, { prehash: false, lowS: true });
  } catch {
    return false;
  }
}
