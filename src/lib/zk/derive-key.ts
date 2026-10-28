/* The confidential key, from one of two roots, each turned into `sk` by the SDK's `deriveSk`:

   - the protocol's signer root (stellar-confidential docs/sdk/key-derivation.md, signer roots): a
     SEP-53 signature over a message bound to the token and the account. Every conformant client
     derives the same `sk` from it. It needs a wallet that signs messages (Freighter), and is what
     the private checkout falls back to for the accounts created with it;
   - the transaction root: the signature of the fixed key transaction (src/lib/zk/xdr-signer.ts),
     which any Stellar wallet can give, so an account is opened from a signed XDR (product owner,
     2026-10-27). The private accounts table uses it alone and the private checkout first, so an
     account created in either opens in both. Every Cosmos Pay client derives the
     same `sk` from it; another client of the protocol would not, so an account created this way
     is opened here.

   Either way the account is recoverable from the Stellar key alone, on any device. The obligations
   the SDK leaves to its caller live here: the signature is verified against the account's key (a
   wallet with another account selected would otherwise give a wrong but usable key), and it is
   never stored. The SEP-53 root is requested twice and compared for an account not created yet, as
   the protocol asks of a message signer. The transaction root is signed once (product owner,
   2026-10-27: one signed XDR from the customer): a Stellar signature is Ed25519, deterministic by
   definition (RFC 8032), so the same transaction always gives the same signature. */
import { Keypair } from "@stellar/stellar-sdk";
import { deriveSk, sep53Payload, skSigningMessage } from "stellar-confidential-token-sdk";
import type { MessageSigner } from "@/lib/zk/freighter-signer";
import { keyTransactionXdr, signatureOn, type SignPurpose } from "@/lib/zk/xdr-signer";

const sameBytes = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((x, i) => x === b[i]);

export class KeyDerivationError extends Error {}

/** A signer of transactions, which may say what the next signature is for. `signerKey` signs for
 *  `publicKey` when it is not the account itself (a sub-account's base). */
export interface TransactionSigner {
  publicKey: string;
  signerKey?: string;
  sign(txXdrBase64: string): Promise<string>;
  prepare?(purpose: SignPurpose): void;
}

/** Derive this account's `sk` on `token` from two identical Freighter signatures. */
export async function deriveSignerRootSk(signer: MessageSigner, token: string): Promise<bigint> {
  const account = signer.publicKey;
  const message = skSigningMessage(token, account);
  // Printable ASCII apart from its two newlines, so the text Freighter signs is these bytes.
  const text = new TextDecoder().decode(message);
  const payload = sep53Payload(message);
  const key = Keypair.fromPublicKey(account);
  const roots: Uint8Array[] = [];
  for (let i = 0; i < 2; i++) {
    const root = await signer.signMessage(text);
    if (!key.verify(payload as Buffer, root as Buffer)) {
      throw new KeyDerivationError("The wallet's signature does not match this account, so no key was derived");
    }
    roots.push(root);
  }
  if (!sameBytes(roots[0], roots[1])) {
    throw new KeyDerivationError("The wallet returned two different signatures for the same message, so no recoverable key could be derived");
  }
  return deriveSk(roots[0], token, account).sk;
}

/** Derive this account's `sk` on `token` from its one signature of the key transaction: the
 *  account's own, or its signer's for a sub-account (the base signs the sub-account's). */
export async function deriveTransactionRootSk(signer: TransactionSigner, token: string, networkPassphrase: string): Promise<bigint> {
  const account = signer.publicKey;
  const xdr = keyTransactionXdr(token, account, networkPassphrase);
  signer.prepare?.("key");
  const check = signatureOn(xdr, await signer.sign(xdr), signer.signerKey ?? account, networkPassphrase);
  if (!check.ok) throw new KeyDerivationError("The signed key transaction is not this account's signature of it, so no key was derived");
  return deriveSk(check.signature, token, account).sk;
}
