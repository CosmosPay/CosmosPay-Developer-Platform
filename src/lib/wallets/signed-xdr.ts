/* Checking a Stellar transaction someone signed in a wallet the page never connects to (product
   owner, 2026-10-27: people hand over a signed XDR, not their wallet). Shared by the browser (the
   private accounts' signing dialog, the wallet form) and the server (the wallet proof). Pure, and
   free of Node's Buffer, which a browser page does not have. */
import { TransactionBuilder, Keypair } from "@stellar/stellar-sdk";

export type SignedXdrProblem = "invalid" | "otherTransaction" | "notSigned";

/* A signature's hint and bytes: XDR wrappers holding `value` in stellar-sdk 17, raw bytes before. */
const bytesOf = (x: unknown): Uint8Array => (x instanceof Uint8Array ? x : new Uint8Array((x as { value: Uint8Array }).value));
const sameBytes = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((x, i) => x === b[i]);

/** When `xdr` stops being valid (ms since the epoch), or null when it has no upper bound. */
export function expiryOf(xdr: string, networkPassphrase: string): number | null {
  const max = Number(TransactionBuilder.fromXDR(xdr, networkPassphrase).timeBounds?.maxTime ?? 0);
  return max > 0 ? max * 1000 : null;
}

/**
 * `account`'s signature on `signedXdr`, when it is the transaction `unsignedXdr` (same hash) and
 * that signature verifies; otherwise why not.
 */
export function signatureOn(
  unsignedXdr: string,
  signedXdr: string,
  account: string,
  networkPassphrase: string,
): { ok: true; signature: Uint8Array } | { ok: false; problem: SignedXdrProblem } {
  let signed;
  try {
    signed = TransactionBuilder.fromXDR(signedXdr.trim(), networkPassphrase);
  } catch {
    return { ok: false, problem: "invalid" };
  }
  const expected = TransactionBuilder.fromXDR(unsignedXdr, networkPassphrase).hash();
  const got = signed.hash();
  if (!sameBytes(bytesOf(got), bytesOf(expected))) return { ok: false, problem: "otherTransaction" };
  let key: Keypair;
  try {
    key = Keypair.fromPublicKey(account);
  } catch {
    return { ok: false, problem: "notSigned" };
  }
  const hint = bytesOf(key.signatureHint());
  for (const s of signed.signatures) {
    if (!sameBytes(bytesOf(s.hint), hint)) continue;
    const signature = bytesOf(s.signature);
    if (key.verify(got, signature as never)) return { ok: true, signature };
  }
  return { ok: false, problem: "notSigned" };
}
