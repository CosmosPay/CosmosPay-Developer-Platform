/* recovery.test.ts — what a recovery server will and will not put its name to, and the
   token rules that decide who may ask.

   `signRefusal` is the whole blast radius of a compromised identity: whatever someone who
   took over an email can get signed here, they can get signed twice and use. So the
   refusals below are the security of the scheme, and the one acceptance is the transaction
   recovery actually needs. */
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { Account, Asset, Keypair, Networks, Operation, TransactionBuilder } from "@stellar/stellar-sdk";

import { signRefusal, normalizeMethodValue } from "@/lib/recovery-core";
import { buildRecoverySetup, DEVICE_WEIGHT, SERVER_WEIGHT } from "@/lib/recovery-setup";
import { issueJwt, readJwt } from "@/lib/jwt";
import { signedByCurrentSigner } from "@/lib/account-signers";

const NET = Networks.TESTNET;
const account = Keypair.random().publicKey();
const serverA = Keypair.random().publicKey();
const serverB = Keypair.random().publicKey();
const sponsor = Keypair.random();
const SECRET = "platform-secret-with-enough-entropy";

const tx = (ops: ReturnType<typeof Operation.setOptions>[], source = account, timeout = 300) => {
  const builder = new TransactionBuilder(new Account(source, "7"), { fee: "500", networkPassphrase: NET });
  for (const op of ops) builder.addOperation(op);
  return TransactionBuilder.fromXDR(builder.setTimeout(timeout).build().toXDR(), NET);
};

/* ------------------------------- the policy -------------------------------- */

test("the transaction recovery needs is signed", () => {
  const replacement = Keypair.random().publicKey();
  const recovery = tx([
    Operation.setOptions({ signer: { ed25519PublicKey: replacement, weight: DEVICE_WEIGHT } }),
    Operation.setOptions({ masterWeight: 0 }),
  ]);
  assert.equal(signRefusal(recovery, account), null);
});

test("a payment is not a recovery, whoever is asking", () => {
  const drain = tx([
    Operation.payment({ destination: Keypair.random().publicKey(), asset: Asset.native(), amount: "100" }) as never,
  ]);
  assert.equal(signRefusal(drain, account), "operation_not_allowed");
});

test("an account merge is not a recovery either", () => {
  const merge = tx([Operation.accountMerge({ destination: Keypair.random().publicKey() }) as never]);
  assert.equal(signRefusal(merge, account), "operation_not_allowed");
});

test("someone else's account is not this server's business", () => {
  const other = Keypair.random().publicKey();
  const t = tx([Operation.setOptions({ masterWeight: 0 })], other);
  assert.equal(signRefusal(t, account), "foreign_source");
  // …nor an operation inside it that acts on another account.
  const mixed = tx([Operation.setOptions({ source: other, masterWeight: 0 })]);
  assert.equal(signRefusal(mixed, account), "foreign_operation_source");
});

test("a signature that never expires is refused", () => {
  const forever = TransactionBuilder.fromXDR(
    new TransactionBuilder(new Account(account, "7"), { fee: "100", networkPassphrase: NET })
      .addOperation(Operation.setOptions({ masterWeight: 0 }))
      .setTimeout(0) // TimeoutInfinite
      .build()
      .toXDR(),
    NET,
  );
  assert.equal(signRefusal(forever, account), "no_expiry");
});

test("a hash or pre-authorised signer is not a device key", () => {
  const preauth = tx([
    Operation.setOptions({ signer: { sha256Hash: Buffer.alloc(32, 7), weight: 10 } as never }),
  ]);
  assert.equal(signRefusal(preauth, account), "unsupported_signer");
});

test("the sponsorship pair is allowed, but only for this account's own reserve", () => {
  const ok = tx([
    Operation.beginSponsoringFutureReserves({ sponsoredId: account, source: sponsor.publicKey() }) as never,
    Operation.setOptions({ signer: { ed25519PublicKey: serverA, weight: SERVER_WEIGHT } }),
    Operation.endSponsoringFutureReserves({}) as never,
  ]);
  assert.equal(signRefusal(ok, account), null);

  const forSomeoneElse = tx([
    Operation.beginSponsoringFutureReserves({ sponsoredId: Keypair.random().publicKey(), source: sponsor.publicKey() }) as never,
    Operation.setOptions({ masterWeight: 0 }),
  ]);
  assert.equal(signRefusal(forSomeoneElse, account), "foreign_operation_source");
});

test("an empty or oversized transaction, and an extravagant fee, are refused", () => {
  const many = Array.from({ length: 9 }, () => Operation.setOptions({ masterWeight: 0 }));
  assert.equal(signRefusal(tx(many), account), "too_many_operations");
  const rich = TransactionBuilder.fromXDR(
    new TransactionBuilder(new Account(account, "7"), { fee: "20000000", networkPassphrase: NET })
      .addOperation(Operation.setOptions({ masterWeight: 0 }))
      .setTimeout(300)
      .build()
      .toXDR(),
    NET,
  );
  assert.equal(signRefusal(rich, account), "fee_too_high");
});

/* ------------------------------ the setup shape ----------------------------- */

test("the sponsored setup adds both signers, raises the thresholds, and is signed by the sponsor alone", () => {
  const xdr = buildRecoverySetup({
    account,
    signers: [serverA, serverB],
    networkPassphrase: NET,
    sequence: "12",
    sponsor,
  });
  const built = TransactionBuilder.fromXDR(xdr, NET);
  const types = built.operations.map((o) => o.type);
  assert.deepEqual(types, [
    "beginSponsoringFutureReserves",
    "setOptions",
    "setOptions",
    "endSponsoringFutureReserves",
    "setOptions",
  ]);
  const weights = built.operations
    .filter((o) => o.type === "setOptions" && "signer" in o && o.signer)
    .map((o) => (o as { signer: { ed25519PublicKey: string; weight: number } }).signer);
  assert.deepEqual(weights, [
    { ed25519PublicKey: serverA, weight: SERVER_WEIGHT },
    { ed25519PublicKey: serverB, weight: SERVER_WEIGHT },
  ]);
  const thresholds = built.operations.at(-1) as { masterWeight: number; highThreshold: number };
  assert.equal(thresholds.masterWeight, DEVICE_WEIGHT);
  assert.equal(thresholds.highThreshold, DEVICE_WEIGHT);
  // Two servers reach the threshold; one never does. That IS the scheme.
  assert.equal(SERVER_WEIGHT * 2, DEVICE_WEIGHT);
  assert.ok(SERVER_WEIGHT < DEVICE_WEIGHT);
  // Only the sponsor has signed: the account's own signature waits for its wallet's guard.
  assert.equal(built.signatures.length, 1);
  assert.ok(sponsor.verify(built.hash(), built.signatures[0].signature()));
  // And what it produces is a transaction the servers themselves would sign.
  assert.equal(signRefusal(built, account), null);
});

test("without a sponsor the same shape has no sponsorship pair", () => {
  const built = TransactionBuilder.fromXDR(
    buildRecoverySetup({ account, signers: [serverA, serverB], networkPassphrase: NET, sequence: "12" }),
    NET,
  );
  assert.deepEqual(built.operations.map((o) => o.type), ["setOptions", "setOptions", "setOptions"]);
  assert.equal(built.signatures.length, 0);
});

/* --------------------------------- tokens ---------------------------------- */

test("a token is only good for the server it was minted for", () => {
  const now = Math.floor(Date.now() / 1000);
  const claims = { sub: `email:ada@example.com`, aud: "recovery-a.example", iss: "recovery-a.example", iat: now, exp: now + 60 };
  const token = issueJwt(claims, SECRET, "recovery-identity:a");
  assert.equal(readJwt(token, SECRET, "recovery-identity:a")?.sub, claims.sub);
  // The sibling server derives a different key from the same secret: its purpose differs.
  assert.equal(readJwt(token, SECRET, "recovery-identity:b"), null);
  // And a SEP-10 token is not an identity token, even on the same server.
  assert.equal(readJwt(token, SECRET, "sep10:a"), null);
});

test("a token that is expired, tampered with or unsigned is refused", () => {
  const now = Math.floor(Date.now() / 1000);
  const token = issueJwt({ sub: "G…", aud: "a", iss: "a", iat: now, exp: now + 60 }, SECRET, "sep10:a");
  assert.equal(readJwt(token, SECRET, "sep10:a", (now + 61) * 1000), null);
  assert.equal(readJwt(token, "another-secret-entirely", "sep10:a"), null);
  const [h, b, s] = token.split(".");
  const edited = Buffer.from(JSON.stringify({ sub: "GEVIL", aud: "a", iss: "a", iat: now, exp: now + 60 })).toString("base64url");
  assert.equal(readJwt(`${h}.${edited}.${s}`, SECRET, "sep10:a"), null);
  // "alg: none", the classic.
  const none = `${Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url")}.${b}.`;
  assert.equal(readJwt(none, SECRET, "sep10:a"), null);
});

test("an email is matched lowercased; an address as written", () => {
  assert.equal(normalizeMethodValue("email", "  Ada@Example.COM "), "ada@example.com");
  assert.equal(normalizeMethodValue("stellar_address", " GABC "), "GABC");
});

/* -------------------- accepting a recovered account's key -------------------- */

/* A wallet recovered through SEP-30 signs with a key that REPLACED the address's own. The
   platform has to accept that, or the recovery it recorded locks the owner out of it —
   and it has to accept nothing else, which is what these pin. */

test("a recovered account's new signer can act for it, and the retired master cannot", () => {
  const account = Keypair.random();
  const replacement = Keypair.random();
  const message = "Cosmos Pay Wallet backup\naccount: G…\nbox: …\nat: …";
  const sign = (kp: Keypair) => kp.sign(Buffer.from(message, "utf8")).toString("base64");

  // The account after recovery: master at 0, a new device key in its place.
  const recovered = {
    signers: [
      { key: account.publicKey(), weight: 0 },
      { key: replacement.publicKey(), weight: 10 },
    ],
    threshold: 10,
  };
  assert.equal(signedByCurrentSigner(recovered, message, sign(replacement)), true);
  assert.equal(signedByCurrentSigner(recovered, message, sign(account)), false);
});

test("a recovery server's half-weight signer cannot speak for the owner", () => {
  // The two co-sign transactions; neither is the account. One of them authenticating AS
  // the account would be one server able to read and replace the owner's cloud backup.
  const half = Keypair.random();
  const message = "anything";
  const account = {
    signers: [
      { key: half.publicKey(), weight: 5 },
      { key: Keypair.random().publicKey(), weight: 5 },
    ],
    threshold: 10,
  };
  assert.equal(signedByCurrentSigner(account, message, half.sign(Buffer.from(message, "utf8")).toString("base64")), false);
});

test("a stranger's signature is refused however the account is configured", () => {
  const message = "anything";
  const stranger = Keypair.random();
  const account = { signers: [{ key: Keypair.random().publicKey(), weight: 10 }], threshold: 10 };
  assert.equal(
    signedByCurrentSigner(account, message, stranger.sign(Buffer.from(message, "utf8")).toString("base64")),
    false,
  );
});
