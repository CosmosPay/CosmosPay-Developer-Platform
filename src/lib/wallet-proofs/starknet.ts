/* Starknet: SNIP-12 (revision 1) typed data, signed by the account (Argent, Braavos and the
   rest are smart accounts). The message is fixed by the challenge: the organization, the nonce and
   the expiry, under the "Cosmos Pay" domain on SN_MAIN. Its hash is
     poseidon("StarkNet Message", hash(domain), account, hash(message))
   and the ACCOUNT says whether a signature over it is its own: `is_valid_signature` (Cairo 1,
   answering "VALID") or `isValidSignature` (Cairo 0, answering 1), called over RPC. No key is
   assumed: whatever the account's own validation accepts is the proof. Server-only; the RPC call
   is a parameter. */
import { keccak, poseidonHashMany } from "@scure/starknet";
import { utf8 } from "@/lib/wallet-proofs/bytes";

const MASK_250 = (1n << 250n) - 1n;
/** Starknet keccak: keccak-256 of the text, masked to 250 bits (type hashes, selectors). */
export const starknetKeccak = (text: string): bigint => keccak(utf8(text)) & MASK_250;

/** A short string (at most 31 ASCII characters) as a felt. */
export function shortString(text: string): bigint {
  if (text.length > 31 || !/^[\x00-\x7f]*$/.test(text)) throw new Error("not a short string");
  let n = 0n;
  for (const ch of text) n = (n << 8n) | BigInt(ch.charCodeAt(0));
  return n;
}

/* A `shortstring` value as the wallets encode it (starknet.js `getHex`): a decimal or 0x number is
   that number ("1" is 1, not the character), anything else its characters. */
const shortValue = (text: string): bigint => (/^(0x[0-9a-fA-F]+|\d+)$/.test(text) ? BigInt(text) : shortString(text));

const DOMAIN_TYPE = '"StarknetDomain"("name":"shortstring","version":"shortstring","chainId":"shortstring","revision":"shortstring")';
const PROOF_TYPE = '"WalletProof"("organization":"shortstring","nonce":"felt","expires":"u128")';

export const STARKNET_PROOF_DOMAIN = { name: "Cosmos Pay", version: "1", chainId: "SN_MAIN", revision: "1" } as const;

export interface StarknetProofMessage {
  organization: string;
  /** 0x + at most 62 hex, below the field's modulus. */
  nonce: string;
  /** Unix seconds. */
  expires: number;
}

/** The SNIP-12 typed data a wallet is asked to sign, in the shape `account.signMessage` takes. */
export function starknetTypedData(message: StarknetProofMessage) {
  return {
    types: {
      StarknetDomain: [
        { name: "name", type: "shortstring" },
        { name: "version", type: "shortstring" },
        { name: "chainId", type: "shortstring" },
        { name: "revision", type: "shortstring" },
      ],
      WalletProof: [
        { name: "organization", type: "shortstring" },
        { name: "nonce", type: "felt" },
        { name: "expires", type: "u128" },
      ],
    },
    primaryType: "WalletProof",
    domain: { ...STARKNET_PROOF_DOMAIN },
    message: { ...message },
  };
}

/** The hash the account signs for `message`, as `account` (0x hex). */
export function starknetMessageHash(account: string, message: StarknetProofMessage): bigint {
  const domainHash = poseidonHashMany([
    starknetKeccak(DOMAIN_TYPE),
    shortValue(STARKNET_PROOF_DOMAIN.name),
    shortValue(STARKNET_PROOF_DOMAIN.version),
    shortValue(STARKNET_PROOF_DOMAIN.chainId),
    shortValue(STARKNET_PROOF_DOMAIN.revision),
  ]);
  const messageHash = poseidonHashMany([starknetKeccak(PROOF_TYPE), shortValue(message.organization), BigInt(message.nonce), BigInt(message.expires)]);
  return poseidonHashMany([shortString("StarkNet Message"), domainHash, BigInt(account), messageHash]);
}

/** `starknet_call` on mainnet: the felts the contract answered, or null when the call failed. */
export type StarknetCall = (contract: string, selector: string, calldata: string[]) => Promise<string[] | null>;

const VALID = 0x56414c4944n; // "VALID"
const hex = (n: bigint) => `0x${n.toString(16)}`;

/** The signature as felts (0x hex or decimal strings); null when it is not one. */
export function readStarknetSignature(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 16) return null;
  const out: string[] = [];
  for (const v of value) {
    if (typeof v !== "string" || !/^(0x[0-9a-fA-F]{1,64}|\d{1,78})$/.test(v)) return null;
    out.push(hex(BigInt(v)));
  }
  return out;
}

export async function verifyStarknet(account: string, message: StarknetProofMessage, signature: string[], call: StarknetCall): Promise<boolean> {
  let hash: bigint;
  try {
    hash = starknetMessageHash(account, message);
  } catch {
    return false;
  }
  const calldata = [hex(hash), hex(BigInt(signature.length)), ...signature];
  const cairo1 = await call(account, hex(starknetKeccak("is_valid_signature")), calldata);
  if (cairo1 && cairo1.length > 0 && BigInt(cairo1[0]) === VALID) return true;
  if (cairo1) return false;
  const cairo0 = await call(account, hex(starknetKeccak("isValidSignature")), calldata);
  return !!cairo0 && cairo0.length > 0 && BigInt(cairo0[0]) === 1n;
}
