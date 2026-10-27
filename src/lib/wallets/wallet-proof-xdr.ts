/* A Stellar wallet proven with a signed XDR instead of a connected wallet (product owner,
   2026-10-27: people hand over a signed XDR, not their wallet). The proof transaction carries the
   same proof message as a wallet's message signature (src/lib/org-wallets.ts), hashed into a
   manageData entry, and can never apply (sequence 1 is behind every existing account). Any Stellar
   wallet signs it; the server rebuilds it from the request and checks the signature
   (src/lib/wallets/signed-xdr.ts). A wallet signs for the network it is set to, so a signature for
   the public network or for testnet is accepted: the transaction applies on neither. Pure. */
import { Account, Memo, Networks, Operation, TimeoutInfinite, TransactionBuilder, hash } from "@stellar/stellar-sdk";
import { walletProofMessage } from "@/lib/org-wallets";
import { signatureOn, type SignedXdrProblem } from "@/lib/wallets/signed-xdr";

export const WALLET_PROOF_DATA_NAME = "cosmospay-wallet-proof";
export const WALLET_PROOF_PASSPHRASE = Networks.PUBLIC;
const SIGNED_FOR = [Networks.PUBLIC, Networks.TESTNET];
const PROOF_MEMO = "Cosmos Pay wallet proof";

/** The transaction `address` signs to be added to organization `orgId`, issued at `issuedAt`. */
export function walletProofTransactionXdr({ orgId, address, issuedAt }: { orgId: string; address: string; issuedAt: string }): string {
  const message = walletProofMessage({ orgId, chain: "stellar", address, issuedAt });
  return new TransactionBuilder(new Account(address, "0"), { fee: "100", networkPassphrase: WALLET_PROOF_PASSPHRASE })
    .addOperation(Operation.manageData({ name: WALLET_PROOF_DATA_NAME, value: hash(new TextEncoder().encode(message) as never) as never }))
    .addMemo(Memo.text(PROOF_MEMO))
    .setTimeout(TimeoutInfinite)
    .build()
    .toXDR();
}

/** Whether `signedXdr` is that proof transaction signed by `address`, for either network; why not. */
export function checkWalletProofXdr(proof: { orgId: string; address: string; issuedAt: string }, signedXdr: string): { ok: true } | { ok: false; problem: SignedXdrProblem } {
  // An address that is not a valid key (a bad checksum) cannot have signed anything.
  let unsigned: string;
  try {
    unsigned = walletProofTransactionXdr(proof);
  } catch {
    return { ok: false, problem: "notSigned" };
  }
  let first: SignedXdrProblem | null = null;
  for (const passphrase of SIGNED_FOR) {
    const check = signatureOn(unsigned, signedXdr, proof.address, passphrase);
    if (check.ok) return { ok: true };
    first ??= check.problem;
  }
  return { ok: false, problem: first ?? "notSigned" };
}
