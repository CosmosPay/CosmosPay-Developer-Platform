/* p2pAppSession.test.ts: how the public P2P app binds a visitor to their wallet
   (src/lib/p2p/app-session.ts): the challenge a wallet signs (single use, five minutes, bound to
   the address, the host and the environment), EIP-191 recovery against a real signature, and the
   signed session cookie, which refuses any change, any other secret, an expired claim and another
   environment. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { secp256k1 } from "@noble/curves/secp256k1";
import { keccak_256 } from "@noble/hashes/sha3.js";
import {
  APP_COOKIE, APP_COOKIE_PATH, CHALLENGE_TTL_MS, ChallengeStore, challengeMessage, clearSessionCookie, cookieValue, envFromKey, readSession,
  sessionCookie, signSession, verifyChallenge,
} from "@/lib/p2p/app-session";

const SECRET = "x".repeat(40);

/* A wallet: a key, its address, and personal_sign over a text, as an EVM wallet makes it. */
function wallet() {
  const priv = secp256k1.utils.randomPrivateKey();
  const address = `0x${Buffer.from(keccak_256(secp256k1.getPublicKey(priv, false).slice(1)).slice(-20)).toString("hex")}`;
  const sign = (message: string) => {
    const text = new TextEncoder().encode(message);
    const digest = keccak_256(new Uint8Array([...new TextEncoder().encode(`\x19Ethereum Signed Message:\n${text.length}`), ...text]));
    const s = secp256k1.sign(digest, priv);
    return `0x${Buffer.from(s.toCompactRawBytes()).toString("hex")}${(27 + s.recovery).toString(16)}`;
  };
  return { address, sign };
}

test("the challenge names the wallet, the site, the network and its expiry", () => {
  const m = challengeMessage({ address: "0xAbC0000000000000000000000000000000000001", host: "payments.cosmospay.lat", env: "prod", nonce: "n1", issuedAt: 0, expiresAt: CHALLENGE_TTL_MS });
  assert.match(m, /Wallet: 0xAbC0000000000000000000000000000000000001/);
  assert.match(m, /Site: payments\.cosmospay\.lat/);
  assert.match(m, /Network: mainnet/);
  assert.match(m, /Nonce: n1/);
  assert.match(m, /Expires: 1970-01-01T00:05:00\.000Z/);
  assert.doesNotMatch(m, /\u2014/);
  assert.equal(envFromKey("dv_abc"), "dev");
  assert.equal(envFromKey("prod_abc"), "prod");
});

test("a real personal_sign signature over the challenge proves the wallet, once", () => {
  const w = wallet();
  const store = new ChallengeStore();
  const c = store.issue(w.address.toUpperCase().replace("0X", "0x"), "payments.cosmospay.lat", "prod");
  assert.equal(c.address, w.address, "kept lower case");
  const sig = w.sign(c.message);
  const used = store.consume(c.id);
  assert.ok(used);
  assert.equal(verifyChallenge(used, sig), true);
  assert.equal(store.consume(c.id), null, "a replay finds nothing");
});

test("a signature by another wallet, over another text or malformed is refused", () => {
  const w = wallet();
  const other = wallet();
  const store = new ChallengeStore();
  const c = store.issue(w.address, "payments.cosmospay.lat", "prod");
  assert.equal(verifyChallenge(c, other.sign(c.message)), false);
  assert.equal(verifyChallenge(c, w.sign(`${c.message} `)), false);
  assert.equal(verifyChallenge(c, "0x1234"), false);
  assert.equal(verifyChallenge(c, undefined), false);
  // Mock mode takes any well-formed signature, never a malformed one.
  assert.equal(verifyChallenge(c, `0x${"ab".repeat(65)}`, true), true);
  assert.equal(verifyChallenge(c, "0xzz", true), false);
});

test("challenges expire, and one address holds a few at most", () => {
  const store = new ChallengeStore();
  const c = store.issue("0x0000000000000000000000000000000000000001", "h", "dev", 1000);
  assert.equal(store.consume(c.id, 1000 + CHALLENGE_TTL_MS + 1), null);
  const ids = Array.from({ length: 8 }, (_, i) => store.issue("0x0000000000000000000000000000000000000002", "h", "dev", 2000 + i).id);
  assert.ok(store.size() <= 5);
  assert.equal(store.consume(ids[0], 3000), null, "the oldest went first");
  assert.ok(store.consume(ids[7], 3000));
  assert.equal(store.consume(42), null);
});

test("the session cookie: signed, bound to its environment, refused when changed or expired", () => {
  const now = 1_700_000_000_000;
  const token = signSession(SECRET, { address: "0xABCDEF0000000000000000000000000000000001", env: "prod", exp: now + 1000 });
  assert.deepEqual(readSession(SECRET, token, now), { address: "0xabcdef0000000000000000000000000000000001", env: "prod", exp: now + 1000 });
  assert.equal(readSession(SECRET, token, now + 1000), null, "expired");
  assert.equal(readSession(SECRET, token, now, "dev"), null, "another environment");
  assert.equal(readSession("y".repeat(40), token, now), null, "another secret");
  const [payload, sig] = token.split(".");
  const forged = Buffer.from(JSON.stringify({ a: "0x0000000000000000000000000000000000000009", e: "prod", x: now + 1000 })).toString("base64url");
  assert.equal(readSession(SECRET, `${forged}.${sig}`, now), null, "another wallet under the same MAC");
  assert.equal(readSession(SECRET, `${payload}.${sig}x`, now), null);
  assert.equal(readSession(SECRET, `${payload}`, now), null);
  assert.equal(readSession(SECRET, `${token}.x`, now), null);
  assert.equal(readSession(SECRET, null, now), null);
  assert.equal(readSession("", token, now), null);
  assert.throws(() => signSession("", { address: "0x0000000000000000000000000000000000000001", env: "prod", exp: 1 }));
});

test("the cookie is HttpOnly, SameSite=Strict, host-only on /p2p, Secure on https", () => {
  const c = sessionCookie("v", { secure: true, maxAgeSeconds: 3600 });
  assert.equal(c, `${APP_COOKIE}=v; Path=${APP_COOKIE_PATH}; Max-Age=3600; HttpOnly; SameSite=Strict; Secure`);
  assert.doesNotMatch(c, /Domain=/i);
  assert.doesNotMatch(sessionCookie("v", { secure: false, maxAgeSeconds: 1 }), /Secure/);
  assert.match(clearSessionCookie(true), /Max-Age=0/);
  assert.equal(cookieValue(`a=1; ${APP_COOKIE}=tok.en; b=2`, APP_COOKIE), "tok.en");
  assert.equal(cookieValue("a=1", APP_COOKIE), null);
  assert.equal(cookieValue(null, APP_COOKIE), null);
});
