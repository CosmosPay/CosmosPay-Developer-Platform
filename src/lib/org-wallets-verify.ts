/* Checks a wallet's proof (src/lib/org-wallets.ts): the signature over the challenge must come
   from the address being connected. Server-only. One scheme per network, each the one its wallets
   implement (the newer ones live in src/lib/wallet-proofs, tested against each network's own
   libraries in tests/unit/walletProofs.test.ts):
   - Stellar: SEP-53 (Freighter's signMessage), Ed25519 over SHA-256("Stellar Signed Message:\n" + text),
     or the proof transaction signed in any wallet (src/lib/wallets/wallet-proof-xdr.ts).
   - Solana and Fogo: Ed25519 over the text's UTF-8 bytes (Phantom's and Solflare's signMessage).
   - Monad and every other EVM network (EIP-191 personal_sign), secp256k1 over keccak-256 of the
     prefixed text; the signer's address is recovered from the signature and compared.
   - Tron TIP-191, TON ton_proof, NEAR NEP-413 (and the account's full-access keys), Sui personal
     message, Aptos and Movement AIP-62 (and the account's authentication key), Starknet SNIP-12
     (the account contract's own check), Cardano CIP-30 / CIP-8, XRP Ledger keypairs, Aleo,
     Bitcoin BIP-322 and BIP-137, and the Bitcoin family's legacy signmessage.
   An address that cannot sign (`addedByAddress`) has no signature to check: the route takes it
   typed twice instead. Signatures arrive as base64 (Stellar, Solana, Sui, the Bitcoin family),
   0x-hex (EVM, Tron) or the network's own text (Aleo); the rest as a `proof` object. Anything
   malformed is a failed proof, never an exception; a chain read that cannot be made throws
   ProofNetworkError (src/lib/wallet-proofs/rpc.ts). */
import { createHash, createPublicKey, verify } from "node:crypto";
import { Keypair } from "@stellar/stellar-sdk";
import { secp256k1 } from "@noble/curves/secp256k1";
import { keccak_256 } from "@noble/hashes/sha3.js";
import type { NetworkId } from "@/lib/chains";
import { PROOF_MAX_SKEW_MS, WALLET_PROVIDERS, walletProofMessage, type WalletChallenge, type WalletProvider } from "@/lib/org-wallets";
import { checkWalletProofXdr } from "@/lib/wallets/wallet-proof-xdr";
import { verifyTron } from "@/lib/wallet-proofs/tron";
import { readTonProof, verifyTon } from "@/lib/wallet-proofs/ton";
import { readNearProof, verifyNear, type NearRpc } from "@/lib/wallet-proofs/near";
import { verifySui } from "@/lib/wallet-proofs/sui";
import { readAptosProof, verifyAptos, type AptosAuthKeyReader } from "@/lib/wallet-proofs/aptos";
import { readStarknetSignature, starknetProofMessage, verifyStarknet, type StarknetCall } from "@/lib/wallet-proofs/starknet";
import { readCardanoProof, verifyCardano } from "@/lib/wallet-proofs/cardano";
import { verifyXrpl } from "@/lib/wallet-proofs/xrpl";
import { readAleoSignature, verifyAleo } from "@/lib/wallet-proofs/aleo";
import { verifyBip322Simple, verifyCompactSignature, type BitcoinFamily } from "@/lib/wallet-proofs/bitcoin";
import { str } from "@/lib/wallet-proofs/bytes";
import { ProofNetworkError } from "@/lib/wallet-proofs/rpc";

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

/** Whether `signature` over `message` was made by `address` on `chain` (Stellar's SEP-53, Solana's and Fogo's Ed25519, EIP-191). */
export function verifyWalletProof(chain: NetworkId, address: string, message: string, signature: string): boolean {
  try {
    const providers = WALLET_PROVIDERS[chain];
    if (!providers) return false;
    if (chain === "stellar") return verifyStellar(address, message, signature);
    if (providers.includes("phantom")) return verifySolana(address, message, signature);
    if (!providers.includes("evm")) return false;
    return recoverEvmSigner(message, signature) === address.trim().toLowerCase();
  } catch {
    return false;
  }
}

/** What the client sends as the proof: a signature, a signed Stellar XDR, or a network's proof object. */
export interface OwnershipProof {
  provider?: WalletProvider;
  signature?: string;
  signedXdr?: string;
  proof?: Record<string, unknown>;
}

/** The chain reads and the host some proofs need (src/lib/wallet-proofs/rpc.ts in the route). */
export interface ProofContext {
  /** The dashboard's host: TON Connect's proof domain and NEAR's recipient. */
  host: string;
  near: NearRpc;
  aptos: AptosAuthKeyReader;
  movement: AptosAuthKeyReader;
  starknet: StarknetCall;
}

const BITCOIN_FAMILY = new Set<NetworkId>(["btc", "ltc", "doge", "bch", "dash", "zec"]);
const seconds = (iso: string) => Math.floor(Date.parse(iso) / 1000);

/** Whether `input` proves that `address`, on the challenge's network, signed that challenge. */
export async function verifyOwnershipProof(challenge: WalletChallenge, address: string, input: OwnershipProof, ctx: ProofContext): Promise<boolean> {
  const { chain, orgId, nonce, issuedAt, expiresAt } = challenge;
  const message = walletProofMessage({ orgId, chain, address, nonce, issuedAt, expiresAt });
  if (input.signedXdr) return chain === "stellar" && checkWalletProofXdr({ orgId, address, nonce, issuedAt, expiresAt }, input.signedXdr).ok;
  const provider = input.provider;
  if (!provider || !WALLET_PROVIDERS[chain]?.includes(provider)) return false;
  const signature = input.signature ?? "";
  const proof = input.proof ?? {};
  try {
    switch (provider) {
      case "freighter":
      case "phantom":
      case "solflare":
      case "evm":
        return verifyWalletProof(chain, address, message, signature);
      case "tip191":
        return verifyTron(address, message, signature);
      case "tonproof": {
        const p = readTonProof(proof);
        return !!p && verifyTon(address, p, { payload: nonce, domain: ctx.host, notBefore: seconds(issuedAt) - PROOF_MAX_SKEW_MS / 1000, notAfter: seconds(expiresAt) });
      }
      case "nep413": {
        const p = readNearProof(proof);
        return !!p && (await verifyNear(address, p, { message, nonce, recipient: ctx.host }, ctx.near));
      }
      case "sui":
        return verifySui(address, message, signature);
      case "aip62": {
        const p = readAptosProof(proof);
        return !!p && (await verifyAptos(address, message, nonce, p, chain === "movement" ? ctx.movement : ctx.aptos));
      }
      case "snip12": {
        const sig = readStarknetSignature(proof.signature);
        return !!sig && (await verifyStarknet(address, starknetProofMessage(challenge), sig, ctx.starknet));
      }
      case "cip30": {
        const p = readCardanoProof(proof);
        return !!p && verifyCardano(address, message, p);
      }
      case "xrpl": {
        const publicKey = str(proof.publicKey);
        return !!publicKey && verifyXrpl(address, message, publicKey, str(proof.signature) ?? signature);
      }
      case "aleo": {
        const sig = readAleoSignature(input.signature ?? proof.signature);
        return !!sig && verifyAleo(address, message, sig);
      }
      case "bip322":
        return chain === "btc" && verifyBip322Simple(address, message, signature);
      case "signmessage":
        return BITCOIN_FAMILY.has(chain) && verifyCompactSignature(chain as BitcoinFamily, address, message, signature);
      default:
        return false;
    }
  } catch (err) {
    if (err instanceof ProofNetworkError) throw err;
    return false;
  }
}
