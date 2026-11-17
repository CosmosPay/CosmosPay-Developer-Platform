/* Cardano: CIP-30 `signData(address, hex(message))`, which answers CIP-8 / COSE: a COSE_Sign1
   (`signature`) and the COSE_Key it was made with (`key`). The wallet signs
     Sig_structure = ["Signature1", protected header bytes, h'', payload]
   with the Ed25519 key of the address's payment credential. Checked here: the protected header
   names EdDSA and exactly this address, the payload is the message (or, when the header says
   `hashed`, its BLAKE2b-224), the signature holds for the COSE_Key, and BLAKE2b-224 of that key is
   the address's payment key hash. Only Shelley payment addresses whose payment part is a key
   (base, pointer, enterprise) can sign; a script address cannot and is refused. Server-only, pure. */
import { ed25519 } from "@noble/curves/ed25519";
import { blake2b } from "@noble/hashes/blake2.js";
import { bech32 } from "@scure/base";
import { concat, equalBytes, fromHex, str, utf8 } from "@/lib/wallet-proofs/bytes";

export interface CardanoProof {
  /** COSE_Sign1, hex. */
  signature: string;
  /** COSE_Key, hex. */
  key: string;
}

export function readCardanoProof(value: unknown): CardanoProof | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const signature = str(v.signature);
  const key = str(v.key);
  return signature && key ? { signature, key } : null;
}

/* ── A minimal CBOR reader: what COSE_Sign1 and COSE_Key use, nothing else (no tags, no floats,
   no indefinite lengths). A map keeps its keys as numbers or strings. ── */
type Cbor = number | bigint | string | Uint8Array | boolean | null | Cbor[] | Map<number | string, Cbor>;

class Reader {
  at = 0;
  readonly bytes: Uint8Array;
  constructor(bytes: Uint8Array) {
    this.bytes = bytes;
  }
  private take(n: number): Uint8Array {
    if (this.at + n > this.bytes.length) throw new Error("cbor: truncated");
    const out = this.bytes.subarray(this.at, this.at + n);
    this.at += n;
    return out;
  }
  private length(info: number): number {
    if (info < 24) return info;
    const size = info === 24 ? 1 : info === 25 ? 2 : info === 26 ? 4 : info === 27 ? 8 : 0;
    if (!size) throw new Error("cbor: unsupported length");
    let n = 0n;
    for (const b of this.take(size)) n = (n << 8n) | BigInt(b);
    if (n > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("cbor: too large");
    return Number(n);
  }
  read(depth = 0): Cbor {
    if (depth > 8) throw new Error("cbor: too deep");
    const head = this.take(1)[0];
    const major = head >> 5;
    const info = head & 0x1f;
    switch (major) {
      case 0:
        return this.length(info);
      case 1:
        return -1 - this.length(info);
      case 2:
        return this.take(this.length(info)).slice();
      case 3:
        return new TextDecoder("utf-8", { fatal: true }).decode(this.take(this.length(info)));
      case 4: {
        const n = this.length(info);
        if (n > 64) throw new Error("cbor: array too long");
        return Array.from({ length: n }, () => this.read(depth + 1));
      }
      case 5: {
        const n = this.length(info);
        if (n > 64) throw new Error("cbor: map too long");
        const map = new Map<number | string, Cbor>();
        for (let i = 0; i < n; i++) {
          const key = this.read(depth + 1);
          if (typeof key !== "number" && typeof key !== "string") throw new Error("cbor: map key");
          map.set(key, this.read(depth + 1));
        }
        return map;
      }
      case 7:
        if (info === 20) return false;
        if (info === 21) return true;
        if (info === 22) return null;
        throw new Error("cbor: unsupported simple value");
      default:
        throw new Error("cbor: unsupported type");
    }
  }
}

function decodeCbor(bytes: Uint8Array): Cbor {
  const reader = new Reader(bytes);
  const value = reader.read();
  if (reader.at !== bytes.length) throw new Error("cbor: trailing bytes");
  return value;
}

function head(major: number, length: number): Uint8Array {
  if (length < 24) return Uint8Array.of((major << 5) | length);
  if (length < 0x100) return Uint8Array.of((major << 5) | 24, length);
  if (length < 0x10000) return Uint8Array.of((major << 5) | 25, length >> 8, length & 0xff);
  return Uint8Array.of((major << 5) | 26, (length >>> 24) & 0xff, (length >> 16) & 0xff, (length >> 8) & 0xff, length & 0xff);
}
const cborBytes = (b: Uint8Array) => concat(head(2, b.length), b);
const cborText = (s: string) => {
  const b = utf8(s);
  return concat(head(3, b.length), b);
};

/* ── Addresses ── */
const PAYMENT_KEY_TYPES = new Set([0, 2, 4, 6]); // base (key, key), base (key, script), pointer (key), enterprise (key)
const MAINNET = 1;

/** A Shelley mainnet address's bytes and payment key hash, or null when it cannot sign. */
export function cardanoPaymentKeyHash(address: string): { bytes: Uint8Array; keyHash: Uint8Array } | null {
  try {
    const { prefix, words } = bech32.decode(address.trim() as `${string}1${string}`, 200);
    if (prefix !== "addr") return null;
    const bytes = bech32.fromWords(words);
    if (bytes.length < 29) return null;
    const type = bytes[0] >> 4;
    if (!PAYMENT_KEY_TYPES.has(type) || (bytes[0] & 0x0f) !== MAINNET) return null;
    return { bytes, keyHash: bytes.slice(1, 29) };
  } catch {
    return null;
  }
}

const ALG = 1;
const EDDSA = -8;

export function verifyCardano(address: string, message: string, proof: CardanoProof): boolean {
  try {
    const addr = cardanoPaymentKeyHash(address);
    const signBytes = fromHex(proof.signature);
    const keyBytes = fromHex(proof.key);
    if (!addr || !signBytes || !keyBytes) return false;

    const sign1 = decodeCbor(signBytes);
    if (!Array.isArray(sign1) || sign1.length !== 4) return false;
    const [protectedBytes, unprotected, payload, signature] = sign1;
    if (!(protectedBytes instanceof Uint8Array) || !(unprotected instanceof Map) || !(signature instanceof Uint8Array)) return false;
    if (!(payload instanceof Uint8Array) || signature.length !== 64) return false;

    const header = decodeCbor(protectedBytes);
    if (!(header instanceof Map) || header.get(ALG) !== EDDSA) return false;
    const signedAddress = header.get("address");
    if (!(signedAddress instanceof Uint8Array) || !equalBytes(signedAddress, addr.bytes)) return false;

    const body = utf8(message);
    const hashed = unprotected.get("hashed") === true;
    if (!equalBytes(payload, hashed ? blake2b(body, { dkLen: 28 }) : body)) return false;

    const coseKey = decodeCbor(keyBytes);
    if (!(coseKey instanceof Map)) return false;
    // kty OKP (1), crv Ed25519 (6); alg, when present, EdDSA.
    if (coseKey.get(1) !== 1 || coseKey.get(-1) !== 6) return false;
    if (coseKey.has(3) && coseKey.get(3) !== EDDSA) return false;
    const publicKey = coseKey.get(-2);
    if (!(publicKey instanceof Uint8Array) || publicKey.length !== 32) return false;
    if (!equalBytes(blake2b(publicKey, { dkLen: 28 }), addr.keyHash)) return false;

    const sigStructure = concat(head(4, 4), cborText("Signature1"), cborBytes(protectedBytes), cborBytes(new Uint8Array(0)), cborBytes(payload));
    return ed25519.verify(signature, sigStructure, publicKey);
  } catch {
    return false;
  }
}
