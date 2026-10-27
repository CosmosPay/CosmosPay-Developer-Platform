/* Sub-accounts: more than one private account per address (product owner, 2026-10-27). The token
   keeps one confidential account per Stellar account and refuses a second register (its error
   3500), so each further private account of an address is a Stellar account of its own: created
   and funded by the address (the base), whose only signer is the base (master weight 0), then
   registered on the token like any other. The customer signs everything with the base's wallet, a
   signed XDR as always; Cosmos Pay holds nothing: the sub-account's own key signs its signer change
   once, in this tab, and is dropped (with weight 0 it controls nothing afterwards).

   Its confidential key comes from the base's signature of the sub-account's key transaction, the
   same derivation as any account (src/lib/zk/derive-key.ts), so it opens again from that one
   signature. Who controls an account is read from the chain (`controllersOf`): nothing about it is
   stored. Pure apart from the two RPC reads. */
import { Account, Keypair, Operation, StrKey, TransactionBuilder, rpc, xdr } from "@stellar/stellar-sdk";

/** What the base puts into a new sub-account: its reserve (one account, one signer: 1.5 XLM) and
 *  the fees of its register and first operations (a register costs about 0.015 XLM). */
export const SUB_ACCOUNT_STARTING_BALANCE = "2";
/** How long the base has to sign the sub-account's creation. */
export const SUB_ACCOUNT_TIMEOUT_SECONDS = 600;

/**
 * The transaction that creates `sub` from `base`: the base funds it, then the sub-account makes the
 * base its only signer (its own key at weight 0). The base is the source and signs it; the
 * sub-account's key signs it too, for its own operation.
 */
export function subAccountTransaction(base: string, baseSequence: string, sub: string, networkPassphrase: string, fee = "100"): string {
  return new TransactionBuilder(new Account(base, baseSequence), { fee, networkPassphrase })
    .addOperation(Operation.createAccount({ destination: sub, startingBalance: SUB_ACCOUNT_STARTING_BALANCE }))
    .addOperation(Operation.setOptions({
      source: sub,
      signer: { ed25519PublicKey: base, weight: 1 },
      masterWeight: 0,
      lowThreshold: 1,
      medThreshold: 1,
      highThreshold: 1,
    }))
    .setTimeout(SUB_ACCOUNT_TIMEOUT_SECONDS)
    .build()
    .toXDR();
}

/* An XDR value's field, as stellar-sdk 17 exposes it (a property) or as earlier versions did (a
   getter), and its bytes (17 wraps them in `{ value }`). */
type Loose = Record<string, unknown>;
const field = (o: unknown, k: string): unknown => {
  const v = (o as Loose | null)?.[k];
  return typeof v === "function" ? (v as () => unknown).call(o) : v;
};
const bytes = (x: unknown): Uint8Array | null => (x instanceof Uint8Array ? x : ((field(x, "value") as Uint8Array | undefined) ?? null));
const kindOf = (key: unknown): string => {
  const t = (key as Loose | null)?.type;
  if (typeof t === "string") return t;
  const sw = (key as { switch?: () => { name: string } } | null)?.switch;
  return sw ? sw.call(key).name : "";
};

/** The account that signs for `entry` (an account's ledger entry): its one ed25519 signer when its
 *  own key weighs nothing; null for an account of its own. */
export function controllerOfEntry(entry: unknown): string | null {
  const thresholds = bytes(field(entry, "thresholds"));
  if (!thresholds || thresholds[0] !== 0) return null; // the master key still signs
  const keys = ((field(entry, "signers") as unknown[] | undefined) ?? [])
    .filter((s) => Number(field(s, "weight")) > 0)
    .map((s) => field(s, "key"))
    .filter((k) => kindOf(k) === "signerKeyTypeEd25519");
  const raw = keys.length === 1 ? bytes(field(keys[0], "ed25519")) : null;
  return raw ? StrKey.encodeEd25519PublicKey(raw as never) : null;
}

/** The address of an account's ledger entry. */
function addressOfEntry(entry: unknown): string | null {
  const raw = bytes(field(field(entry, "accountId"), "ed25519"));
  return raw ? StrKey.encodeEd25519PublicKey(raw as never) : null;
}

/**
 * Which of `addresses` are sub-accounts, and of which base: read from the accounts' entries on the
 * network (their signers), many at a time. Absent from the answer: not a sub-account, or not read.
 */
export async function controllersOf(rpcUrl: string, addresses: readonly string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  if (!addresses.length) return out;
  const server = new rpc.Server(rpcUrl, { allowHttp: rpcUrl.startsWith("http://") });
  const keys = addresses.map((a) => xdr.LedgerKey.account(new xdr.LedgerKeyAccount({ accountId: Keypair.fromPublicKey(a).xdrPublicKey() })));
  for (let i = 0; i < keys.length; i += 100) {
    const { entries } = await server.getLedgerEntries(...keys.slice(i, i + 100));
    for (const e of entries) {
      const account = field(e.val, "account");
      const controller = controllerOfEntry(account);
      const address = addressOfEntry(account);
      if (controller && address) out[address] = controller;
    }
  }
  return out;
}

/**
 * Sends the sub-account's creation, signed by the base and then by the sub-account's own key, and
 * waits for the network. Throws with the result code when it fails (the base short of XLM is
 * `op_underfunded` on its first operation).
 */
export async function submitSubAccount(rpcUrl: string, networkPassphrase: string, baseSignedXdr: string, sub: Keypair): Promise<string> {
  const server = new rpc.Server(rpcUrl, { allowHttp: rpcUrl.startsWith("http://") });
  const tx = TransactionBuilder.fromXDR(baseSignedXdr, networkPassphrase);
  tx.sign(sub);
  const sent = await server.sendTransaction(tx);
  if (sent.status === "ERROR") throw new Error(`sub-account refused: ${resultCodes(sent.errorResult)}`);
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const res = await server.getTransaction(sent.hash);
    if (res.status === rpc.Api.GetTransactionStatus.NOT_FOUND) continue;
    if (res.status === rpc.Api.GetTransactionStatus.FAILED) throw new Error(`sub-account failed: ${resultCodes(res.resultXdr)}`);
    return sent.hash;
  }
  throw new Error(`sub-account not confirmed in time (tx ${sent.hash})`);
}

/** A transaction result as its codes: "tx_failed: op_underfunded". */
function resultCodes(result: unknown): string {
  if (!result) return "unknown";
  // Every union arm named in the result, outermost first ("txFailed: opInner: createAccount:
  // createAccountUnderfunded"), whichever way the SDK exposes them.
  const names: string[] = [];
  const walk = (o: unknown, depth: number) => {
    if (!o || typeof o !== "object" || depth > 8) return;
    const kind = kindOf(o);
    if (kind && names[names.length - 1] !== kind) names.push(kind);
    for (const k of Object.keys(o as Loose)) if (k !== "type") walk((o as Loose)[k], depth + 1);
  };
  walk(result, 0);
  return names.join(": ") || "unknown";
}
