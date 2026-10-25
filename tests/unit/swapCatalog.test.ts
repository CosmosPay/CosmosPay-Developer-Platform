import { test } from 'node:test';
import assert from 'node:assert/strict';
import { amountFits, buildCatalog, estimateOut, routeFor, sortTokens, tokenMatches, type NearAsset } from '@/lib/swap-catalog';

const CIRCLE_MAINNET = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
const CIRCLE_TESTNET = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
const SOL_USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const NEAR: NearAsset[] = [
  { chain: 'stellar', chainName: 'Stellar', symbol: 'XLM', assetId: 'x', decimals: 7, contract: null, priceUsd: 0.17 },
  { chain: 'stellar', chainName: 'Stellar', symbol: 'USDC', assetId: 'xu', decimals: 7, contract: CIRCLE_MAINNET, priceUsd: 1 },
  { chain: 'solana', chainName: 'Solana', symbol: 'SOL', assetId: 's', decimals: 9, contract: null, priceUsd: 100 },
  { chain: 'solana', chainName: 'Solana', symbol: 'USDC', assetId: 'su', decimals: 6, contract: SOL_USDC, priceUsd: 1 },
  { chain: 'solana', chainName: 'Solana', symbol: 'BOME', assetId: 'sb', decimals: 6, contract: 'ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82', priceUsd: 0.001 },
  { chain: 'eth', chainName: 'Ethereum', symbol: 'ETH', assetId: 'e', decimals: 18, contract: null, priceUsd: 3000 },
  { chain: 'eth', chainName: 'Ethereum', symbol: 'USDC', assetId: 'eu', decimals: 6, contract: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', priceUsd: 1 },
  { chain: 'btc', chainName: 'Bitcoin', symbol: 'BTC', assetId: 'b', decimals: 8, contract: null, priceUsd: 60000 },
];
const find = (list: ReturnType<typeof buildCatalog>, chain: string, symbol: string) => {
  const t = list.find((x) => x.chain === chain && x.symbol === symbol);
  assert.ok(t, `${chain} ${symbol}`);
  return t;
};

test('mainnet: Stellar standard assets map to NEAR Intents by issuer, and every network is listed', () => {
  const cat = buildCatalog(NEAR, 'public');
  assert.equal(find(cat, 'stellar', 'USDC').near, `USDC:${CIRCLE_MAINNET}`);
  assert.equal(find(cat, 'stellar', 'XLM').near, 'XLM');
  assert.equal(find(cat, 'solana', 'USDC').dex, true);
  assert.equal(find(cat, 'solana', 'BOME').dex, true);
  assert.equal(find(cat, 'eth', 'ETH').dex, false);
  assert.equal(find(cat, 'btc', 'BTC').near, 'BTC');
  assert.equal(cat.filter((t) => t.chain === 'solana' && t.symbol === 'USDC').length, 1, 'the preset and the listing are one token');
});

test('sandbox: Stellar trades its testnet assets and reaches NEAR Intents by symbol; Solana has no market', () => {
  const cat = buildCatalog(NEAR, 'testnet');
  const usdc = find(cat, 'stellar', 'USDC');
  assert.equal(usdc.contract, CIRCLE_TESTNET);
  assert.equal(usdc.near, 'USDC');
  assert.equal(usdc.dex, true);
  assert.equal(cat.filter((t) => t.chain === 'stellar' && t.contract === CIRCLE_MAINNET).length, 0);
  assert.equal(find(cat, 'solana', 'SOL').dex, false);
});

test('routes: the chain market within Stellar, Solana or Monad; NEAR Intents between chains', () => {
  const live = buildCatalog(NEAR, 'public');
  const test_ = buildCatalog(NEAR, 'testnet');
  assert.deepEqual(routeFor(find(live, 'stellar', 'XLM'), find(live, 'stellar', 'USDC'), 'public'), { kind: 'dex', chain: 'stellar' });
  assert.deepEqual(routeFor(find(test_, 'stellar', 'XLM'), find(test_, 'stellar', 'USDC'), 'testnet'), { kind: 'dex', chain: 'stellar' });
  assert.deepEqual(routeFor(find(live, 'stellar', 'XLM'), find(live, 'solana', 'SOL'), 'public'), { kind: 'near' });
  assert.deepEqual(routeFor(find(live, 'eth', 'ETH'), find(live, 'eth', 'USDC'), 'public'), { kind: 'near' }, 'within a chain with no market of ours');
  assert.deepEqual(routeFor(find(test_, 'solana', 'SOL'), find(test_, 'solana', 'USDC'), 'testnet'), { kind: 'none', reason: 'production-only' });
  assert.deepEqual(routeFor(find(live, 'eth', 'ETH'), find(live, 'eth', 'ETH'), 'public'), { kind: 'none', reason: 'same-token' });
});

test('a token NEAR Intents does not list has no route to another chain', () => {
  const cat = buildCatalog(NEAR, 'public');
  const eurc = find(cat, 'stellar', 'EURC');
  assert.equal(eurc.near, null);
  assert.deepEqual(routeFor(eurc, find(cat, 'eth', 'ETH'), 'public'), { kind: 'none', reason: 'unsupported' });
});

test('estimateOut uses the listed prices, and needs both', () => {
  const cat = buildCatalog(NEAR, 'public');
  assert.equal(estimateOut('2', find(cat, 'solana', 'SOL'), find(cat, 'eth', 'USDC')), 200);
  assert.equal(estimateOut('2', find(cat, 'stellar', 'EURC'), find(cat, 'eth', 'USDC')), null);
  assert.equal(estimateOut('0', find(cat, 'solana', 'SOL'), find(cat, 'eth', 'USDC')), null);
});

test('amountFits keeps an amount within the token decimals', () => {
  const cat = buildCatalog(NEAR, 'public');
  assert.equal(amountFits('1.1234567', find(cat, 'stellar', 'XLM')), true);
  assert.equal(amountFits('1.12345678', find(cat, 'stellar', 'XLM')), false);
  assert.equal(amountFits('0', find(cat, 'btc', 'BTC')), false);
  assert.equal(amountFits('abc', find(cat, 'btc', 'BTC')), false);
});

test('search and order: every word matches, coins and big stablecoins first', () => {
  const cat = buildCatalog(NEAR, 'public');
  assert.equal(cat.filter((t) => tokenMatches(t, 'usdc eth')).length, 1);
  assert.equal(cat.filter((t) => tokenMatches(t, 'bitcoin')).length, 1);
  const sorted = sortTokens(cat);
  assert.equal(sorted[0].contract, null);
  assert.ok(sorted.findIndex((t) => t.symbol === 'USDC') < sorted.findIndex((t) => t.symbol === 'BOME'));
});
