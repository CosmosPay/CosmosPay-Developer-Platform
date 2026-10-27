import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { Keypair } from "@stellar/stellar-sdk";
import { secp256k1 } from "@noble/curves/secp256k1";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { isFreshProof, normalizeWalletAddress, PROOF_MAX_AGE_MS, walletProofMessage, WALLET_PROVIDERS } from "@/lib/org-wallets";
import { decodeBase58, recoverEvmSigner, verifyWalletProof } from "@/lib/org-wallets-verify";
import { ORG_PERMISSIONS } from "@/lib/org-permissions";
import { connectWalletBodySchema } from "@/schemas/org-wallets";

/* The organization's wallets: the proof message, its freshness, and the signature check on each
   network, against signatures made here and against published vectors (so the prefixes are the
   ones real wallets use, not only consistent with themselves). */

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function encodeBase58(bytes: Uint8Array): string {
  let n = BigInt(`0x${Buffer.from(bytes).toString("hex") || "0"}`);
  let out = "";
  while (n > 0n) { out = BASE58[Number(n % 58n)] + out; n /= 58n; }
  for (const b of bytes) { if (b !== 0) break; out = `1${out}`; }
  return out;
}

const message = walletProofMessage({ orgId: "org_123", chain: "stellar", address: "GABC", issuedAt: "2026-10-25T20:00:00.000Z" });

test("the proof message names the organization, the network, the address and when", () => {
  assert.equal(message, [
    "Cosmos Pay",
    "Connect this wallet to an organization to receive its payments.",
    "Organization: org_123",
    "Network: Stellar",
    "Address: GABC",
    "Issued at: 2026-10-25T20:00:00.000Z",
  ].join("\n"));
});

test("a proof is accepted for ten minutes, and only slightly ahead of the clock", () => {
  const now = Date.parse("2026-10-25T20:00:00.000Z");
  const at = (ms: number) => new Date(now + ms).toISOString();
  assert.equal(isFreshProof(at(0), now), true);
  assert.equal(isFreshProof(at(-PROOF_MAX_AGE_MS + 1000), now), true);
  assert.equal(isFreshProof(at(-PROOF_MAX_AGE_MS - 1000), now), false);
  assert.equal(isFreshProof(at(60_000), now), true);
  assert.equal(isFreshProof(at(5 * 60_000), now), false);
  assert.equal(isFreshProof("yesterday", now), false);
});

test("EVM addresses compare without case; the others keep theirs", () => {
  assert.equal(normalizeWalletAddress("monad", " 0xAbCDEF0000000000000000000000000000000001 "), "0xabcdef0000000000000000000000000000000001");
  assert.equal(normalizeWalletAddress("solana", "So11111111111111111111111111111111111111112"), "So11111111111111111111111111111111111111112");
});

test("Stellar: a SEP-53 signature from the account proves it, any other does not", () => {
  const kp = Keypair.random();
  // The SDK's sign returns a Uint8Array, whose toString ignores "base64": wrap it in a Buffer.
  const sig = Buffer.from(kp.sign(createHash("sha256").update(`Stellar Signed Message:\n${message}`, "utf8").digest())).toString("base64");
  assert.equal(verifyWalletProof("stellar", kp.publicKey(), message, sig), true);
  assert.equal(verifyWalletProof("stellar", kp.publicKey(), `${message}x`, sig), false);
  assert.equal(verifyWalletProof("stellar", Keypair.random().publicKey(), message, sig), false);
  assert.equal(verifyWalletProof("stellar", kp.publicKey(), message, "not-base64!"), false);
  assert.equal(verifyWalletProof("stellar", "GNOTANACCOUNT", message, sig), false);
});

test("Stellar: SEP-53's own test vector verifies", () => {
  // stellar-protocol ecosystem/sep-0053.md: its ASCII and its Japanese test case, with its example key.
  const address = Keypair.fromSecret("SAKICEVQLYWGSOJS4WW7HZJWAHZVEEBS527LHK5V4MLJALYKICQCJXMW").publicKey();
  assert.equal(address, "GBXFXNDLV4LSWA4VB7YIL5GBD7BVNR22SGBTDKMO2SBZZHDXSKZYCP7L");
  assert.equal(verifyWalletProof("stellar", address, "Hello, World!", "fO5dbYhXUhBMhe6kId/cuVq/AfEnHRHEvsP8vXh03M1uLpi5e46yO2Q8rEBzu3feXQewcQE5GArp88u6ePK6BA=="), true);
  assert.equal(verifyWalletProof("stellar", address, "こんにちは、世界！", "CDU265Xs8y3OWbB/56H9jPgUss5G9A0qFuTqH2zs2YDgTm+++dIfmAEceFqB7bhfN3am59lCtDXrCtwH2k1GBA=="), true);
});

test("Solana: an Ed25519 signature over the text proves the address", () => {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const raw = Buffer.from(publicKey.export({ format: "jwk" }).x as string, "base64url");
  const address = encodeBase58(raw);
  assert.deepEqual(decodeBase58(address), new Uint8Array(raw));
  const sig = sign(null, Buffer.from(message, "utf8"), privateKey).toString("base64");
  assert.equal(verifyWalletProof("solana", address, message, sig), true);
  assert.equal(verifyWalletProof("solana", address, `${message}x`, sig), false);
  const other = encodeBase58(Buffer.from(generateKeyPairSync("ed25519").publicKey.export({ format: "jwk" }).x as string, "base64url"));
  assert.equal(verifyWalletProof("solana", other, message, sig), false);
});

test("base58 keeps leading zeros and refuses what is not base58", () => {
  assert.deepEqual(decodeBase58("11111111111111111111111111111111"), new Uint8Array(32));
  assert.equal(decodeBase58("0OIl"), null);
  assert.equal(decodeBase58("1".repeat(65)), null);
});

test("Monad (EVM): personal_sign recovers the signer, in any letter case", () => {
  const priv = secp256k1.utils.randomPrivateKey();
  const address = `0x${Buffer.from(keccak_256(secp256k1.getPublicKey(priv, false).slice(1)).slice(-20)).toString("hex")}`;
  const text = new TextEncoder().encode(message);
  const digest = keccak_256(new Uint8Array([...new TextEncoder().encode(`\x19Ethereum Signed Message:\n${text.length}`), ...text]));
  const s = secp256k1.sign(digest, priv);
  const signature = `0x${Buffer.from(s.toCompactRawBytes()).toString("hex")}${(27 + s.recovery).toString(16)}`;
  assert.equal(recoverEvmSigner(message, signature), address);
  assert.equal(verifyWalletProof("monad", address.toUpperCase().replace("0X", "0x"), message, signature), true);
  assert.equal(verifyWalletProof("monad", "0x0000000000000000000000000000000000000001", message, signature), false);
  assert.equal(recoverEvmSigner(message, "0x1234"), null);
});

test("Monad (EVM): the personal_sign example web3.js documents recovers its account", () => {
  // web3.eth.accounts.sign("Some data", "0x4c0883a6…") in the web3.js documentation.
  const signature = "0xb91467e570a6466aa9e9876cbcd013baba02900b8979d43fe208a4a4f339f5fd6007e74cd82e037b800186422fc2da167c747ef045e5d18a5f5d4300f8e1a0291c";
  assert.equal(recoverEvmSigner("Some data", signature), "0x2c7536e3605d9c16a7a3d7b1898e529396a65c23");
});

test("wallets are a permission resource like the others", () => {
  for (const p of ["wallets:create", "wallets:edit", "wallets:delete"]) assert.ok(ORG_PERMISSIONS.includes(p as never), p);
});

test("a connect request names a wallet that signs on its network and an address of its shape", () => {
  const base = { address: "GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7STMAQSMTGG", issuedAt: "2026-10-25T20:00:00.000Z", signature: "a".repeat(88) };
  assert.equal(connectWalletBodySchema.safeParse({ ...base, chain: "stellar", provider: "freighter" }).success, true);
  assert.equal(connectWalletBodySchema.safeParse({ ...base, chain: "stellar", provider: "phantom" }).success, false);
  assert.equal(connectWalletBodySchema.safeParse({ ...base, chain: "solana", provider: "phantom" }).success, false);
  for (const [chain, providers] of Object.entries(WALLET_PROVIDERS)) assert.ok(providers.length > 0, chain);
});

/* A Stellar wallet proven with a signed XDR (any wallet, nothing connected): the proof transaction
   carries the proof message, can never apply, and counts only signed by the address. */
test("Stellar: the proof transaction is fixed by the organization, the address and the time, and never applies", async () => {
  const { walletProofTransactionXdr, WALLET_PROOF_DATA_NAME, WALLET_PROOF_PASSPHRASE } = await import("@/lib/wallets/wallet-proof-xdr");
  const { TransactionBuilder } = await import("@stellar/stellar-sdk");
  const kp = Keypair.random();
  const proof = { orgId: "org_123", address: kp.publicKey(), issuedAt: "2026-10-27T12:00:00.000Z" };
  const xdr = walletProofTransactionXdr(proof);
  assert.equal(walletProofTransactionXdr(proof), xdr);
  assert.notEqual(walletProofTransactionXdr({ ...proof, orgId: "org_456" }), xdr);
  assert.notEqual(walletProofTransactionXdr({ ...proof, issuedAt: "2026-10-27T12:00:01.000Z" }), xdr);
  const tx = TransactionBuilder.fromXDR(xdr, WALLET_PROOF_PASSPHRASE) as unknown as { sequence: string; operations: { type: string; name: string }[] };
  assert.equal(tx.sequence, "1");
  assert.equal(tx.operations[0].type, "manageData");
  assert.equal(tx.operations[0].name, WALLET_PROOF_DATA_NAME);
});

test("Stellar: a signed proof XDR counts only from the address, for the public network or testnet", async () => {
  const { checkWalletProofXdr, walletProofTransactionXdr } = await import("@/lib/wallets/wallet-proof-xdr");
  const { Networks, TransactionBuilder } = await import("@stellar/stellar-sdk");
  const kp = Keypair.random();
  const proof = { orgId: "org_123", address: kp.publicKey(), issuedAt: "2026-10-27T12:00:00.000Z" };
  const signedFor = (passphrase: string, signer: Keypair, xdr = walletProofTransactionXdr(proof)) => {
    const tx = TransactionBuilder.fromXDR(xdr, passphrase);
    tx.sign(signer);
    return tx.toXDR();
  };
  assert.deepEqual(checkWalletProofXdr(proof, signedFor(Networks.PUBLIC, kp)), { ok: true });
  assert.deepEqual(checkWalletProofXdr(proof, signedFor(Networks.TESTNET, kp)), { ok: true });
  assert.deepEqual(checkWalletProofXdr(proof, signedFor(Networks.PUBLIC, Keypair.random())), { ok: false, problem: "notSigned" });
  // Another organization's proof, signed by the same wallet, does not connect it here.
  const other = walletProofTransactionXdr({ ...proof, orgId: "org_456" });
  assert.deepEqual(checkWalletProofXdr(proof, signedFor(Networks.PUBLIC, kp, other)), { ok: false, problem: "otherTransaction" });
  assert.deepEqual(checkWalletProofXdr(proof, "garbage"), { ok: false, problem: "invalid" });
  // A G… string with a broken checksum signed nothing, and refuses without throwing.
  assert.deepEqual(checkWalletProofXdr({ ...proof, address: "GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7STMAQSMTGH" }, signedFor(Networks.PUBLIC, kp)), { ok: false, problem: "notSigned" });
});

test("a connect request proves a wallet with a provider's signature, or with a signed XDR on Stellar only", () => {
  const base = { address: "GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7STMAQSMTGG", issuedAt: "2026-10-25T20:00:00.000Z" };
  const signedXdr = "A".repeat(200);
  assert.equal(connectWalletBodySchema.safeParse({ ...base, chain: "stellar", signedXdr }).success, true);
  assert.equal(connectWalletBodySchema.safeParse({ ...base, chain: "stellar", signedXdr, provider: "freighter" }).success, false);
  assert.equal(connectWalletBodySchema.safeParse({ ...base, chain: "stellar" }).success, false);
  assert.equal(connectWalletBodySchema.safeParse({ ...base, chain: "solana", address: "So11111111111111111111111111111111111111112", signedXdr }).success, false);
});
