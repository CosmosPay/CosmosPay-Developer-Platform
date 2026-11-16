import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPaymentIntentBodySchema } from '@/schemas/payment-intents';

const STELLAR = 'GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ';
const FEE_WALLET = 'GBDHAQXQQ75WVBUZ2IX3O7ME7JOKJUOUPUXRNDCORUJODWQCTVUEQ62R';
const USDC_ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
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

test('a link with a merchant fee is checked, not thrown on', () => {
  const link = { destination: STELLAR, amount: '10', assetCode: 'USDC', assetIssuer: USDC_ISSUER };
  const fee = { bps: 150, fixed: '0.2', wallet: FEE_WALLET, paidBy: 'payer' };
  assert.deepEqual(issues({ ...link, merchantFee: fee }), []);
  assert.deepEqual(issues({ ...link, merchantFee: { ...fee, fixed: '0.12345678' } }), ['merchantFee']);
  assert.deepEqual(issues({ ...link, merchantFee: { ...fee, wallet: STELLAR } }), ['merchantFee']);
  assert.deepEqual(issues({ ...link, amount: undefined, merchantFee: fee }), ['merchantFee']);
});

const BASE = '0x2527D02599Ba641c19FEa793cD0F167589a0f10D';
const TRON = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const BTC = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';
const prod = { environment: 'prod' };

test('every other network is a payment link on mainnet, with an amount', () => {
  assert.deepEqual(issues({ ...prod, chain: 'base', destination: BASE, amount: '25', assetCode: 'USDC', assetIssuer: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913' }), []);
  assert.deepEqual(issues({ ...prod, chain: 'tron', destination: TRON, amount: '10', assetCode: 'USDT' }), []);
  assert.deepEqual(issues({ ...prod, chain: 'btc', destination: BTC, amount: '0.001' }), []);
  assert.deepEqual(issues({ chain: 'base', destination: BASE, amount: '25' }), ['environment']);
  assert.deepEqual(issues({ ...prod, chain: 'tron', destination: TRON }), ['amount']);
});

test('each network checks its own address shape', () => {
  assert.deepEqual(issues({ ...prod, chain: 'tron', destination: BASE, amount: '1' }), ['destination']);
  assert.deepEqual(issues({ ...prod, chain: 'btc', destination: TRON, amount: '1' }), ['destination']);
  assert.deepEqual(issues({ ...prod, chain: 'eth', destination: BASE.toLowerCase(), amount: '1' }), []);
  assert.deepEqual(issues({ ...prod, chain: 'nope', destination: BASE, amount: '1' }), ['chain']);
});

test('a link on another network takes a message, but no fee, callback, source or transaction', () => {
  const link = { ...prod, chain: 'base', destination: BASE, amount: '25' };
  assert.deepEqual(issues({ ...link, msg: 'Order 24' }), []);
  assert.deepEqual(issues({ ...link, merchantFee: { bps: 100, wallet: BASE, paidBy: 'payer' } }), ['merchantFee']);
  assert.deepEqual(issues({ ...link, callback: 'url:https://x.test' }), ['callback']);
  assert.deepEqual(issues({ ...link, kind: 'tx', source: BASE }).sort(), ['kind', 'source']);
  assert.deepEqual(issues({ ...link, assetIssuer: 'has space' }), ['assetIssuer']);
});
