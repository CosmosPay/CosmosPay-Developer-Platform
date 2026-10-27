import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Account, Keypair, Networks, Operation, TransactionBuilder } from '@stellar/stellar-sdk';
import { KEY_DATA_NAME, XdrSigner, expiryOf, keyTransactionXdr, signatureOn, type SignRequest } from '@/lib/zk/xdr-signer';
import { KeyDerivationError, deriveTransactionRootSk } from '@/lib/zk/derive-key';

/* Private accounts are opened from a signed XDR (any wallet), not a connected one: the fixed key
   transaction's signature is the key root, and every action's transaction comes back signed. */
const TOKEN = 'CBSJZEIO5C7KC2SF3MKSNXXJSW5G3VTNBX4ATMKUI3B2MR4JKM4R26YF';
const NET = Networks.TESTNET;

const signed = (xdr: string, kp: Keypair) => {
  const tx = TransactionBuilder.fromXDR(xdr, NET);
  tx.sign(kp);
  return tx.toXDR();
};
const payment = (from: string, timeout: number) =>
  new TransactionBuilder(new Account(from, '100'), { fee: '100', networkPassphrase: NET })
    .addOperation(Operation.bumpSequence({ bumpTo: '200' }))
    .setTimeout(timeout)
    .build()
    .toXDR();

test('the key transaction is the same bytes every time, and can never apply', () => {
  const kp = Keypair.random();
  const xdr = keyTransactionXdr(TOKEN, kp.publicKey(), NET);
  assert.equal(keyTransactionXdr(TOKEN, kp.publicKey(), NET), xdr);
  const tx = TransactionBuilder.fromXDR(xdr, NET);
  // Sequence 1 is behind every existing account, so the network refuses it whatever happens.
  assert.equal((tx as { sequence: string }).sequence, '1');
  assert.equal(expiryOf(xdr, NET), null);
  const op = (tx as { operations: { type: string; name: string }[] }).operations[0];
  assert.equal(op.type, 'manageData');
  assert.equal(op.name, KEY_DATA_NAME);
});

test('the key transaction binds the token, the account and the network', () => {
  const a = Keypair.random().publicKey();
  const b = Keypair.random().publicKey();
  const xdr = keyTransactionXdr(TOKEN, a, NET);
  assert.notEqual(keyTransactionXdr(TOKEN, b, NET), xdr);
  assert.notEqual(keyTransactionXdr('CBOWOLFSDM5PZXNFIVDMP5NZ7U2GSIHED6H6R446QOHF266XINKUMMF6', a, NET), xdr);
  // The same bytes on another network hash differently, so the signature differs too.
  const kp = Keypair.random();
  const t = keyTransactionXdr(TOKEN, kp.publicKey(), NET);
  assert.notDeepEqual(TransactionBuilder.fromXDR(t, NET).hash(), TransactionBuilder.fromXDR(keyTransactionXdr(TOKEN, kp.publicKey(), Networks.PUBLIC), Networks.PUBLIC).hash());
});

test('a signed XDR counts only as this transaction, signed by the account', () => {
  const kp = Keypair.random();
  const xdr = payment(kp.publicKey(), 180);
  const ok = signatureOn(xdr, signed(xdr, kp), kp.publicKey(), NET);
  assert.equal(ok.ok, true);
  assert.deepEqual(signatureOn(xdr, signed(xdr, Keypair.random()), kp.publicKey(), NET), { ok: false, problem: 'notSigned' });
  assert.deepEqual(signatureOn(xdr, signed(payment(kp.publicKey(), 60), kp), kp.publicKey(), NET), { ok: false, problem: 'otherTransaction' });
  assert.deepEqual(signatureOn(xdr, 'not an envelope', kp.publicKey(), NET), { ok: false, problem: 'invalid' });
  assert.deepEqual(signatureOn(xdr, xdr, kp.publicKey(), NET), { ok: false, problem: 'notSigned' });
});

test('a transaction that expires says when', () => {
  const kp = Keypair.random();
  const before = Date.now();
  const at = expiryOf(payment(kp.publicKey(), 180), NET);
  assert.ok(at !== null && at >= before + 170_000 && at <= before + 190_000);
});

test('the transaction root: two equal signatures for a new account, one for an existing one, the same key every time', async () => {
  const kp = Keypair.random();
  const purposes: string[] = [];
  const signer = { publicKey: kp.publicKey(), sign: async (x: string) => signed(x, kp), prepare: (p: string) => purposes.push(p) };
  const first = await deriveTransactionRootSk(signer, TOKEN, NET, true);
  assert.deepEqual(purposes, ['key', 'keyAgain']);
  const again = await deriveTransactionRootSk(signer, TOKEN, NET, false);
  assert.equal(again, first);
  assert.deepEqual(purposes, ['key', 'keyAgain', 'key']);
  const other = Keypair.random();
  const otherSk = await deriveTransactionRootSk({ publicKey: other.publicKey(), sign: async (x: string) => signed(x, other) }, TOKEN, NET, false);
  assert.notEqual(otherSk, first);
});

test('a signature of another account derives nothing', async () => {
  const kp = Keypair.random();
  const signer = { publicKey: kp.publicKey(), sign: async (x: string) => signed(x, Keypair.random()) };
  await assert.rejects(deriveTransactionRootSk(signer, TOKEN, NET, false), KeyDerivationError);
});

test('XdrSigner asks the page for each signature with its purpose, and returns it only when it is this transaction signed', async () => {
  const kp = Keypair.random();
  const seen: SignRequest[] = [];
  let answer = (r: SignRequest) => signed(r.xdr, kp);
  const signer = new XdrSigner(kp.publicKey(), NET, async (r) => { seen.push(r); return answer(r); });
  signer.prepare('deposit');
  const xdr = payment(kp.publicKey(), 180);
  const out = await signer.sign(xdr);
  assert.equal(signatureOn(xdr, out, kp.publicKey(), NET).ok, true);
  assert.equal(seen[0].purpose, 'deposit');
  assert.equal(seen[0].account, kp.publicKey());
  assert.ok(seen[0].expiresAt !== null);
  answer = (r) => signed(r.xdr, Keypair.random());
  await assert.rejects(signer.sign(xdr), /notSigned/);
});
