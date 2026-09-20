/* account-signers.ts — who may currently sign for a Stellar account, read from Horizon.

   ## Why anything here needs this

   Every wallet-auth challenge is signed by "the account's key", and for almost every wallet
   that is the master key, whose public key IS the address. A wallet that has been RECOVERED
   is the exception: SEP-30 recovery puts a new device key on the account and takes the old
   master key to weight 0, and the address — which is the old master key — stops being able
   to sign for itself. Verifying against the address alone would lock a recovered wallet out
   of the very platform that recorded its recovery.

   So the rule is the same one SEP-10 uses: a signature counts when it comes from a signer
   the ACCOUNT currently lists, with enough weight to reach its own threshold.

   ## The two limits, both deliberate

   - **Only the network this deployment is configured for.** An address that exists on
     mainnet can ALSO be created on testnet by anyone — `createAccount` needs no key of the
     recipient — and its creator can put their own signer on it. Letting a caller say which
     network to check would therefore be letting a caller mint an acceptable signer. One
     configured Horizon, and it is the operator's choice, never the request's.
   - **The master key is checked first, without any network call at all.** This path only
     runs when that fails, so an ordinary wallet's sign-in never waits on Horizon and a
     Horizon outage cannot stop one. */
import { verifyStellarSignature } from "@/lib/stellar-verify";

export interface AccountSigners {
  signers: { key: string; weight: number }[];
  /** The account's medium threshold, or 1 when it publishes none. */
  threshold: number;
}

/** Signers and medium threshold from a Horizon account resource, or null for a 404. */
export async function fetchAccountSigners(horizonUrl: string, address: string): Promise<AccountSigners | null> {
  const res = await fetch(`${horizonUrl.replace(/\/+$/, "")}/accounts/${encodeURIComponent(address)}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`horizon: ${res.status}`);
  const body = (await res.json()) as {
    signers?: { key?: unknown; weight?: unknown }[];
    thresholds?: { med_threshold?: unknown };
  };
  const signers = (body.signers ?? [])
    .filter((s) => typeof s.key === "string" && typeof s.weight === "number")
    .map((s) => ({ key: s.key as string, weight: s.weight as number }));
  const med = body.thresholds?.med_threshold;
  return { signers, threshold: typeof med === "number" && med > 0 ? med : 1 };
}

/**
 * Does this signature come from someone who can act for the account?
 *
 * Pure, and exported for its test: it is the whole of what widening the check admits.
 * Weights are SUMMED, because that is how Stellar decides — but a single message carries a
 * single signature, so in practice this is "one signer whose own weight is enough". A
 * recovery server's half-weight signer therefore cannot authenticate as the account here,
 * which is correct: those two co-sign transactions, they do not speak for the owner.
 */
export function signedByCurrentSigner(account: AccountSigners, message: string, signatureB64: string): boolean {
  for (const signer of account.signers) {
    if (signer.weight < account.threshold) continue;
    if (verifyStellarSignature(signer.key, message, signatureB64)) return true;
  }
  return false;
}
