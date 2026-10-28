import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Keypair, Networks, TransactionBuilder } from '@stellar/stellar-sdk';
import { SUB_ACCOUNT_STARTING_BALANCE, SUB_ACCOUNT_TIMEOUT_SECONDS, subAccountTransaction } from '@/lib/zk/sub-accounts';
import { XdrSigner, keyTransactionXdr, signatureOn, type SignRequest } from '@/lib/zk/xdr-signer';
import { deriveTransactionRootSk } from '@/lib/zk/derive-key';

/* More than one private account per address: each further one is a sub-account, a Stellar account
   the address creates and funds and whose only signer is the address. */
const TOKEN = 'CBSJZEIO5C7KC2SF3MKSNXXJSW5G3VTNBX4ATMKUI3B2MR4JKM4R26YF';
const NET = Networks.TESTNET;

const signed = (xdr: string, kp: Keypair) => {
  const tx = TransactionBuilder.fromXDR(xdr, NET);
  tx.sign(kp);
  return tx.toXDR();
};

test('the sub-account transaction funds it from the base and leaves the base its only signer', () => {
  const base = Keypair.random().publicKey();
  const sub = Keypair.random().publicKey();
  const tx = TransactionBuilder.fromXDR(subAccountTransaction(base, '41', sub, NET), NET) as unknown as {
    source: string; sequence: string; timeBounds?: { maxTime: string };
    operations: { type: string; source?: string; destination?: string; startingBalance?: string; masterWeight?: number; signer?: { ed25519PublicKey: string; weight: number }; lowThreshold?: number; medThreshold?: number; highThreshold?: number }[];
  };
  assert.equal(tx.source, base);
  assert.equal(tx.sequence, '42');
  assert.ok(Number(tx.timeBounds?.maxTime) > 0 && Number(tx.timeBounds?.maxTime) <= Math.floor(Date.now() / 1000) + SUB_ACCOUNT_TIMEOUT_SECONDS + 5);
  const [create, options] = tx.operations;
  assert.equal(create.type, 'createAccount');
  assert.equal(create.destination, sub);
  assert.equal(Number(create.startingBalance), Number(SUB_ACCOUNT_STARTING_BALANCE));
  assert.equal(options.type, 'setOptions');
  assert.equal(options.source, sub);
  assert.equal(options.masterWeight, 0);
  assert.deepEqual(options.signer, { ed25519PublicKey: base, weight: 1 });
  assert.deepEqual([options.lowThreshold, options.medThreshold, options.highThreshold], [1, 1, 1]);
});

test("a sub-account's key comes from the base's signature of the sub-account's key transaction", async () => {
  const base = Keypair.random();
  const sub = Keypair.random().publicKey();
  const asked: SignRequest[] = [];
  const signer = new XdrSigner(sub, NET, async (r) => { asked.push(r); return signed(r.xdr, base); }, base.publicKey());
  const sk = await deriveTransactionRootSk(signer, TOKEN, NET);
  // The request names the base as the one who signs, for the sub-account's own key transaction.
  assert.equal(asked[0].account, base.publicKey());
  assert.equal(asked[0].xdr, keyTransactionXdr(TOKEN, sub, NET));
  // The same signature, the same key, every time.
  assert.equal(await deriveTransactionRootSk(signer, TOKEN, NET), sk);
  // Not the base's own key, which comes from its own key transaction.
  const own = new XdrSigner(base.publicKey(), NET, async (r) => signed(r.xdr, base));
  assert.notEqual(await deriveTransactionRootSk(own, TOKEN, NET), sk);
});

test("a sub-account's transactions must be signed by its base, not by anyone else", async () => {
  const base = Keypair.random();
  const sub = Keypair.random().publicKey();
  const xdr = keyTransactionXdr(TOKEN, sub, NET);
  assert.equal(signatureOn(xdr, signed(xdr, base), base.publicKey(), NET).ok, true);
  const stranger = new XdrSigner(sub, NET, async (r) => signed(r.xdr, Keypair.random()), base.publicKey());
  await assert.rejects(() => stranger.sign(xdr), /refused/);
});

test('an account whose own key weighs nothing is the sub-account of its one signer', async () => {
  const { controllerOfEntry } = await import('@/lib/zk/sub-accounts');
  const base = Keypair.random();
  // The shape stellar-sdk 17 gives an account's ledger entry (fields as properties, bytes in `value`).
  const entry = (master: number, signers: { raw: Uint8Array; weight: number }[]) => ({
    thresholds: { value: new Uint8Array([master, 1, 1, 1]) },
    signers: signers.map((s) => ({ key: { type: 'signerKeyTypeEd25519', ed25519: { value: s.raw } }, weight: s.weight })),
  });
  assert.equal(controllerOfEntry(entry(0, [{ raw: base.rawPublicKey(), weight: 1 }])), base.publicKey());
  // Its own key still signs, or no single signer: an account of its own.
  assert.equal(controllerOfEntry(entry(1, [{ raw: base.rawPublicKey(), weight: 1 }])), null);
  assert.equal(controllerOfEntry(entry(0, [{ raw: base.rawPublicKey(), weight: 1 }, { raw: Keypair.random().rawPublicKey(), weight: 1 }])), null);
  assert.equal(controllerOfEntry(entry(0, [{ raw: base.rawPublicKey(), weight: 0 }])), null);
  assert.equal(controllerOfEntry(null), null);
});
