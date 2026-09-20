/* recovery-setup.ts — the transaction that puts the two recovery signers on an account,
   in the variant the account cannot pay for itself.

   ## The shape, and why these numbers

   The device key keeps enough weight to sign alone, and each recovery server gets half of
   it, so:

     device (10)            ≥ threshold (10)  → normal use needs nobody else
     server a (5) + b (5)   ≥ threshold (10)  → recovery needs BOTH servers
     one server alone (5)   <  threshold (10) → one server can do nothing

   The thresholds are set on the same transaction, after the signers are added. The wallet
   builds exactly this shape when the account pays its own reserve; this module builds it
   with the sponsorship pair around the two signer entries, and signs as the sponsor. Either
   way the wallet checks the result against its own guard before signing — see the
   `recovery` intent there, which is what makes a mistake here a refusal rather than a
   surprise.

   ## What sponsoring means here

   The operator pays the 0.5 XLM reserve of each signer entry and can reclaim it later by
   revoking the sponsorship; the account keeps its own base reserve. It is the only way an
   account with no spare lumens gets recovery at all, which is most of them on a first run. */
import { Account, BASE_FEE, Keypair, Memo, Operation, TransactionBuilder } from "@stellar/stellar-sdk";

/** The device key's weight, and the threshold every operation on the account must reach. */
export const DEVICE_WEIGHT = 10;
/** Each recovery server's weight: half, so the two together are exactly enough. */
export const SERVER_WEIGHT = 5;
/** Seconds a setup transaction stays valid. Long enough to sign, short enough to expire. */
export const SETUP_TIMEOUT_S = 300;

export interface SetupInput {
  account: string;
  /** The two servers' signers for this account, as each one reported at registration. */
  signers: readonly [string, string];
  networkPassphrase: string;
  /** Current sequence of `account`, from Horizon. */
  sequence: string;
  /** Set to have the operator pay the signers' reserve. */
  sponsor?: Keypair;
}

/**
 * Build the setup transaction — and sign it as the sponsor when there is one.
 *
 * The account's own signature is always missing on purpose: the wallet adds it after its
 * guard has decoded every operation. A transaction this module returned ready to submit
 * would be one nothing on the device ever looked at.
 */
export function buildRecoverySetup(input: SetupInput): string {
  const source = new Account(input.account, input.sequence);
  const ops = input.sponsor ? 5 : 3;
  const builder = new TransactionBuilder(source, {
    fee: String(Number(BASE_FEE) * ops),
    networkPassphrase: input.networkPassphrase,
    memo: Memo.none(),
  });

  if (input.sponsor) {
    builder.addOperation(
      Operation.beginSponsoringFutureReserves({ sponsoredId: input.account, source: input.sponsor.publicKey() }),
    );
  }
  for (const key of input.signers) {
    builder.addOperation(
      Operation.setOptions({ source: input.account, signer: { ed25519PublicKey: key, weight: SERVER_WEIGHT } }),
    );
  }
  if (input.sponsor) {
    builder.addOperation(Operation.endSponsoringFutureReserves({ source: input.account }));
  }
  // Last: with the signers in place, the account's rule for "enough signatures" can be
  // raised to a number the two servers together reach and neither reaches alone.
  builder.addOperation(
    Operation.setOptions({
      source: input.account,
      masterWeight: DEVICE_WEIGHT,
      lowThreshold: DEVICE_WEIGHT,
      medThreshold: DEVICE_WEIGHT,
      highThreshold: DEVICE_WEIGHT,
    }),
  );

  const tx = builder.setTimeout(SETUP_TIMEOUT_S).build();
  if (input.sponsor) tx.sign(input.sponsor);
  return tx.toXDR();
}
