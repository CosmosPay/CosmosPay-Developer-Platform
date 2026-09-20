/* sep10.ts — SEP-10 Stellar Web Authentication: the challenge this platform hands out and
   what it takes for a signed one to come back accepted.

   It exists because SEP-30 (account recovery, src/lib/recovery.ts) authenticates with a
   SEP-10 token. Doing the real thing rather than our own signed string is what keeps the
   door open to a recovery server somebody else runs: a third party's server will accept a
   SEP-10 token and nothing else.

   ## What a challenge is, and why it can never move money

   A transaction with SEQUENCE NUMBER 0. No account has sequence 0 — a real one starts at
   the ledger it was created in — so a challenge is unsubmittable by construction, whatever
   it contains. What it contains is two `manageData` operations: the first with the CLIENT as
   its source (so signing it proves control of that account) naming `<home domain> auth` and
   carrying 48 random bytes, and the second naming the web-auth domain, which is what stops a
   challenge minted for one service being replayed at another.

   ## The verification, in the order it matters

   Everything structural is checked BEFORE any signature is looked at, and the account's own
   thresholds decide how much signing weight is enough — that is what lets a recovered
   account, whose master key now has weight 0, still authenticate with the key that replaced
   it. `verifyChallenge` takes the signer set as an argument rather than fetching it, so this
   module stays reachable from a test with no network and no database. */
import { Account, BASE_FEE, Keypair, Memo, Networks, Operation, Transaction, TransactionBuilder } from "@stellar/stellar-sdk";
import { randomBytes } from "node:crypto";

/** How long a challenge stays signable. The SEP's own recommendation. */
export const CHALLENGE_TTL_S = 900;
/** What the token a verified challenge buys is good for. */
export const SEP10_JWT_TTL_S = 24 * 60 * 60;
/** SEP-10 requires 48 bytes of randomness, base64 — i.e. 64 characters. */
const NONCE_BYTES = 48;

export interface Sep10Config {
  /** The server's SEP-10 signing key, published in its stellar.toml. */
  signingSecret: string;
  /** The domain the client asked to authenticate for. */
  homeDomain: string;
  /** The domain serving this endpoint; refuses a challenge replayed at another service. */
  webAuthDomain: string;
  networkPassphrase: string;
}

/** One signer of the account being authenticated, as Horizon reports it. */
export interface AccountSigner {
  key: string;
  weight: number;
}

export type ChallengeFailure =
  | "not_a_transaction"
  | "wrong_network"
  | "wrong_server"
  | "not_a_challenge"
  | "expired"
  | "wrong_home_domain"
  | "wrong_web_auth_domain"
  | "wrong_account"
  | "server_signature"
  | "client_signature"
  | "below_threshold";

export type ChallengeResult = { ok: true; account: string } | { ok: false; error: ChallengeFailure };

/** What `readChallenge` gets out of a challenge before any signature is looked at. */
export type ChallengeStructure =
  | { ok: true; account: string; tx: Transaction }
  | { ok: false; error: ChallengeFailure };

/** The challenge for `account`, signed by the server. */
export function buildChallenge(cfg: Sep10Config, account: string, now = Math.floor(Date.now() / 1000)): string {
  const server = Keypair.fromSecret(cfg.signingSecret);
  // "-1" so the builder's own increment lands on sequence 0 — the whole reason a challenge
  // cannot be submitted, whatever it carries.
  const source = new Account(server.publicKey(), "-1");

  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: cfg.networkPassphrase,
    timebounds: { minTime: now, maxTime: now + CHALLENGE_TTL_S },
    memo: Memo.none(),
  })
    .addOperation(
      Operation.manageData({
        source: account,
        name: `${cfg.homeDomain} auth`,
        value: randomBytes(NONCE_BYTES).toString("base64"),
      }),
    )
    .addOperation(
      Operation.manageData({
        source: server.publicKey(),
        name: "web_auth_domain",
        value: cfg.webAuthDomain,
      }),
    )
    .build();
  tx.sign(server);
  return tx.toXDR();
}

/**
 * Everything about a challenge that can be checked without looking at a signature, and the
 * account it is for.
 *
 * Separate from `verifyChallenge` because the caller needs that account BEFORE it can ask
 * Horizon for the signer set the signatures are then weighed against — and because a
 * challenge that is not ours at all should be refused without a network call.
 */
export function readChallenge(cfg: Sep10Config, xdr: string, now = Math.floor(Date.now() / 1000)): ChallengeStructure {
  let tx: Transaction;
  try {
    const parsed = TransactionBuilder.fromXDR(xdr.trim(), cfg.networkPassphrase);
    if (!(parsed instanceof Transaction)) return { ok: false, error: "not_a_transaction" };
    tx = parsed;
  } catch {
    return { ok: false, error: "wrong_network" };
  }
  // An envelope does not carry its network — the passphrase is only in what the signatures
  // commit to — so a challenge from another network parses fine here and is refused below,
  // where the server's own signature fails to verify under this one. That is the check; the
  // `wrong_network` case above is only for bytes that are not a transaction at all.

  const server = Keypair.fromSecret(cfg.signingSecret).publicKey();
  if (tx.source !== server) return { ok: false, error: "wrong_server" };
  if (tx.sequence !== "0") return { ok: false, error: "not_a_challenge" };
  if (tx.operations.length < 1) return { ok: false, error: "not_a_challenge" };
  if (!tx.timeBounds) return { ok: false, error: "not_a_challenge" };
  const min = Number(tx.timeBounds.minTime);
  const max = Number(tx.timeBounds.maxTime);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max === 0) return { ok: false, error: "not_a_challenge" };
  if (now < min || now > max) return { ok: false, error: "expired" };

  const [first, ...rest] = tx.operations;
  if (first.type !== "manageData" || !first.source) return { ok: false, error: "not_a_challenge" };
  if (first.name !== `${cfg.homeDomain} auth`) return { ok: false, error: "wrong_home_domain" };
  const nonce = first.value ? Buffer.from(first.value).toString("utf8") : "";
  if (Buffer.from(nonce, "base64").length !== NONCE_BYTES) return { ok: false, error: "not_a_challenge" };

  // Every other operation must be a manageData with a source, and the web-auth one must name
  // THIS service: a challenge collected from another SEP-10 server is otherwise replayable.
  let sawWebAuth = false;
  for (const op of rest) {
    if (op.type !== "manageData" || !op.source) return { ok: false, error: "not_a_challenge" };
    if (op.name === "web_auth_domain") {
      sawWebAuth = true;
      if (op.source !== server) return { ok: false, error: "not_a_challenge" };
      if (!op.value || Buffer.from(op.value).toString("utf8") !== cfg.webAuthDomain) {
        return { ok: false, error: "wrong_web_auth_domain" };
      }
    }
  }
  if (!sawWebAuth) return { ok: false, error: "wrong_web_auth_domain" };

  const client = first.source;
  if (!isPublicKey(client)) return { ok: false, error: "wrong_account" };
  return { ok: true, account: client, tx };
}

/**
 * Check a signed challenge and say whose account it authenticates.
 *
 * `account` is the signer set and medium threshold Horizon reports; pass `null` for an
 * account that does not exist on the network yet, where SEP-10 says its master key alone
 * must sign.
 */
export function verifyChallenge(
  cfg: Sep10Config,
  xdr: string,
  account: { signers: AccountSigner[]; threshold: number } | null,
  now = Math.floor(Date.now() / 1000),
): ChallengeResult {
  const structure = readChallenge(cfg, xdr, now);
  if (!structure.ok) return structure;
  const { tx, account: client } = structure;
  const server = Keypair.fromSecret(cfg.signingSecret).publicKey();

  const hash = tx.hash();
  const verified = new Set<string>();
  for (const sig of tx.signatures) {
    for (const key of [server, ...(account ? account.signers.map((s) => s.key) : [client])]) {
      if (verified.has(key)) continue;
      try {
        if (Keypair.fromPublicKey(key).verify(hash, sig.signature())) verified.add(key);
      } catch {
        // A signer this build cannot verify with (a hash signer, a pre-authorized
        // transaction) counts for nothing rather than throwing the whole check away.
      }
    }
  }

  if (!verified.has(server)) return { ok: false, error: "server_signature" };
  if (account === null) {
    return verified.has(client) ? { ok: true, account: client } : { ok: false, error: "client_signature" };
  }
  const weight = account.signers.filter((s) => s.key !== server && verified.has(s.key)).reduce((n, s) => n + s.weight, 0);
  if (weight === 0) return { ok: false, error: "client_signature" };
  // The account's own rule for "enough signatures", so a recovered account — master key at
  // weight 0, a new device key in its place — authenticates exactly as it should.
  if (weight < account.threshold) return { ok: false, error: "below_threshold" };
  return { ok: true, account: client };
}

function isPublicKey(v: string): boolean {
  try {
    Keypair.fromPublicKey(v);
    return true;
  } catch {
    return false;
  }
}

/** The network a passphrase names, for the `network` a deployment advertises. */
export function networkOf(passphrase: string): "public" | "testnet" | "other" {
  if (passphrase === Networks.PUBLIC) return "public";
  if (passphrase === Networks.TESTNET) return "testnet";
  return "other";
}
