/* Bitcoin and the coins that copied its message signing. Server-only, pure.
   - Legacy `signmessage` / BIP-137: a 65-byte compact signature (base64) over
     sha256d(varint(magic) magic varint(message) message); its header byte says how the recovered
     key makes the address (P2PKH uncompressed 27-30, compressed 31-34, P2SH-P2WPKH 35-38, P2WPKH
     39-42). Bitcoin Core, Litecoin Core, Dogecoin Core, Dash Core, zcashd, Electron Cash, Electrum
     and the browser wallets that sign "ECDSA" messages make these. Many wallets (Electrum among
     them) mark a SegWit key with 31-34, so a compressed key's header admits its three addresses.
   - BIP-322 "simple" (Bitcoin only): the witness that spends the message's virtual transaction,
     base64; P2WPKH, P2SH-P2WPKH and P2TR (key path). This is what Sparrow, Unisat, Xverse, Leather
     and OKX produce for SegWit and Taproot addresses.
   Each coin's magic and address versions are the ones its own node software uses. Bitcoin Cash
   keeps Bitcoin's magic and is addressed in CashAddr; a Zcash transparent address has two version
   bytes. Multisig (P2SH, P2WSH) and Zcash unified addresses cannot sign a simple message. */
import { secp256k1, schnorr } from "@noble/curves/secp256k1";
import { sha256 } from "@noble/hashes/sha2.js";
import { ripemd160 } from "@noble/hashes/legacy.js";
import { base58check, bech32, bech32m } from "@scure/base";
import { OutScript, RawWitness, Transaction, Script } from "@scure/btc-signer";
import { compactSize, concat, equalBytes, fromBase64, sha256d, utf8 } from "@/lib/wallet-proofs/bytes";

export type BitcoinFamily = "btc" | "ltc" | "doge" | "bch" | "dash" | "zec";

interface CoinRules {
  magic: string;
  p2pkh: number[];
  /** P2SH versions (Litecoin keeps the old `3…` beside `M…`). */
  p2sh: number[][];
  bech32?: string;
  cashaddr?: string;
}

export const COIN_RULES: Record<BitcoinFamily, CoinRules> = {
  btc: { magic: "Bitcoin Signed Message:\n", p2pkh: [0x00], p2sh: [[0x05]], bech32: "bc" },
  ltc: { magic: "Litecoin Signed Message:\n", p2pkh: [0x30], p2sh: [[0x32], [0x05]], bech32: "ltc" },
  doge: { magic: "Dogecoin Signed Message:\n", p2pkh: [0x1e], p2sh: [[0x16]] },
  bch: { magic: "Bitcoin Signed Message:\n", p2pkh: [0x00], p2sh: [[0x05]], cashaddr: "bitcoincash" },
  dash: { magic: "DarkCoin Signed Message:\n", p2pkh: [0x4c], p2sh: [[0x10]] },
  zec: { magic: "Zcash Signed Message:\n", p2pkh: [0x1c, 0xb8], p2sh: [[0x1c, 0xbd]] },
};

type Decoded =
  | { kind: "p2pkh"; hash: Uint8Array }
  | { kind: "p2sh"; hash: Uint8Array }
  | { kind: "p2wpkh"; hash: Uint8Array }
  | { kind: "p2wsh"; hash: Uint8Array }
  | { kind: "p2tr"; key: Uint8Array };

const hash160 = (data: Uint8Array) => ripemd160(sha256(data));
const b58 = base58check(sha256);
const sameStart = (bytes: Uint8Array, prefix: number[]) => prefix.every((b, i) => bytes[i] === b);

/* CashAddr (Bitcoin Cash): base32 with a BCH-style checksum over the prefix. */
const CASH_CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
function cashPolymod(values: number[]): bigint {
  const gen = [0x98f2bc8e61n, 0x79b76d99e2n, 0xf33e5fb3c4n, 0xae2eabe2a8n, 0x1e4f43e470n];
  let c = 1n;
  for (const d of values) {
    const c0 = c >> 35n;
    c = ((c & 0x07ffffffffn) << 5n) ^ BigInt(d);
    for (let i = 0; i < 5; i++) if ((c0 >> BigInt(i)) & 1n) c ^= gen[i];
  }
  return c ^ 1n;
}
function decodeCashAddr(address: string, prefix: string): Decoded | null {
  const lower = address.toLowerCase();
  if (address !== lower && address !== address.toUpperCase()) return null;
  const payload = lower.startsWith(`${prefix}:`) ? lower.slice(prefix.length + 1) : lower;
  const data: number[] = [];
  for (const ch of payload) {
    const v = CASH_CHARSET.indexOf(ch);
    if (v < 0) return null;
    data.push(v);
  }
  const prefixData = [...prefix].map((c) => c.charCodeAt(0) & 0x1f);
  if (cashPolymod([...prefixData, 0, ...data]) !== 0n) return null;
  // 5-bit words to bytes, dropping the 8-word checksum.
  const words = data.slice(0, -8);
  let acc = 0;
  let bits = 0;
  const bytes: number[] = [];
  for (const w of words) {
    acc = (acc << 5) | w;
    bits += 5;
    while (bits >= 8) {
      bits -= 8;
      bytes.push((acc >> bits) & 0xff);
    }
  }
  if (bytes.length !== 21) return null;
  const version = bytes[0];
  const hash = Uint8Array.from(bytes.slice(1));
  if (version === 0x00) return { kind: "p2pkh", hash };
  if (version === 0x08) return { kind: "p2sh", hash };
  return null;
}

/** An address of `coin`, decoded; null when it is not one this module can check. */
export function decodeAddress(coin: BitcoinFamily, address: string): Decoded | null {
  const rules = COIN_RULES[coin];
  const a = address.trim();
  if (rules.cashaddr) return decodeCashAddr(a, rules.cashaddr);
  if (rules.bech32 && a.toLowerCase().startsWith(`${rules.bech32}1`)) {
    const lower = a.toLowerCase();
    if (a !== lower && a !== a.toUpperCase()) return null;
    try {
      const { words } = bech32.decode(lower as `${string}1${string}`);
      if (words[0] === 0) {
        const program = Uint8Array.from(bech32.fromWords(words.slice(1)));
        if (program.length === 20) return { kind: "p2wpkh", hash: program };
        if (program.length === 32) return { kind: "p2wsh", hash: program };
        return null;
      }
    } catch {
      /* not bech32: maybe bech32m (Taproot) */
    }
    try {
      const { words } = bech32m.decode(lower as `${string}1${string}`);
      if (words[0] !== 1) return null;
      const program = Uint8Array.from(bech32m.fromWords(words.slice(1)));
      return program.length === 32 ? { kind: "p2tr", key: program } : null;
    } catch {
      return null;
    }
  }
  let raw: Uint8Array;
  try {
    raw = b58.decode(a);
  } catch {
    return null;
  }
  const pkh = rules.p2pkh;
  if (raw.length === pkh.length + 20 && sameStart(raw, pkh)) return { kind: "p2pkh", hash: raw.slice(pkh.length) };
  for (const v of rules.p2sh) {
    if (raw.length === v.length + 20 && sameStart(raw, v)) return { kind: "p2sh", hash: raw.slice(v.length) };
  }
  return null;
}

/** The digest a legacy / BIP-137 signature covers for `coin`. */
export function messageDigest(coin: BitcoinFamily, message: string): Uint8Array {
  const magic = utf8(COIN_RULES[coin].magic);
  const body = utf8(message);
  return sha256d(concat(compactSize(magic.length), magic, compactSize(body.length), body));
}

/** Whether a 65-byte compact signature over `message` was made by the key behind `address`. */
export function verifyCompactSignature(coin: BitcoinFamily, address: string, message: string, signatureB64: string): boolean {
  const sig = fromBase64(signatureB64);
  const decoded = decodeAddress(coin, address);
  if (!sig || sig.length !== 65 || !decoded) return false;
  const header = sig[0];
  if (header < 27 || header > 42) return false;
  const recovery = (header - 27) & 3;
  let point;
  try {
    point = secp256k1.Signature.fromCompact(sig.slice(1)).addRecoveryBit(recovery).recoverPublicKey(messageDigest(coin, message));
  } catch {
    return false;
  }
  const compressed = header >= 31;
  const pub = point.toRawBytes(compressed);
  const pkh = hash160(pub);
  const nestedHash = hash160(concat(Uint8Array.of(0x00, 0x14), pkh));
  const kindsFor = header < 31 ? ["p2pkh"] : header < 35 ? ["p2pkh", "p2sh", "p2wpkh"] : header < 39 ? ["p2sh"] : ["p2wpkh"];
  if (!kindsFor.includes(decoded.kind)) return false;
  if (decoded.kind === "p2pkh") return equalBytes(decoded.hash, pkh);
  if (decoded.kind === "p2sh") return compressed && equalBytes(decoded.hash, nestedHash);
  if (decoded.kind === "p2wpkh") return compressed && equalBytes(decoded.hash, pkh);
  return false;
}

/* BIP-322 "simple": the tagged message hash, the virtual to_spend / to_sign transactions, and the
   witness checked against the address' script with the sighash a spend of it would use. */
const BIP322_TAG = sha256(utf8("BIP0322-signed-message"));
const bip322Hash = (message: string) => sha256(concat(BIP322_TAG, BIP322_TAG, utf8(message)));

function scriptFor(decoded: Decoded): Uint8Array {
  if (decoded.kind === "p2wpkh") return OutScript.encode({ type: "wpkh", hash: decoded.hash });
  if (decoded.kind === "p2sh") return OutScript.encode({ type: "sh", hash: decoded.hash });
  if (decoded.kind === "p2tr") return OutScript.encode({ type: "tr", pubkey: decoded.key });
  if (decoded.kind === "p2wsh") return OutScript.encode({ type: "wsh", hash: decoded.hash });
  return OutScript.encode({ type: "pkh", hash: decoded.hash });
}

function virtualTxs(message: string, scriptPubKey: Uint8Array) {
  const toSpend = new Transaction({ version: 0, allowUnknownVersion: true, allowUnknownOutputs: true, allowUnknownInputs: true, disableScriptCheck: true });
  // The output first: an input carrying its final scriptSig marks the transaction as signed.
  toSpend.addOutput({ script: scriptPubKey, amount: 0n });
  toSpend.addInput({ txid: new Uint8Array(32), index: 0xffffffff, sequence: 0, finalScriptSig: Script.encode(["OP_0", bip322Hash(message)]) });
  const toSign = new Transaction({ version: 0, allowUnknownVersion: true, allowUnknownOutputs: true, allowUnknownInputs: true, disableScriptCheck: true });
  toSign.addOutput({ script: Script.encode(["RETURN"]), amount: 0n });
  toSign.addInput({ txid: toSpend.id, index: 0, sequence: 0, witnessUtxo: { script: scriptPubKey, amount: 0n } });
  return toSign;
}

/** Whether a BIP-322 simple signature (base64 witness) over `message` is valid for `address` (Bitcoin). */
export function verifyBip322Simple(address: string, message: string, signatureB64: string): boolean {
  const raw = fromBase64(signatureB64);
  const decoded = decodeAddress("btc", address);
  if (!raw || !decoded) return false;
  let witness: Uint8Array[];
  try {
    witness = RawWitness.decode(raw);
  } catch {
    return false;
  }
  try {
    if (decoded.kind === "p2wpkh" || decoded.kind === "p2sh") {
      if (witness.length !== 2) return false;
      const [sigWithType, pub] = witness;
      if (pub.length !== 33 || sigWithType[sigWithType.length - 1] !== 0x01) return false;
      const pkh = hash160(pub);
      if (decoded.kind === "p2wpkh" && !equalBytes(decoded.hash, pkh)) return false;
      if (decoded.kind === "p2sh" && !equalBytes(decoded.hash, hash160(concat(Uint8Array.of(0x00, 0x14), pkh)))) return false;
      const tx = virtualTxs(message, scriptFor(decoded));
      const scriptCode = OutScript.encode({ type: "pkh", hash: pkh });
      const digest = tx.preimageWitnessV0(0, scriptCode, 0x01, 0n);
      return secp256k1.verify(secp256k1.Signature.fromDER(sigWithType.slice(0, -1)), digest, pub, { prehash: false, lowS: false });
    }
    if (decoded.kind === "p2tr") {
      if (witness.length !== 1) return false;
      const sig = witness[0];
      if (sig.length !== 64 && !(sig.length === 65 && sig[64] === 0x01)) return false;
      const hashType = sig.length === 64 ? 0x00 : 0x01;
      const script = scriptFor(decoded);
      const tx = virtualTxs(message, script);
      const digest = tx.preimageWitnessV1(0, [script], hashType, [0n]);
      return schnorr.verify(sig.slice(0, 64), digest, decoded.key);
    }
  } catch {
    return false;
  }
  return false;
}

/** A Bitcoin-family proof: BIP-322 simple when the signature is a witness, else a compact signature. */
export function verifyBitcoinFamily(coin: BitcoinFamily, address: string, message: string, signatureB64: string): boolean {
  const raw = fromBase64(signatureB64);
  if (!raw) return false;
  if (raw.length === 65) return verifyCompactSignature(coin, address, message, signatureB64);
  return coin === "btc" && verifyBip322Simple(address, message, signatureB64);
}

/** Whether an address of `coin` can sign a simple message at all (multisig and Zcash unified cannot). */
export function canSignMessage(coin: BitcoinFamily, address: string): boolean {
  const decoded = decodeAddress(coin, address);
  if (!decoded) return false;
  if (decoded.kind === "p2wsh") return false;
  // A P2SH address may be a single key wrapped in SegWit (it signs) or a multisig (it cannot);
  // only the signature tells, so it is offered.
  return true;
}

export { hash160 };
