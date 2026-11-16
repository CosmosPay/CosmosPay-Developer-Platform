/* TON: TON Connect's `ton_proof`. The wallet signs, with its Ed25519 key,
     sha256(0xffff ++ "ton-connect" ++ sha256("ton-proof-item-v2/" ++ workchain(int32 BE) ++
       address hash ++ domain length (uint32 LE) ++ domain ++ timestamp (uint64 LE) ++ payload))
   and hands back its public key and its state init. The state init must hash to the address (a
   TON address IS that hash), and the key must be the one in its data (wallets v1 to v5 keep it at
   one of three offsets). The payload is the challenge's nonce, the domain this dashboard's host,
   and the timestamp inside the challenge's life. Server-only. */
import { ed25519 } from "@noble/curves/ed25519";
import { sha256 } from "@noble/hashes/sha2.js";
import { Address, Cell, loadStateInit } from "@ton/core";
import { concat, equalBytes, fromBase64, fromHex, str, utf8 } from "@/lib/wallet-proofs/bytes";

export interface TonProof {
  publicKey: string;
  walletStateInit: string;
  proof: { timestamp: number; domain: { lengthBytes: number; value: string }; payload: string; signature: string };
}

export interface TonExpectations {
  payload: string;
  domain: string;
  /** Seconds since the epoch the proof's timestamp must fall within. */
  notBefore: number;
  notAfter: number;
}

/** A ton_proof as the client sent it, or null when it is not one. */
export function readTonProof(value: unknown): TonProof | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const proof = v.proof as Record<string, unknown> | undefined;
  const domain = proof?.domain as Record<string, unknown> | undefined;
  const publicKey = str(v.publicKey);
  const walletStateInit = str(v.walletStateInit);
  if (!publicKey || !walletStateInit || !proof || !domain) return null;
  const timestamp = proof.timestamp;
  const lengthBytes = domain.lengthBytes;
  const value_ = str(domain.value);
  const payload = str(proof.payload);
  const signature = str(proof.signature);
  if (typeof timestamp !== "number" || !Number.isSafeInteger(timestamp) || typeof lengthBytes !== "number" || value_ === null || payload === null || signature === null) return null;
  return { publicKey, walletStateInit, proof: { timestamp, domain: { lengthBytes, value: value_ }, payload, signature } };
}

/* Where a wallet contract keeps its key: v1/v2 after the seqno, v3/v4 after seqno and subwallet,
   v5 after a flag bit, seqno and wallet id. */
const KEY_OFFSETS_BITS = [32, 64, 65];

function keyInStateInit(stateInit: Cell, publicKey: Uint8Array): boolean {
  const init = loadStateInit(stateInit.beginParse());
  const data = init.data;
  if (!data) return false;
  for (const offset of KEY_OFFSETS_BITS) {
    try {
      const slice = data.beginParse();
      if (slice.remainingBits < offset + 256) continue;
      slice.skip(offset);
      const key = slice.loadBuffer(32);
      if (equalBytes(new Uint8Array(key), publicKey)) return true;
    } catch {
      /* another layout */
    }
  }
  return false;
}

export function verifyTon(address: string, proof: TonProof, expected: TonExpectations): boolean {
  try {
    const p = proof.proof;
    if (p.payload !== expected.payload) return false;
    if (p.domain.value !== expected.domain || p.domain.lengthBytes !== utf8(p.domain.value).length) return false;
    if (p.timestamp < expected.notBefore || p.timestamp > expected.notAfter) return false;
    const publicKey = fromHex(proof.publicKey);
    const signature = fromBase64(p.signature);
    if (!publicKey || publicKey.length !== 32 || !signature || signature.length !== 64) return false;

    const parsed = Address.parse(address.trim());
    const stateInit = Cell.fromBase64(proof.walletStateInit);
    if (!equalBytes(new Uint8Array(stateInit.hash()), new Uint8Array(parsed.hash))) return false;
    if (!keyInStateInit(stateInit, publicKey)) return false;

    const wc = new Uint8Array(4);
    new DataView(wc.buffer).setInt32(0, parsed.workChain, false);
    const domain = utf8(p.domain.value);
    const dl = new Uint8Array(4);
    new DataView(dl.buffer).setUint32(0, domain.length, true);
    const ts = new Uint8Array(8);
    new DataView(ts.buffer).setBigUint64(0, BigInt(p.timestamp), true);
    const message = concat(utf8("ton-proof-item-v2/"), wc, new Uint8Array(parsed.hash), dl, domain, ts, utf8(p.payload));
    const full = concat(Uint8Array.of(0xff, 0xff), utf8("ton-connect"), sha256(message));
    return ed25519.verify(signature, sha256(full), publicKey);
  } catch {
    return false;
  }
}
