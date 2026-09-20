/* recovery.ts — SEP-30 account recovery, from this server's side.

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
import { FeeBumpTransaction, Keypair, Transaction, TransactionBuilder } from "@stellar/stellar-sdk";
import { prisma } from "@/lib/prisma";
import { signerFor, type RecoveryConfig } from "@/lib/recovery-config";
import {
  IDENTITY_ROLES,
  signRefusal,
  normalizeMethodValue,
  type AccountResponse,
  type Actor,
  type AuthMethod,
  type AuthMethodType,
  type Identity,
  type IdentityRole,
  type SignRefusal,
} from "@/lib/recovery-core";

export * from "@/lib/recovery-core";

/* -------------------------------- storage --------------------------------- */

function toIdentities(methods: { identityRole: string; type: string; value: string }[]): Identity[] {
  const byRole = new Map<IdentityRole, AuthMethod[]>();
  for (const m of methods) {
    const role = (IDENTITY_ROLES as readonly string[]).includes(m.identityRole) ? (m.identityRole as IdentityRole) : "owner";
    const list = byRole.get(role) ?? [];
    list.push({ type: m.type as AuthMethodType, value: m.value });
    byRole.set(role, list);
  }
  return [...byRole].map(([role, auth_methods]) => ({ role, auth_methods }));
}

/** Register the account, or replace the identities of one already registered. */
export async function putAccount(cfg: RecoveryConfig, address: string, identities: Identity[]): Promise<AccountResponse> {
  const account = await prisma.recoveryAccount.upsert({
    where: { role_address: { role: cfg.role, address } },
    create: { role: cfg.role, address, network: cfg.network },
    update: { network: cfg.network },
    select: { id: true, createdAt: true },
  });
  await prisma.recoveryAuthMethod.deleteMany({ where: { accountId: account.id } });
  await prisma.recoveryAuthMethod.createMany({
    data: identities.flatMap((identity) =>
      identity.auth_methods.map((m) => ({
        accountId: account.id,
        identityRole: identity.role,
        type: m.type,
        value: normalizeMethodValue(m.type, m.value),
      })),
    ),
  });
  return {
    address,
    identities: identities.map((i) => ({ role: i.role })),
    signers: [{ key: signerFor(cfg, address).publicKey(), added_at: account.createdAt.toISOString() }],
  };
}

async function findAccount(cfg: RecoveryConfig, address: string) {
  return prisma.recoveryAccount.findUnique({
    where: { role_address: { role: cfg.role, address } },
    include: { methods: true },
  });
}

/** The account as SEP-30 describes it, or null when this server does not know it. */
export async function getAccount(cfg: RecoveryConfig, address: string, actor: Actor): Promise<AccountResponse | null> {
  const account = await findAccount(cfg, address);
  if (!account) return null;
  const identities = toIdentities(account.methods);
  return {
    address,
    identities: identities.map((i) => ({
      role: i.role,
      // SEP-30 asks the server to say which identity the caller authenticated as.
      authenticated: authenticatesAs(actor, address, account.methods, i.role) || undefined,
    })),
    signers: [{ key: signerFor(cfg, address).publicKey(), added_at: account.createdAt.toISOString() }],
  };
}

export async function deleteAccount(cfg: RecoveryConfig, address: string): Promise<boolean> {
  const account = await findAccount(cfg, address);
  if (!account) return false;
  await prisma.recoveryAccount.delete({ where: { id: account.id } });
  return true;
}

/** Every account this caller may act for — SEP-30's `GET /accounts`. */
export async function listAccounts(cfg: RecoveryConfig, actor: Actor): Promise<AccountResponse[]> {
  const where =
    actor.kind === "address"
      ? { role: cfg.role, OR: [{ address: actor.address }, { methods: { some: { type: "stellar_address", value: actor.address } } }] }
      : { role: cfg.role, methods: { some: { type: actor.type, value: actor.value } } };
  const accounts = await prisma.recoveryAccount.findMany({ where, include: { methods: true }, take: 100 });
  return accounts.map((a) => ({
    address: a.address,
    identities: toIdentities(a.methods).map((i) => ({ role: i.role, authenticated: authenticatesAs(actor, a.address, a.methods, i.role) || undefined })),
    signers: [{ key: signerFor(cfg, a.address).publicKey(), added_at: a.createdAt.toISOString() }],
  }));
}

/* ----------------------------- authorisation ------------------------------ */

function authenticatesAs(
  actor: Actor,
  address: string,
  methods: { identityRole: string; type: string; value: string }[],
  role: IdentityRole,
): boolean {
  if (actor.kind === "address") return actor.address === address;
  return methods.some((m) => m.identityRole === role && m.type === actor.type && m.value === actor.value);
}

/** May this caller ask about — or ask for a signature on — this account? */
export async function mayAct(cfg: RecoveryConfig, address: string, actor: Actor): Promise<boolean> {
  if (actor.kind === "address" && actor.address === address) return true;
  const account = await findAccount(cfg, address);
  if (!account) return false;
  return account.methods.some((m) => actor.kind === "identity" && m.type === actor.type && m.value === actor.value);
}

/* -------------------------------- signing --------------------------------- */

export type SignResult =
  | { status: "signed"; signature: string; networkPassphrase: string }
  | { status: "unknown_account" }
  | { status: "wrong_signer" }
  | { status: "not_a_transaction" }
  | { status: "refused"; reason: SignRefusal };

/**
 * Co-sign a recovery transaction for `address`.
 *
 * `signingAddress` is the key the caller says it wants a signature from — SEP-30 puts it in
 * the path so a server that rotates keys can still be asked for a specific one. Ours is
 * derived, so the check is that it is the one this server holds for THIS account: asking
 * for another account's signer must not work even for a caller who may act for both.
 */
export async function signRecovery(
  cfg: RecoveryConfig,
  address: string,
  signingAddress: string,
  xdr: string,
): Promise<SignResult> {
  const account = await findAccount(cfg, address);
  if (!account) return { status: "unknown_account" };

  const signer = signerFor(cfg, address);
  if (signer.publicKey() !== signingAddress) return { status: "wrong_signer" };

  let tx: Transaction | FeeBumpTransaction;
  try {
    tx = TransactionBuilder.fromXDR(xdr.trim(), cfg.sep10.networkPassphrase);
  } catch {
    return { status: "not_a_transaction" };
  }
  const refusal = signRefusal(tx, address);
  if (refusal) return { status: "refused", reason: refusal };

  // The signature alone, never the envelope: the caller is collecting two of them and puts
  // them together itself, and a server that returned a signed envelope would be inviting
  // the other one to be dropped.
  const signature = Keypair.fromSecret(signer.secret()).sign((tx as Transaction).hash()).toString("base64");
  return { status: "signed", signature, networkPassphrase: cfg.sep10.networkPassphrase };
}
