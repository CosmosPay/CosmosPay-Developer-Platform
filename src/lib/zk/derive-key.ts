/* The confidential key, derived from a Freighter signature as the protocol prescribes
   (stellar-confidential docs/sdk/key-derivation.md, signer roots): the root is a SEP-53 signature
   over a message bound to the token and the account, and the SDK's `deriveSk` turns it into `sk`.
   Every conformant client derives the same `sk` for the same (token, account), so the account is
   recoverable from the Stellar key alone, on any device.

   The obligations the SDK leaves to its caller live here: the signature is verified against the
   account's key (a Freighter with another account selected would otherwise give a wrong but
   usable key), it is requested twice and compared (a non-deterministic signer could never
   recover the account), and it is never stored. */
import { Keypair } from "@stellar/stellar-sdk";
import { deriveSk, sep53Payload, skSigningMessage } from "stellar-confidential-token-sdk";
import type { MessageSigner } from "@/lib/zk/freighter-signer";

const sameBytes = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((x, i) => x === b[i]);

export class KeyDerivationError extends Error {}

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
