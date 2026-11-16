/* The wallet-proof verifiers (src/lib/wallet-proofs) against signatures made by each network's own
   libraries (tests/unit/fixtures/wallet-proof-vectors.json: TronWeb, @ton/crypto + a v4 wallet's
   state init, near-api-js's KeyPair over NEP-413's borsh, @mysten/sui's keypairs, the Aptos TS SDK,
   starknet.js's typed-data signer, @emurgo/cardano-message-signing (CIP-8), ripple-keypairs, the
   Aleo SDK, bitcoinjs-message and bip322-js, plus BIP-322's own "Hello World" vector). Each is
   checked as made, then with the message, the address or the signature changed. The chain reads
   (NEAR access keys, Aptos authentication keys, a Starknet account's validation) answer as a node
   does; the Starknet account's answer runs the STARK curve check an account contract runs. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Signature as StarkSignature, verify as starkVerify } from "@scure/starknet";
import { verifyTron } from "@/lib/wallet-proofs/tron";
import { readTonProof, verifyTon } from "@/lib/wallet-proofs/ton";
import { nep413Digest, verifyNear, type NearRpc } from "@/lib/wallet-proofs/near";
import { verifySui } from "@/lib/wallet-proofs/sui";
import { authKeysOf, verifyAptos } from "@/lib/wallet-proofs/aptos";
import { starknetMessageHash, verifyStarknet, type StarknetCall } from "@/lib/wallet-proofs/starknet";
import { cardanoPaymentKeyHash, verifyCardano } from "@/lib/wallet-proofs/cardano";
import { verifyXrpl, xrplAccountId } from "@/lib/wallet-proofs/xrpl";
import { readAleoSignature, verifyAleo } from "@/lib/wallet-proofs/aleo";
import { canSignMessage, verifyBip322Simple, verifyBitcoinFamily, verifyCompactSignature } from "@/lib/wallet-proofs/bitcoin";
import { fromHex } from "@/lib/wallet-proofs/bytes";

const V = JSON.parse(readFileSync(new URL("./fixtures/wallet-proof-vectors.json", import.meta.url), "utf8"));
const flipB64 = (s: string) => {
  const bytes = Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  bytes[bytes.length - 2] ^= 1;
  return btoa(String.fromCharCode(...bytes));
};
const flipHex = (s: string) => {
  const prefix = s.startsWith("0x") ? "0x" : "";
  const hex = s.slice(prefix.length);
  const i = Math.floor(hex.length / 2);
  return prefix + hex.slice(0, i) + (hex[i] === "0" ? "1" : "0") + hex.slice(i + 1);
};

test("Tron: TIP-191 signMessageV2", () => {
  const v = V.tron;
  assert.equal(verifyTron(v.address, v.message, v.signature), true);
  assert.equal(verifyTron(v.address, `${v.message}.`, v.signature), false);
  assert.equal(verifyTron("TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7", v.message, v.signature), false);
  assert.equal(verifyTron(v.address, v.message, flipHex(v.signature)), false);
  assert.equal(verifyTron(v.address, v.message, "0x1234"), false);
});

test("TON: ton_proof with the wallet's state init", () => {
  const v = V.ton;
  const proof = readTonProof({ publicKey: v.publicKey, walletStateInit: v.walletStateInit, proof: v.proof });
  assert.ok(proof);
  const expected = { payload: v.proof.payload, domain: v.proof.domain.value, notBefore: v.proof.timestamp - 60, notAfter: v.proof.timestamp + 600 };
  assert.equal(verifyTon(v.address, proof, expected), true);
  assert.equal(verifyTon(v.rawAddress, proof, expected), true, "the raw form names the same account");
  assert.equal(verifyTon(v.address, proof, { ...expected, payload: "other" }), false, "another challenge");
  assert.equal(verifyTon(v.address, proof, { ...expected, domain: "evil.example" }), false, "another site");
  assert.equal(verifyTon(v.address, proof, { ...expected, notAfter: v.proof.timestamp - 1 }), false, "outside the challenge's life");
  assert.equal(verifyTon("0:0000000000000000000000000000000000000000000000000000000000000000", proof, expected), false, "another account");
  assert.equal(verifyTon(v.address, { ...proof, proof: { ...proof.proof, signature: flipB64(proof.proof.signature) } }, expected), false);
  assert.equal(verifyTon(v.address, { ...proof, publicKey: "00".repeat(32) }, expected), false, "a key the wallet does not hold");
});

/* A NEAR node, as it answers: the key's permission, or that it does not exist; the account, or that it does not exist. */
function nearNode({ keys = {} as Record<string, string>, accounts = [] as string[] }): NearRpc {
  return async (_method, params) => {
    const p = params as { request_type: string; account_id: string; public_key?: string };
    if (p.request_type === "view_access_key") {
      const permission = keys[`${p.account_id}/${p.public_key}`];
      return permission ? { result: { nonce: 1, permission, block_height: 1 } } : { result: { error: `access key ${p.public_key} does not exist while viewing`, logs: [] } };
    }
    return accounts.includes(p.account_id)
      ? { result: { amount: "1", storage_usage: 182 } }
      : { error: { name: "HANDLER_ERROR", cause: { name: "UNKNOWN_ACCOUNT" } } };
  };
}

test("NEAR: NEP-413 signature by a full-access key of the account", async () => {
  const n = V.near.named;
  const expected = { message: n.message, nonce: n.nonce, recipient: n.recipient };
  const proof = { publicKey: n.publicKey, signature: n.signature };
  assert.equal(nep413Digest("x", new Uint8Array(32), "r").length, 32);
  assert.equal(await verifyNear(n.accountId, proof, expected, nearNode({ keys: { [`${n.accountId}/${n.publicKey}`]: "FullAccess" } })), true);
  assert.equal(await verifyNear(n.accountId, proof, expected, nearNode({ keys: { [`${n.accountId}/${n.publicKey}`]: { FunctionCall: {} } as never } })), false, "a function-call key cannot");
  assert.equal(await verifyNear(n.accountId, proof, expected, nearNode({})), false, "a key the account does not have");
  assert.equal(await verifyNear(n.accountId, proof, { ...expected, message: `${n.message}.` }, nearNode({ keys: { [`${n.accountId}/${n.publicKey}`]: "FullAccess" } })), false);
  assert.equal(await verifyNear(n.accountId, proof, { ...expected, recipient: "evil.example" }, nearNode({ keys: { [`${n.accountId}/${n.publicKey}`]: "FullAccess" } })), false);
  assert.equal(await verifyNear(n.accountId, { ...proof, signature: flipB64(proof.signature) }, expected, nearNode({ keys: { [`${n.accountId}/${n.publicKey}`]: "FullAccess" } })), false);

  const i = V.near.implicit;
  const iProof = { publicKey: i.publicKey, signature: i.signature };
  const iExpected = { message: i.message, nonce: i.nonce, recipient: i.recipient };
  assert.equal(await verifyNear(i.accountId, iProof, iExpected, nearNode({})), true, "an implicit account not on chain is its key's");
  assert.equal(await verifyNear(i.accountId, iProof, iExpected, nearNode({ accounts: [i.accountId] })), false, "once on chain, only its listed keys count");
  assert.equal(await verifyNear(i.accountId, iProof, iExpected, nearNode({ accounts: [i.accountId], keys: { [`${i.accountId}/${i.publicKey}`]: "FullAccess" } })), true);
});

test("Sui: personal message, Ed25519 and Secp256k1", () => {
  for (const scheme of ["ed25519", "secp256k1"] as const) {
    const v = V.sui[scheme];
    assert.equal(verifySui(v.address, v.message, v.signature), true, scheme);
    assert.equal(verifySui(v.address, `${v.message}.`, v.signature), false, scheme);
    assert.equal(verifySui(`0x${"1".repeat(64)}`, v.message, v.signature), false, scheme);
    assert.equal(verifySui(v.address, v.message, flipB64(v.signature)), false, scheme);
  }
});

test("Aptos and Movement: AIP-62 signMessage and the account's authentication key", async () => {
  for (const net of ["aptos", "movement"] as const) {
    const v = V[net];
    const proof = { publicKey: v.publicKey, signature: v.signature, fullMessage: v.fullMessage };
    const [legacy] = authKeysOf(fromHex(v.publicKey)!);
    assert.equal(legacy, v.address, `${net}: the vector's address is its key's legacy authentication key`);
    assert.equal(await verifyAptos(v.address, v.message, v.nonce, proof, async () => null), true, `${net}: account not on chain`);
    assert.equal(await verifyAptos(v.address, v.message, v.nonce, proof, async () => v.address), true, `${net}: on chain, same key`);
    assert.equal(await verifyAptos(v.address, v.message, v.nonce, proof, async () => `0x${"ab".repeat(32)}`), false, `${net}: key rotated away`);
    assert.equal(await verifyAptos(v.address, v.message, "another-nonce", proof, async () => null), false, `${net}: another challenge`);
    assert.equal(await verifyAptos(v.address, `${v.message}.`, v.nonce, proof, async () => null), false, `${net}: another message`);
    assert.equal(await verifyAptos(v.address, v.message, v.nonce, { ...proof, signature: flipHex(proof.signature) }, async () => null), false, `${net}: altered signature`);
    const forged = proof.fullMessage.replace("APTOS\n", "APTOS\nextra: x\n");
    assert.equal(await verifyAptos(v.address, v.message, v.nonce, { ...proof, fullMessage: forged }, async () => null), false, `${net}: envelope with unknown lines`);
  }
});

test("Starknet: SNIP-12 revision 1 hash, validated by the account", async () => {
  const v = V.starknet;
  const msg = v.typedData.message;
  assert.equal(`0x${starknetMessageHash(v.address, msg).toString(16)}`, v.messageHash, "the hash starknet.js signs");
  // The account contract: is_valid_signature(hash, signature) answers VALID when its key signed the hash.
  const account: StarknetCall = async (contract, selector, calldata) => {
    if (BigInt(contract) !== BigInt(v.address)) return null;
    if (selector !== "0x28420862938116cb3bbdbedee07451ccc54d4e9412dbef71142ad1980a30941") return null;
    const [hash, , r, s] = calldata;
    try {
      return [starkVerify(new StarkSignature(BigInt(r), BigInt(s)), BigInt(hash).toString(16).padStart(64, "0"), v.fullPublicKey.slice(2)) ? "0x56414c4944" : "0x0"];
    } catch {
      return ["0x0"];
    }
  };
  assert.equal(await verifyStarknet(v.address, msg, v.signature, account), true);
  assert.equal(await verifyStarknet(v.address, { ...msg, nonce: "0x1234" }, v.signature, account), false, "another challenge");
  assert.equal(await verifyStarknet(v.address, { ...msg, expires: msg.expires + 1 }, v.signature, account), false, "another expiry");
  assert.equal(await verifyStarknet(v.address, msg, [v.signature[0], flipHex(v.signature[1])], account), false);
  assert.equal(await verifyStarknet(`0x${"5".repeat(63)}`, msg, v.signature, account), false, "an account that is not deployed answers nothing");
});

test("Cardano: CIP-30 signData (CIP-8 COSE_Sign1) from the payment key", () => {
  for (const kind of ["enterprise", "base"] as const) {
    const v = V.cardano[kind];
    assert.ok(cardanoPaymentKeyHash(v.address), kind);
    assert.equal(verifyCardano(v.address, v.message, { signature: v.signature, key: v.key }), true, kind);
    assert.equal(verifyCardano(v.address, `${v.message}.`, { signature: v.signature, key: v.key }), false, kind);
    assert.equal(verifyCardano(v.address, v.message, { signature: flipHex(v.signature), key: v.key }), false, kind);
  }
  const e = V.cardano.enterprise;
  const b = V.cardano.base;
  assert.equal(verifyCardano(b.address, e.message, { signature: e.signature, key: e.key }), false, "the protected header names another address");
  assert.equal(verifyCardano(e.address, e.message, { signature: e.signature, key: b.key }), false, "another key");
  assert.equal(cardanoPaymentKeyHash("addr1w8phkx6acpnf78fuvxn0mkew3l0fd058hzquvz7w36x4gtcyjy7wx"), null, "a script address cannot sign");
  assert.equal(cardanoPaymentKeyHash("stake1u9ylzsgxaa6xctf4juup682ar3juj85n8tx3hthnljg47zctvm3rc"), null, "a reward address receives no payments");
});

test("XRP Ledger: keypairs signatures, secp256k1 and Ed25519", () => {
  for (const scheme of ["secp256k1", "ed25519"] as const) {
    const v = V.xrpl[scheme];
    assert.ok(xrplAccountId(v.address), scheme);
    assert.equal(verifyXrpl(v.address, v.message, v.publicKey, v.signature), true, scheme);
    assert.equal(verifyXrpl(v.address, `${v.message}.`, v.publicKey, v.signature), false, scheme);
    assert.equal(verifyXrpl("rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh", v.message, v.publicKey, v.signature), false, `${scheme}: another account`);
    assert.equal(verifyXrpl(v.address, v.message, v.publicKey, flipHex(v.signature)), false, scheme);
  }
  assert.equal(xrplAccountId("r48WUUMoDHEta2wkrM149YrDJnnv9iJjqK"), null, "bad checksum");
});

test("Aleo: the wallet's signMessage, verified by snarkVM", () => {
  const v = V.aleo;
  const sig = readAleoSignature(v.signature);
  assert.equal(sig, v.signature);
  assert.equal(readAleoSignature(Array.from(new TextEncoder().encode(v.signature))), v.signature, "as the adapter's bytes");
  assert.equal(verifyAleo(v.address, v.message, v.signature), true);
  assert.equal(verifyAleo(v.address, `${v.message}.`, v.signature), false);
  assert.equal(verifyAleo("aleo1rhgdu77hgyqd3xjj8ucu3jj9r2krwz6mnzyd80gncr5fxcwlh5rsvzp9px", v.message, v.signature), false);
  assert.equal(readAleoSignature("not a signature"), null);
});

test("Bitcoin: BIP-137 compact signatures and BIP-322 simple", () => {
  for (const [name, v] of Object.entries(V.btc) as [string, { address: string; message: string; signature: string }][]) {
    assert.equal(verifyBitcoinFamily("btc", v.address, v.message, v.signature), true, name);
    assert.equal(verifyBitcoinFamily("btc", v.address, `${v.message}.`, v.signature), false, name);
    assert.equal(verifyBitcoinFamily("btc", v.address, v.message, flipB64(v.signature)), false, name);
  }
  const hello = V.btc.bip322_spec_hello;
  assert.equal(verifyBip322Simple(hello.address, hello.message, hello.signature), true, "BIP-322's own vector");
  assert.equal(verifyBip322Simple(hello.address, "", hello.signature), false);
  assert.equal(canSignMessage("btc", "bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3"), false, "P2WSH (a script) signs no simple message");
});

test("Litecoin, Dogecoin, Dash, Zcash, Bitcoin Cash: legacy signmessage", () => {
  for (const coin of ["ltc", "doge", "dash", "zec", "bch"] as const) {
    const v = V[coin];
    assert.equal(verifyCompactSignature(coin, v.address, v.message, v.signature), true, coin);
    assert.equal(verifyCompactSignature(coin, v.address, `${v.message}.`, v.signature), false, coin);
    assert.equal(verifyCompactSignature(coin, v.address, v.message, flipB64(v.signature)), false, coin);
  }
  // Each coin's own magic: a Litecoin signature does not pass as a Bitcoin one.
  assert.equal(verifyCompactSignature("btc", "1Poj4FaWFGPhMF1ZMfx39k2DhPT7A8tp8P", V.ltc.message, V.ltc.signature), false);
});
