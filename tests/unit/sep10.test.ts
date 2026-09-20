/* sep10.test.ts — the challenge this platform hands out, and every way a signed one is
   refused. It is what SEP-30 account recovery authenticates with, so a hole here is a hole
   in "prove you control this account".

   The refusals are the point: each one below is a real attack or a real mistake — a
   challenge from another network, from another SEP-10 server, replayed at another service,
   signed by the wrong key, or signed by a key whose weight the account does not consider
   enough. */
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { Keypair, Networks, Transaction, TransactionBuilder } from "@stellar/stellar-sdk";

import { buildChallenge, verifyChallenge, CHALLENGE_TTL_S, networkOf, type Sep10Config } from "@/lib/sep10";

const server = Keypair.random();
const client = Keypair.random();
const other = Keypair.random();

const CFG: Sep10Config = {
  signingSecret: server.secret(),
  homeDomain: "wallet.cosmospay.lat",
  webAuthDomain: "recovery-a.cosmospay.lat",
  networkPassphrase: Networks.TESTNET,
};

const NOW = 1_800_000_000;
const signedBy = (xdr: string, ...keys: Keypair[]) => {
  const tx = TransactionBuilder.fromXDR(xdr, CFG.networkPassphrase);
  for (const k of keys) tx.sign(k);
  return tx.toXDR();
};
/** The account as Horizon reports a plain single-key one. */
const plain = { signers: [{ key: client.publicKey(), weight: 1 }], threshold: 1 };

test("a challenge is unsubmittable by construction and names the account it is for", () => {
  const tx = TransactionBuilder.fromXDR(buildChallenge(CFG, client.publicKey(), NOW), CFG.networkPassphrase) as Transaction;
  assert.equal(tx.sequence, "0");
  assert.equal(tx.source, server.publicKey());
  assert.equal(tx.operations[0].source, client.publicKey());
  assert.equal(tx.operations[0].type, "manageData");
  assert.equal((tx.operations[0] as { name: string }).name, `${CFG.homeDomain} auth`);
  // 48 random bytes, base64 — what SEP-10 asks for.
  const nonce = Buffer.from((tx.operations[0] as { value: Buffer }).value).toString("utf8");
  assert.equal(Buffer.from(nonce, "base64").length, 48);
  assert.equal((tx.operations[1] as { name: string }).name, "web_auth_domain");
});

test("two challenges never share a nonce", () => {
  const value = (xdr: string) =>
    Buffer.from((TransactionBuilder.fromXDR(xdr, CFG.networkPassphrase).operations[0] as { value: Buffer }).value).toString("utf8");
  assert.notEqual(value(buildChallenge(CFG, client.publicKey(), NOW)), value(buildChallenge(CFG, client.publicKey(), NOW)));
});

test("the account that signed it is the account it authenticates", () => {
  const xdr = signedBy(buildChallenge(CFG, client.publicKey(), NOW), client);
  assert.deepEqual(verifyChallenge(CFG, xdr, plain, NOW), { ok: true, account: client.publicKey() });
});

test("an unsigned or wrongly signed challenge is refused", () => {
  const challenge = buildChallenge(CFG, client.publicKey(), NOW);
  assert.deepEqual(verifyChallenge(CFG, challenge, plain, NOW), { ok: false, error: "client_signature" });
  assert.deepEqual(verifyChallenge(CFG, signedBy(challenge, other), plain, NOW), { ok: false, error: "client_signature" });
});

test("a challenge is only good inside its window", () => {
  const xdr = signedBy(buildChallenge(CFG, client.publicKey(), NOW), client);
  assert.equal(verifyChallenge(CFG, xdr, plain, NOW + CHALLENGE_TTL_S - 1).ok, true);
  assert.deepEqual(verifyChallenge(CFG, xdr, plain, NOW + CHALLENGE_TTL_S + 1), { ok: false, error: "expired" });
  assert.deepEqual(verifyChallenge(CFG, xdr, plain, NOW - 1), { ok: false, error: "expired" });
});

test("a challenge from another network or another server is refused", () => {
  // An envelope does not carry its network: the passphrase is only in what the signatures
  // commit to. So a mainnet challenge presented here parses perfectly and dies where it
  // must — the server's own signature does not hold under this network.
  const foreignNetwork: Sep10Config = { ...CFG, networkPassphrase: Networks.PUBLIC };
  const xdr = TransactionBuilder.fromXDR(buildChallenge(foreignNetwork, client.publicKey(), NOW), Networks.PUBLIC).toXDR();
  assert.deepEqual(verifyChallenge(CFG, xdr, plain, NOW), { ok: false, error: "server_signature" });

  const foreignServer: Sep10Config = { ...CFG, signingSecret: other.secret() };
  const theirs = signedBy(buildChallenge(foreignServer, client.publicKey(), NOW), client);
  assert.deepEqual(verifyChallenge(CFG, theirs, plain, NOW), { ok: false, error: "wrong_server" });
});

test("a challenge minted for another service cannot be replayed here", () => {
  // Same server key, same home domain — only the web-auth domain differs, which is exactly
  // what that operation is for.
  const sibling: Sep10Config = { ...CFG, webAuthDomain: "recovery-b.cosmospay.lat" };
  const xdr = signedBy(buildChallenge(sibling, client.publicKey(), NOW), client);
  assert.deepEqual(verifyChallenge(CFG, xdr, plain, NOW), { ok: false, error: "wrong_web_auth_domain" });
});

test("a challenge for another home domain is refused", () => {
  const elsewhere: Sep10Config = { ...CFG, homeDomain: "someone-else.example" };
  const xdr = signedBy(buildChallenge(elsewhere, client.publicKey(), NOW), client);
  assert.deepEqual(verifyChallenge(CFG, xdr, plain, NOW), { ok: false, error: "wrong_home_domain" });
});

test("an account that does not exist yet authenticates with its master key, and only it", () => {
  const challenge = buildChallenge(CFG, client.publicKey(), NOW);
  assert.deepEqual(verifyChallenge(CFG, signedBy(challenge, client), null, NOW), { ok: true, account: client.publicKey() });
  assert.deepEqual(verifyChallenge(CFG, signedBy(challenge, other), null, NOW), { ok: false, error: "client_signature" });
});

test("a recovered account authenticates with the key that replaced the lost one", () => {
  // What an account looks like after recovery: the master key at weight 0, a new device key
  // in its place. Verifying against the master key alone would lock the owner out here.
  const replacement = Keypair.random();
  const recovered = {
    signers: [
      { key: client.publicKey(), weight: 0 },
      { key: replacement.publicKey(), weight: 10 },
    ],
    threshold: 10,
  };
  const challenge = buildChallenge(CFG, client.publicKey(), NOW);
  assert.deepEqual(verifyChallenge(CFG, signedBy(challenge, replacement), recovered, NOW), {
    ok: true,
    account: client.publicKey(),
  });
  assert.deepEqual(verifyChallenge(CFG, signedBy(challenge, client), recovered, NOW), {
    ok: false,
    error: "client_signature",
  });
});

test("signatures that do not reach the account's threshold are not enough", () => {
  const second = Keypair.random();
  const shared = {
    signers: [
      { key: client.publicKey(), weight: 1 },
      { key: second.publicKey(), weight: 1 },
    ],
    threshold: 2,
  };
  const challenge = buildChallenge(CFG, client.publicKey(), NOW);
  assert.deepEqual(verifyChallenge(CFG, signedBy(challenge, client), shared, NOW), { ok: false, error: "below_threshold" });
  assert.equal(verifyChallenge(CFG, signedBy(challenge, client, second), shared, NOW).ok, true);
});

test("the network a deployment serves is read from its passphrase", () => {
  assert.equal(networkOf(Networks.PUBLIC), "public");
  assert.equal(networkOf(Networks.TESTNET), "testnet");
  assert.equal(networkOf("Some Other Network ; 2099"), "other");
});
