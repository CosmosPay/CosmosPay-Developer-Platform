/* Signing private-account transactions without connecting a wallet (product owner, 2026-10-27:
   people do not hand over their wallet, they hand over a signed XDR). The page builds each
   transaction, shows its XDR for the account's owner (a customer) to sign in any Stellar wallet,
   and takes the signed envelope back, checked here: the same transaction, signed by the account.
   No wallet is opened in the dashboard: the account is the customer's, not the person's at the
   screen (product owner, 2026-10-27).

   The private account's key needs a signature too. A wallet that signs only transactions cannot
   give the SEP-53 message signature the protocol's signer root uses, so the key comes from the
   signature of a fixed transaction instead (`keyTransactionXdr`): built from the token and the
   account alone, so every wallet that signs it gives the same signature, and impossible to apply
   (sequence 1 is behind every existing account). That signature is the root the SDK's `deriveSk`
   takes, like the SEP-53 one; it is never stored or sent (src/lib/zk/derive-key.ts).

   The risk it carries, as the SEP-53 root does: the transaction is built from public data, so anyone
   can ask the person to sign it, and that signature gives the confidential key. The key reads the
   account's private balances; it moves nothing, since every action also needs the account's own
   signature on that action's transaction. The signing dialog says so, and only the page asks for it.
   A per-account secret mixed into the root would close it, but Cosmos Pay is non-custodial and keeps
   no key material of anyone's (product owner, 2026-10-27): the key comes from the person's signature
   alone. Pure apart from `XdrSigner.sign`, which waits on the page. */
import { Account, Memo, Operation, TimeoutInfinite, TransactionBuilder, hash } from "@stellar/stellar-sdk";
import { skSigningMessage } from "stellar-confidential-token-sdk";
import { expiryOf, signatureOn } from "@/lib/wallets/signed-xdr";

export { expiryOf, signatureOn, type SignedXdrProblem } from "@/lib/wallets/signed-xdr";

/** What a signature is for: the key (once), or one of the account's actions. */
export type SignPurpose = "key" | "register" | "deposit" | "withdraw" | "merge" | "transfer";

export interface SignRequest {
  purpose: SignPurpose;
  /** The unsigned transaction, base64 XDR. */
  xdr: string;
  /** The account that must sign it. */
  account: string;
  networkPassphrase: string;
  /** When the transaction stops being valid (ms since the epoch), or null when it never applies. */
  expiresAt: number | null;
}

/** Shows a request to sign and resolves with the signed XDR; rejects when the person cancels. */
export type RequestSignature = (request: SignRequest) => Promise<string>;

export class SignCancelledError extends Error {
  constructor() {
    super("The signature was cancelled");
  }
}

/** The manageData entry the key transaction writes; a wallet shows it to the person signing. */
export const KEY_DATA_NAME = "cosmospay-private-key";
const KEY_MEMO = "Cosmos Pay private account";

/**
 * The fixed transaction whose signature opens `account`'s private account on `token`: one
 * manageData entry binding the token and the account (SHA-256 of the protocol's own signer-root
 * message), sequence 1, no time bounds. The same bytes on every call, for every wallet.
 */
export function keyTransactionXdr(token: string, account: string, networkPassphrase: string): string {
  return new TransactionBuilder(new Account(account, "0"), { fee: "100", networkPassphrase })
    .addOperation(Operation.manageData({ name: KEY_DATA_NAME, value: hash(skSigningMessage(token, account) as never) as never }))
    .addMemo(Memo.text(KEY_MEMO))
    .setTimeout(TimeoutInfinite)
    .build()
    .toXDR();
}

/**
 * The confidential-token SDK's signer for an account the page never connects to: each
 * transaction goes to the page (`request`) and comes back signed. `prepare` names what the next
 * signature is for, so the page can say it.
 */
export class XdrSigner {
  readonly publicKey: string;
  private readonly networkPassphrase: string;
  private readonly request: RequestSignature;
  private purpose: SignPurpose = "key";

  constructor(publicKey: string, networkPassphrase: string, request: RequestSignature) {
    this.publicKey = publicKey;
    this.networkPassphrase = networkPassphrase;
    this.request = request;
  }

  prepare(purpose: SignPurpose): void {
    this.purpose = purpose;
  }

  async sign(xdr: string): Promise<string> {
    const signed = await this.request({
      purpose: this.purpose,
      xdr,
      account: this.publicKey,
      networkPassphrase: this.networkPassphrase,
      expiresAt: expiryOf(xdr, this.networkPassphrase),
    });
    const check = signatureOn(xdr, signed, this.publicKey, this.networkPassphrase);
    if (!check.ok) throw new Error(`The signed transaction was refused: ${check.problem}`);
    return TransactionBuilder.fromXDR(signed.trim(), this.networkPassphrase).toXDR();
  }
}
