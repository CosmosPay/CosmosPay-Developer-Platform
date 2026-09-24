/* recovery-core.ts — SEP-30 account recovery, from this server's side.

   The wallet registers an account here and puts the key this server derives for it
   (recovery-config.ts) on chain as a signer, together with the OTHER server's. Neither
   weighs enough alone; the two together reach the account's threshold. So when someone
   loses their device, both servers co-sign one transaction that puts a new key in place of
   the lost one — and no key of theirs ever leaves, because there is no key of theirs
   anywhere but on the ledger.

   ## What this server will put its name to

   A recovery transaction and nothing else. SEP-30 leaves the policy to the server, and the
   generous reading — sign whatever an authenticated identity asks for — makes each server a
   payment service for anyone who can receive the person's email. `signRefusal` below is the
   narrow reading: the source must be the registered account, the operations must be a
   signer/threshold change on it (with the sponsorship pair, so an account that cannot pay
   the new signer's reserve can still be recovered), and the window must be bounded.

   That does not make a stolen email harmless — whoever holds it can still have a key of
   their choosing put on the account. It means they have to do it on chain, in one visible
   transaction, rather than quietly asking us to sign a payment.

   ## Who may ask

   Two credentials, both SEP-10-shaped JWTs from this deployment: one whose subject is the
   ACCOUNT (you still hold the key — used to register and to change identities), and one
   whose subject is an IDENTITY, minted after the platform proved an email. Each is scoped
   to this server's audience, so a token from the sibling server is refused here. */
import { FeeBumpTransaction, Transaction } from "@stellar/stellar-sdk";

/* ------------------------------ the listing ------------------------------- */

/** How many accounts one page of `GET /accounts` carries. */
export const RECOVERY_PAGE_SIZE = 100;

/**
 * Which accounts a caller may see, and where their page starts — the `where` for
 * SEP-30's `GET /accounts`.
 *
 * Pure, and separate from the query that runs it, because the two halves fail
 * differently and only one of them is testable against a database this suite does not
 * have. What can go wrong here is not a slow query: it is a cursor that widens what the
 * caller may see. `after` arrives from the URL, so it is the caller's, and it is combined
 * with an AND rather than merged over the scope — a merge lets a key in the cursor
 * overwrite the same key in the scope, which is how a pagination parameter turns into a
 * way to read another identity's accounts.
 *
 * The cursor is keyset, on the address: an OFFSET over a list that is being written to
 * skips rows as earlier ones are inserted, and an address is the only key both halves of
 * the protocol can name.
 */
export function listWhere(role: string, actor: Actor, after?: string): Record<string, unknown> {
  const scope =
    actor.kind === "address"
      ? { role, OR: [{ address: actor.address }, { methods: { some: { type: "stellar_address", value: actor.address } } }] }
      : { role, methods: { some: { type: actor.type, value: actor.value } } };
  return after ? { AND: [scope, { address: { gt: after } }] } : scope;
}

/** SEP-30 identity roles. The wallet only ever registers `owner`. */
export const IDENTITY_ROLES = ["owner", "sender", "receiver"] as const;
export type IdentityRole = (typeof IDENTITY_ROLES)[number];

export const AUTH_METHOD_TYPES = ["email", "phone_number", "stellar_address"] as const;
export type AuthMethodType = (typeof AUTH_METHOD_TYPES)[number];

export interface AuthMethod {
  type: AuthMethodType;
  value: string;
}

export interface Identity {
  role: IdentityRole;
  auth_methods: AuthMethod[];
}

/** Who is asking: the account itself (SEP-10), or an identity the platform proved. */
export type Actor =
  | { kind: "address"; address: string }
  | { kind: "identity"; type: AuthMethodType; value: string };

/** What every account route answers with, in SEP-30's shape. */
export interface AccountResponse {
  address: string;
  identities: { role: IdentityRole; authenticated?: boolean }[];
  signers: { key: string; added_at: string }[];
}

/** An email is compared lowercased; an address as written. Phones are taken as given. */
export function normalizeMethodValue(type: AuthMethodType, value: string): string {
  return type === "email" ? value.trim().toLowerCase() : value.trim();
}

/* ------------------------------- the policy -------------------------------- */

/** Stroops. A recovery transaction is three operations at most; this only stops a drain. */
const MAX_FEE_STROOPS = 10_000_000;
const MAX_OPS = 8;

export type SignRefusal =
  | "fee_bump"
  | "foreign_source"
  | "no_operations"
  | "too_many_operations"
  | "fee_too_high"
  | "no_expiry"
  | "operation_not_allowed"
  | "foreign_operation_source"
  | "unsupported_signer";

/**
 * Why this server will not sign, or null when it will.
 *
 * Pure, and exported for its test: it is the whole of what a compromised identity can ask
 * this server to do, so it is the one piece that has to be right.
 */
export function signRefusal(tx: Transaction | FeeBumpTransaction, address: string): SignRefusal | null {
  // A fee bump lets a third party wrap and re-broadcast; nothing in recovery needs one.
  if (tx instanceof FeeBumpTransaction) return "fee_bump";
  if (tx.source !== address) return "foreign_source";
  if (!tx.operations.length) return "no_operations";
  if (tx.operations.length > MAX_OPS) return "too_many_operations";
  const fee = Number(tx.fee);
  if (!Number.isFinite(fee) || fee < 0 || fee > MAX_FEE_STROOPS) return "fee_too_high";
  // A signature with no expiry is a standing instrument to take the account over later.
  const max = tx.timeBounds ? Number(tx.timeBounds.maxTime) : 0;
  if (!Number.isFinite(max) || max <= 0) return "no_expiry";

  for (const op of tx.operations) {
    switch (op.type) {
      case "setOptions":
        if (op.source && op.source !== address) return "foreign_operation_source";
        // Only ordinary key signers. A hash or pre-authorized-transaction signer is a
        // different instrument, and never what a device replacement needs.
        if (op.signer && !("ed25519PublicKey" in op.signer)) return "unsupported_signer";
        break;
      case "beginSponsoringFutureReserves":
        // The sponsor is somebody else's account by definition; what matters is that the
        // reserve being paid for is THIS account's.
        if (op.sponsoredId !== address) return "foreign_operation_source";
        break;
      case "endSponsoringFutureReserves":
        if (op.source && op.source !== address) return "foreign_operation_source";
        break;
      default:
        return "operation_not_allowed";
    }
  }
  return null;
}

