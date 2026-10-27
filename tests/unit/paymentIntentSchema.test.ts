import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPaymentIntentBodySchema } from '@/schemas/payment-intents';

const STELLAR = 'GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ';
const SOLANA = 'So11111111111111111111111111111111111111112';
const SOLANA_USDC = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';
const MONAD = '0x754704bc059f8c67012fed69bc8a327a5aafb603';
const base = { org: 'org_1', environment: 'dev' };

const issues = (body: object) => {
  const r = createPaymentIntentBodySchema.safeParse({ ...base, ...body });
  return r.success ? [] : r.error.issues.map((i) => i.path.join('.'));
};

test('a Stellar link still needs nothing but a destination, and defaults to Stellar', () => {
  const r = createPaymentIntentBodySchema.safeParse({ ...base, destination: STELLAR });
  assert.equal(r.success, true);
  assert.equal(r.success && r.data.chain, 'stellar');
});

test('the destination must be an address of the chosen chain', () => {
  assert.deepEqual(issues({ chain: 'solana', destination: STELLAR }), ['destination']);
  assert.deepEqual(issues({ chain: 'solana', destination: SOLANA }), []);
  assert.deepEqual(issues({ chain: 'monad', destination: SOLANA, amount: '1' }), ['destination']);
});

test('a Solana token is its ticker plus its mint', () => {
  assert.deepEqual(issues({ chain: 'solana', destination: SOLANA, assetCode: 'USDC', assetIssuer: SOLANA_USDC }), []);
  assert.deepEqual(issues({ chain: 'solana', destination: SOLANA, assetCode: 'USDC' }), ['assetIssuer']);
  assert.deepEqual(issues({ chain: 'solana', destination: SOLANA, assetIssuer: SOLANA_USDC }), ['assetCode']);
  assert.deepEqual(issues({ chain: 'solana', destination: SOLANA, assetCode: 'SOL' }), []);
});

test('Monad needs an amount and takes no wallet message', () => {
  assert.deepEqual(issues({ chain: 'monad', destination: MONAD }), ['amount']);
  assert.deepEqual(issues({ chain: 'monad', destination: MONAD, amount: '1.5', msg: 'hi' }), ['msg']);
  assert.deepEqual(issues({ chain: 'monad', destination: MONAD, amount: '1.000000000000000001' }), []);
});

test('transaction intents and callbacks stay on Stellar', () => {
  assert.deepEqual(issues({ chain: 'solana', kind: 'tx', destination: SOLANA, source: SOLANA, amount: '1' }).sort(), ['kind', 'source']);
  assert.deepEqual(issues({ chain: 'solana', destination: SOLANA, callback: 'url:https://x.test' }), ['callback']);
  assert.deepEqual(issues({ kind: 'tx', destination: STELLAR, source: STELLAR, amount: '2' }), []);
  assert.deepEqual(issues({ kind: 'tx', destination: STELLAR }).sort(), ['amount', 'source']);
});

test('Stellar keeps seven decimals and an issuer for a non-native asset', () => {
  assert.deepEqual(issues({ destination: STELLAR, amount: '1.12345678' }), ['amount']);
  assert.deepEqual(issues({ destination: STELLAR, assetCode: 'USDC' }), ['assetIssuer']);
  assert.deepEqual(issues({ destination: STELLAR, assetCode: 'XLM' }), []);
});
