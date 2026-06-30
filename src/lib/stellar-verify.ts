/* stellar-verify.ts — verify an ed25519 signature made by a Stellar account, using
   only Node's built-in crypto (no @stellar/stellar-sdk dependency on the dashboard).

   Used by the wallet account-provisioning flow: the open-source wallet can't hold a
   server secret, so instead it proves control of its Stellar account by signing a
   challenge with its secret key. We verify that signature against the public address.

   A Stellar G... address is base32(version_byte=0x30 + 32-byte ed25519 pubkey +
   2-byte CRC16-XModem checksum). We decode it, check the checksum, lift the raw key
   into an SPKI DER, and verify with crypto.verify(). */
import { createPublicKey, verify as cryptoVerify } from "node:crypto";

const B32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
// Fixed ASN.1 SPKI prefix for an Ed25519 public key (RFC 8410); the 32-byte key follows.
const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");
// Version byte for a Stellar ed25519 public key (`G...`): 6 << 3.
const VERSION_ED25519_PUBLIC_KEY = 6 << 3;

/** Decode RFC 4648 base32 (no padding, uppercase) into bytes; null on bad input. */
function base32Decode(input: string): Buffer | null {
  const s = input.toUpperCase().replace(/=+$/, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of s) {
    const idx = B32_ALPHABET.indexOf(ch);
    if (idx === -1) return null;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((value >>> bits) & 0xff);
    }
  }
  return Buffer.from(out);
}

/** CRC16-XModem (the checksum Stellar's StrKey uses), returned little-endian later. */
function crc16xmodem(bytes: Buffer): number {
  let crc = 0x0000;
  for (const byte of bytes) {
    let code = (crc >>> 8) & 0xff;
    code ^= byte & 0xff;
    code ^= code >>> 4;
    crc = (crc << 8) & 0xffff;
    crc ^= code;
    code = (code << 5) & 0xffff;
    crc ^= code;
    code = (code << 7) & 0xffff;
    crc ^= code;
  }
  return crc & 0xffff;
}

/** Returns the raw 32-byte ed25519 public key for a `G...` address, or null if invalid. */
export function decodeEd25519PublicKey(address: string): Buffer | null {
  if (typeof address !== "string" || !/^G[A-Z2-7]{55}$/.test(address)) return null;
  const decoded = base32Decode(address);
  if (!decoded || decoded.length !== 35) return null;
  if (decoded[0] !== VERSION_ED25519_PUBLIC_KEY) return null;

  const payload = decoded.subarray(0, 33); // version + 32-byte key
  const checksum = decoded.subarray(33); // 2-byte CRC16 (little-endian)
  const expected = crc16xmodem(payload);
  if (checksum[0] !== (expected & 0xff) || checksum[1] !== ((expected >>> 8) & 0xff)) {
    return null;
  }
  return Buffer.from(decoded.subarray(1, 33));
}

/**
 * Verify that `signatureB64` is a valid ed25519 signature of `message` (UTF-8) by the
 * Stellar account `address`. Returns false on any malformed input instead of throwing.
 */
export function verifyStellarSignature(
  address: string,
  message: string,
  signatureB64: string,
): boolean {
  try {
    const raw = decodeEd25519PublicKey(address);
    if (!raw) return false;
    const signature = Buffer.from(signatureB64, "base64");
    if (signature.length !== 64) return false;
    const der = Buffer.concat([ED25519_SPKI_PREFIX, raw]);
    const publicKey = createPublicKey({ key: der, format: "der", type: "spki" });
    return cryptoVerify(null, Buffer.from(message, "utf8"), publicKey, signature);
  } catch {
    return false;
  }
}

/** The exact challenge string the wallet signs (must match the wallet byte-for-byte). */
export function registrationMessage(email: string, stellarAddress: string, nonce: string): string {
  return (
    `Cosmos Pay Wallet account registration\n` +
    `email: ${email.trim().toLowerCase()}\n` +
    `account: ${stellarAddress}\n` +
    `nonce: ${nonce}`
  );
}

/**
 * Challenge the wallet signs to LINK an existing account (the email already has a user)
 * to this Stellar account via an emailed access code. A distinct prefix from
 * registrationMessage so a signature for one flow can't be replayed in the other.
 * Must match the wallet byte-for-byte (see signLinkMessage in the wallet's cosmospay.ts).
 */
export function linkMessage(email: string, stellarAddress: string, nonce: string): string {
  return (
    `Cosmos Pay Wallet account link\n` +
    `email: ${email.trim().toLowerCase()}\n` +
    `account: ${stellarAddress}\n` +
    `nonce: ${nonce}`
  );
}
