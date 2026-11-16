import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { Keypair } from "@stellar/stellar-sdk";
import { secp256k1 } from "@noble/curves/secp256k1";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { readFileSync } from "node:fs";
import { verify as starkVerify, Signature as StarkSignature } from "@scure/starknet";
import { addedByAddress, CHALLENGE_TTL_MS, isLiveChallenge, normalizeWalletAddress, walletProofMessage, WALLET_PROVIDERS, type WalletChallenge } from "@/lib/org-wallets";
import { decodeBase58, recoverEvmSigner, verifyOwnershipProof, verifyWalletProof, type ProofContext } from "@/lib/org-wallets-verify";
import { ORG_PERMISSIONS } from "@/lib/org-permissions";
import { NETWORK_IDS, type NetworkId } from "@/lib/chains";
import { connectWalletBodySchema, walletChallengeBodySchema } from "@/schemas/org-wallets";

/* The organization's wallets: the challenge's message, its life, and the signature check on each
   network, against signatures made here and against published vectors (so the prefixes are the
   ones real wallets use, not only consistent with themselves). The per-network verifiers have their
   own vectors in walletProofs.test.ts; here every network goes through the route's dispatcher. */

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function encodeBase58(bytes: Uint8Array): string {
  let n = BigInt(`0x${Buffer.from(bytes).toString("hex") || "0"}`);
  let out = "";
  while (n > 0n) { out = BASE58[Number(n % 58n)] + out; n /= 58n; }
  for (const b of bytes) { if (b !== 0) break; out = `1${out}`; }
  return out;
}

const NONCE = "0f1e2d3c4b5a69788796a5b4c3d2e1f00112233445566778899aabbccddeeff0";
const message = walletProofMessage({ orgId: "org_123", chain: "stellar", address: "GABC", nonce: NONCE, issuedAt: "2026-10-25T20:00:00.000Z", expiresAt: "2026-10-25T20:10:00.000Z" });

test("the challenge's message names the organization, the network, the address, the nonce and its life", () => {
  assert.equal(message, [
    "Cosmos Pay",
    "Connect this wallet to an organization to receive its payments.",
    "Organization: org_123",
    "Network: Stellar",
    "Address: GABC",
    `Nonce: ${NONCE}`,
    "Issued at: 2026-10-25T20:00:00.000Z",
    "Expires at: 2026-10-25T20:10:00.000Z",
  ].join("\n"));
});

test("a challenge lives ten minutes", () => {
  const issued = Date.parse("2026-10-25T20:00:00.000Z");
  const expiresAt = new Date(issued + CHALLENGE_TTL_MS).toISOString();
  assert.equal(CHALLENGE_TTL_MS, 10 * 60_000);
  assert.equal(isLiveChallenge(expiresAt, issued), true);
  assert.equal(isLiveChallenge(expiresAt, issued + CHALLENGE_TTL_MS - 1), true);
  assert.equal(isLiveChallenge(expiresAt, issued + CHALLENGE_TTL_MS), false);
  assert.equal(isLiveChallenge("yesterday", issued), false);
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
  const base = { address: "GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7STMAQSMTGG", nonce: NONCE, signature: "a".repeat(88) };
  assert.equal(connectWalletBodySchema.safeParse({ ...base, chain: "stellar", provider: "freighter" }).success, true);
  assert.equal(connectWalletBodySchema.safeParse({ ...base, chain: "stellar", provider: "phantom" }).success, false);
  assert.equal(connectWalletBodySchema.safeParse({ ...base, chain: "solana", provider: "phantom" }).success, false);
  for (const [chain, providers] of Object.entries(WALLET_PROVIDERS)) assert.ok(providers.length > 0, chain);
  // Without the challenge it signed, nothing proves the wallet.
  assert.equal(connectWalletBodySchema.safeParse({ ...base, chain: "stellar", provider: "freighter", nonce: undefined }).success, false);
  assert.equal(connectWalletBodySchema.safeParse({ ...base, chain: "stellar", provider: "freighter", nonce: "abc" }).success, false);
});

/* A Stellar wallet proven with a signed XDR (any wallet, nothing connected): the proof transaction
   carries the proof message, can never apply, and counts only signed by the address. */
test("Stellar: the proof transaction is fixed by the organization, the address and the challenge, and never applies", async () => {
  const { walletProofTransactionXdr, WALLET_PROOF_DATA_NAME, WALLET_PROOF_PASSPHRASE } = await import("@/lib/wallets/wallet-proof-xdr");
  const { TransactionBuilder } = await import("@stellar/stellar-sdk");
  const kp = Keypair.random();
  const proof = { orgId: "org_123", address: kp.publicKey(), nonce: NONCE, issuedAt: "2026-10-27T12:00:00.000Z", expiresAt: "2026-10-27T12:10:00.000Z" };
  const xdr = walletProofTransactionXdr(proof);
  assert.equal(walletProofTransactionXdr(proof), xdr);
  assert.notEqual(walletProofTransactionXdr({ ...proof, orgId: "org_456" }), xdr);
  assert.notEqual(walletProofTransactionXdr({ ...proof, nonce: "1".repeat(64) }), xdr);
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
  const proof = { orgId: "org_123", address: kp.publicKey(), nonce: NONCE, issuedAt: "2026-10-27T12:00:00.000Z", expiresAt: "2026-10-27T12:10:00.000Z" };
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
  const base = { address: "GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7STMAQSMTGG", nonce: NONCE };
  const signedXdr = "A".repeat(200);
  assert.equal(connectWalletBodySchema.safeParse({ ...base, chain: "stellar", signedXdr }).success, true);
  assert.equal(connectWalletBodySchema.safeParse({ ...base, chain: "stellar", signedXdr, provider: "freighter" }).success, false);
  assert.equal(connectWalletBodySchema.safeParse({ ...base, chain: "stellar" }).success, false);
  assert.equal(connectWalletBodySchema.safeParse({ ...base, chain: "solana", address: "So11111111111111111111111111111111111111112", signedXdr }).success, false);
});

/* Every network a payment link settles on proves its wallets with a signature: the EVM ones and
   Fogo with the signatures above, the rest with their own standard. Only an address that cannot
   sign a message at all is added by its address, typed twice. */
test("every network proves its wallets with a signature; only addresses that cannot sign are typed twice", () => {
  assert.deepEqual(WALLET_PROVIDERS.base, ["evm"]);
  assert.deepEqual(WALLET_PROVIDERS.hypercore, ["evm"]);
  assert.deepEqual(WALLET_PROVIDERS.fogo, ["phantom", "solflare"]);
  assert.deepEqual(WALLET_PROVIDERS.tron, ["tip191"]);
  assert.deepEqual(WALLET_PROVIDERS.btc, ["bip322", "signmessage"]);
  for (const chain of NETWORK_IDS) assert.ok(!WALLET_PROVIDERS[chain].includes("address"), `${chain} has a signature`);
  // Addresses that sign: keys, and single keys wrapped in SegWit.
  for (const [chain, address] of [
    ["btc", "1Poj4FaWFGPhMF1ZMfx39k2DhPT7A8tp8P"], ["btc", "36dPsdEHe5Md1htZRbDYsbAAofC1QWC152"], ["btc", "bc1qlg5syy78nd2eq0a70flry29n00ryka9mgdvm4n"],
    ["btc", "bc1pxsxq9ayn2gke9samf29py2t49qvakgca2ywhks6txqfncd7al02syy6zc5"], ["ltc", "Li2gKTtLKvdkc3hiXowLRm5yubpPEfHU9v"], ["doge", "DTwpbWX9YgHytFCA6FwbhWBpaXBQWVCJDH"],
    ["dash", "XyVZtWEQCycHWBc9DZGG1Gi1Xj2oDK8dyb"], ["zec", "t1ggL4azeDbBHwt4TJ6mAHZ88x3eBsn2vgh"], ["bch", "bitcoincash:qrazjqsnc7d4typlhea8uv3gkdauvjm5hvmljndzlv"],
    ["tron", "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"], ["eth", "0x2527D02599Ba641c19FEa793cD0F167589a0f10D"], ["stellar", "GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7STMAQSMTGG"],
  ] as [NetworkId, string][]) assert.equal(addedByAddress(chain, address), false, `${chain} ${address}`);
  // Addresses that cannot: witness scripts, scripts where there is no SegWit, Zcash unified addresses.
  for (const [chain, address] of [
    ["btc", "bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3"], ["ltc", "ltc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3q0eqqqe"],
    ["doge", "A8c3xNz2mqsDLFwv5KL5fpH12QEwDaoTXo"], ["dash", "7gnwGHt17heGpG9Crfeh4KGpYNFugPhJdh"], ["bch", "bitcoincash:pqdcsl6c67z5ky5gt6hr6ntsn6e8ujpmdcd8hmvc6p"],
    ["zec", "t3Vz22vK5z2LcKEdg16Yv4FFneEL1zg9ojd"], ["zec", `u1${"q".repeat(120)}`],
  ] as [NetworkId, string][]) assert.equal(addedByAddress(chain, address), true, `${chain} ${address}`);
});

test("an EVM signature proves the same key on every EVM network, and on no other", () => {
  const priv = secp256k1.utils.randomPrivateKey();
  const address = `0x${Buffer.from(keccak_256(secp256k1.getPublicKey(priv, false).slice(1)).slice(-20)).toString("hex")}`;
  const text = new TextEncoder().encode(message);
  const digest = keccak_256(new Uint8Array([...new TextEncoder().encode(`\x19Ethereum Signed Message:\n${text.length}`), ...text]));
  const s = secp256k1.sign(digest, priv);
  const signature = `0x${Buffer.from(s.toCompactRawBytes()).toString("hex")}${(27 + s.recovery).toString(16)}`;
  assert.equal(verifyWalletProof("base", address, message, signature), true);
  assert.equal(verifyWalletProof("arb", address, message, signature), true);
  assert.equal(verifyWalletProof("tron", address, message, signature), false);
  assert.equal(normalizeWalletAddress("base", address.toUpperCase().replace("0X", "0x")), address);
  assert.equal(normalizeWalletAddress("tron", "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"), "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t");
  assert.match(walletProofMessage({ orgId: "org_1", chain: "base", address, nonce: NONCE, issuedAt: "2026-10-25T20:00:00.000Z", expiresAt: "2026-10-25T20:10:00.000Z" }), /Network: Base/);
});

test("an address that cannot sign is typed twice, with no signature; an address that can sign never is", () => {
  const p2wsh = { chain: "btc", address: "bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3", provider: "address" };
  assert.equal(connectWalletBodySchema.safeParse({ ...p2wsh, addressConfirm: p2wsh.address }).success, true);
  assert.equal(connectWalletBodySchema.safeParse({ ...p2wsh, addressConfirm: `${p2wsh.address.slice(0, -1)}4` }).success, false);
  assert.equal(connectWalletBodySchema.safeParse({ ...p2wsh, addressConfirm: p2wsh.address, signature: "a".repeat(88) }).success, false);
  const tron = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
  assert.equal(connectWalletBodySchema.safeParse({ chain: "tron", address: tron, provider: "address", addressConfirm: tron }).success, false, "Tron signs: never by address");
  assert.equal(connectWalletBodySchema.safeParse({ chain: "tron", address: tron, provider: "tip191", nonce: NONCE, signature: `0x${"a".repeat(130)}` }).success, true);
  assert.equal(connectWalletBodySchema.safeParse({ chain: "tron", address: tron, provider: "evm", nonce: NONCE, signature: `0x${"a".repeat(130)}` }).success, false);
  const evm = "0x2527D02599Ba641c19FEa793cD0F167589a0f10D";
  assert.equal(connectWalletBodySchema.safeParse({ chain: "base", address: evm, provider: "address", addressConfirm: evm }).success, false);
  assert.equal(connectWalletBodySchema.safeParse({ chain: "base", address: evm, provider: "evm", nonce: NONCE, signature: "a".repeat(132) }).success, true);
  assert.equal(connectWalletBodySchema.safeParse({ chain: "ton", address: "UQAUGur5EsUnRjaGADHOuNpsaTgto82lGpzbfyLm11ymwHON", provider: "tonproof", nonce: NONCE, proof: { publicKey: "x" } }).success, true);
  assert.equal(connectWalletBodySchema.safeParse({ chain: "ton", address: "UQAUGur5EsUnRjaGADHOuNpsaTgto82lGpzbfyLm11ymwHON", provider: "tonproof", nonce: NONCE, proof: { big: "x".repeat(9000) } }).success, false, "a proof is bounded");
});

test("a challenge is asked for an address that can sign (TON: none, its wallet names it)", () => {
  assert.equal(walletChallengeBodySchema.safeParse({ chain: "tron", address: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t" }).success, true);
  assert.equal(walletChallengeBodySchema.safeParse({ chain: "tron" }).success, false);
  assert.equal(walletChallengeBodySchema.safeParse({ chain: "ton" }).success, true);
  assert.equal(walletChallengeBodySchema.safeParse({ chain: "tron", address: "0x2527D02599Ba641c19FEa793cD0F167589a0f10D" }).success, false);
  assert.equal(walletChallengeBodySchema.safeParse({ chain: "btc", address: "bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3" }).success, false, "a P2WSH address cannot sign");
});

/* The route's dispatcher, network by network, over signatures made by each network's own libraries
   (tests/unit/fixtures/wallet-proof-vectors.json) for one challenge. The chain reads answer as the
   nodes do; the Starknet account runs the STARK check its contract runs. */
const V = JSON.parse(readFileSync(new URL("./fixtures/wallet-proof-vectors.json", import.meta.url), "utf8"));
const challengeOf = (chain: NetworkId, address: string | null): WalletChallenge => ({ orgId: V.orgId, chain, address, nonce: V.nonce, issuedAt: V.issuedAt, expiresAt: V.expiresAt });
const ctx: ProofContext = {
  host: "dev.cosmospay.lat",
  near: async (_m, params) => {
    const p = params as { request_type: string; account_id: string; public_key?: string };
    if (p.request_type === "view_access_key") {
      return p.account_id === V.near.named.accountId && p.public_key === V.near.named.publicKey
        ? { result: { nonce: 1, permission: "FullAccess" } }
        : { result: { error: `access key ${p.public_key} does not exist while viewing` } };
    }
    return { error: { name: "HANDLER_ERROR", cause: { name: "UNKNOWN_ACCOUNT" } } };
  },
  aptos: async () => null,
  movement: async () => null,
  starknet: async (contract, _selector, calldata) => {
    if (BigInt(contract) !== BigInt(V.starknet.address)) return null;
    const [hash, , r, s] = calldata;
    return [starkVerify(new StarkSignature(BigInt(r), BigInt(s)), BigInt(hash).toString(16).padStart(64, "0"), V.starknet.fullPublicKey.slice(2)) ? "0x56414c4944" : "0x0"];
  },
};

const CASES: { name: string; chain: NetworkId; address: string; message?: string; input: Parameters<typeof verifyOwnershipProof>[2]; challengeAddress?: null }[] = [
  { name: "Tron", chain: "tron", address: V.tron.address, message: V.tron.message, input: { provider: "tip191", signature: V.tron.signature } },
  { name: "TON", chain: "ton", address: V.ton.address, challengeAddress: null, input: { provider: "tonproof", proof: { publicKey: V.ton.publicKey, walletStateInit: V.ton.walletStateInit, proof: V.ton.proof } } },
  { name: "NEAR (named)", chain: "near", address: V.near.named.accountId, message: V.near.named.message, input: { provider: "nep413", proof: { publicKey: V.near.named.publicKey, signature: V.near.named.signature } } },
  { name: "NEAR (implicit)", chain: "near", address: V.near.implicit.accountId, message: V.near.implicit.message, input: { provider: "nep413", proof: { publicKey: V.near.implicit.publicKey, signature: V.near.implicit.signature } } },
  { name: "Sui", chain: "sui", address: V.sui.ed25519.address, message: V.sui.ed25519.message, input: { provider: "sui", signature: V.sui.ed25519.signature } },
  { name: "Aptos", chain: "aptos", address: V.aptos.address, message: V.aptos.message, input: { provider: "aip62", proof: { publicKey: V.aptos.publicKey, signature: V.aptos.signature, fullMessage: V.aptos.fullMessage } } },
  { name: "Movement", chain: "movement", address: V.movement.address, message: V.movement.message, input: { provider: "aip62", proof: { publicKey: V.movement.publicKey, signature: V.movement.signature, fullMessage: V.movement.fullMessage } } },
  { name: "Starknet", chain: "starknet", address: V.starknet.address, input: { provider: "snip12", proof: { signature: V.starknet.signature } } },
  { name: "Cardano", chain: "cardano", address: V.cardano.base.address, message: V.cardano.base.message, input: { provider: "cip30", proof: { signature: V.cardano.base.signature, key: V.cardano.base.key } } },
  { name: "XRP Ledger", chain: "xrp", address: V.xrpl.secp256k1.address, message: V.xrpl.secp256k1.message, input: { provider: "xrpl", proof: { publicKey: V.xrpl.secp256k1.publicKey, signature: V.xrpl.secp256k1.signature } } },
  { name: "Aleo", chain: "aleo", address: V.aleo.address, message: V.aleo.message, input: { provider: "aleo", signature: V.aleo.signature } },
  { name: "Bitcoin BIP-322", chain: "btc", address: V.btc.bip322_p2tr.address, message: V.btc.bip322_p2tr.message, input: { provider: "bip322", signature: V.btc.bip322_p2tr.signature } },
  { name: "Bitcoin BIP-137", chain: "btc", address: V.btc.bip137_p2wpkh.address, message: V.btc.bip137_p2wpkh.message, input: { provider: "signmessage", signature: V.btc.bip137_p2wpkh.signature } },
  { name: "Litecoin", chain: "ltc", address: V.ltc.address, message: V.ltc.message, input: { provider: "signmessage", signature: V.ltc.signature } },
  { name: "Dogecoin", chain: "doge", address: V.doge.address, message: V.doge.message, input: { provider: "signmessage", signature: V.doge.signature } },
  { name: "Dash", chain: "dash", address: V.dash.address, message: V.dash.message, input: { provider: "signmessage", signature: V.dash.signature } },
  { name: "Zcash", chain: "zec", address: V.zec.address, message: V.zec.message, input: { provider: "signmessage", signature: V.zec.signature } },
  { name: "Bitcoin Cash", chain: "bch", address: V.bch.address, message: V.bch.message, input: { provider: "signmessage", signature: V.bch.signature } },
];

for (const c of CASES) {
  test(`dispatcher: ${c.name} proves its address over the challenge, and nothing else`, async () => {
    const challenge = challengeOf(c.chain, c.challengeAddress === null ? null : c.address);
    if (c.message) assert.equal(walletProofMessage({ ...challenge, address: c.address }), c.message, "the vector signed this app's message");
    assert.equal(await verifyOwnershipProof(challenge, c.address, c.input, ctx), true);
    // Another challenge (nonce), another organization, another provider: refused.
    assert.equal(await verifyOwnershipProof({ ...challenge, nonce: "1".repeat(64) }, c.address, c.input, ctx), false, "another nonce");
    assert.equal(await verifyOwnershipProof({ ...challenge, orgId: "org_other" }, c.address, c.input, ctx), c.chain === "ton", "another organization (TON's proof names the nonce only, which the server ties to the organization)");
    assert.equal(await verifyOwnershipProof(challenge, c.address, { ...c.input, provider: "evm" }, ctx), false, "a provider that does not sign there");
  });
}

test("dispatcher: TON's proof binds its host; NEAR's its recipient", async () => {
  const ton = CASES.find((c) => c.chain === "ton")!;
  assert.equal(await verifyOwnershipProof(challengeOf("ton", null), ton.address, ton.input, { ...ctx, host: "evil.example" }), false);
  const near = CASES.find((c) => c.name === "NEAR (named)")!;
  assert.equal(await verifyOwnershipProof(challengeOf("near", near.address), near.address, near.input, { ...ctx, host: "evil.example" }), false);
});
