/* Byte helpers the wallet-proof verifiers share (src/lib/wallet-proofs). Pure, no Node `Buffer`
   in what they return, so every verifier works on plain Uint8Arrays. A malformed input is null,
   never an exception: a proof that cannot be read is a failed proof. */
import { sha256 } from "@noble/hashes/sha2.js";

export const utf8 = (text: string): Uint8Array => new TextEncoder().encode(text);

export function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

export function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** Hex (with or without 0x) to bytes; null when it is not whole bytes of hex. */
export function fromHex(value: string): Uint8Array | null {
  const hex = value.startsWith("0x") || value.startsWith("0X") ? value.slice(2) : value;
  if (hex.length % 2 || !/^[0-9a-fA-F]*$/.test(hex)) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export const toHex = (bytes: Uint8Array): string => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

/** Standard or url-safe base64 to bytes; null when it is not base64. */
export function fromBase64(value: string): Uint8Array | null {
  const v = value.trim().replace(/-/g, "+").replace(/_/g, "/");
  if (!v || !/^[A-Za-z0-9+/]+={0,2}$/.test(v)) return null;
  try {
    const bin = atob(v.padEnd(Math.ceil(v.length / 4) * 4, "="));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

export const sha256d = (data: Uint8Array): Uint8Array => sha256(sha256(data));

/** Bitcoin's CompactSize (varint) of `n`. */
export function compactSize(n: number): Uint8Array {
  if (n < 0xfd) return Uint8Array.of(n);
  if (n <= 0xffff) return Uint8Array.of(0xfd, n & 0xff, n >> 8);
  return Uint8Array.of(0xfe, n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >>> 24) & 0xff);
}

/** A JSON-ish object's string field, or null. */
export function str(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}
