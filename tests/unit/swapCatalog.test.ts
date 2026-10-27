import { test } from 'node:test';
import assert from 'node:assert/strict';
import { amountFits, buildCatalog, canPayWith, estimateOut, receivableFrom, routeFor, sortTokens, tokenMatches, tradesOnNear, type NearAsset } from '@/lib/swap-catalog';
import { bridgedAmount, isEvmAddress } from '@/lib/usdt0';

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

test('what NEAR Intents no longer trades is not offered: no price, or tagged deprecated', () => {
  const extra: NearAsset[] = [
    { chain: 'near', chainName: 'NEAR', symbol: 'TESTNEBULA', assetId: 'tn', decimals: 24, contract: 'nebula.near', priceUsd: null },
    { chain: 'plasma', chainName: 'Plasma', symbol: 'USDT0(DEPRECATED)', assetId: 'pu', decimals: 6, contract: '0xdead', priceUsd: 1 },
    { chain: 'plasma', chainName: 'Plasma', symbol: 'XPL_(DEPRECATED)', assetId: 'px', decimals: 18, contract: null, priceUsd: 0.3 },
    // A Solana listing with no price: still Jupiter's token on mainnet, but no NEAR Intents route.
    { chain: 'solana', chainName: 'Solana', symbol: 'FMS', assetId: 'sf', decimals: 6, contract: 'Fms1111111111111111111111111111111111111111', priceUsd: 0 },
  ];
  assert.equal(tradesOnNear({ symbol: 'USDC', priceUsd: 1 }), true);
  assert.equal(tradesOnNear({ symbol: 'USDT0(DEPRECATED)', priceUsd: 1 }), false);
  assert.equal(tradesOnNear({ symbol: 'ABG', priceUsd: null }), false);
  const live = buildCatalog([...NEAR, ...extra], 'public');
  for (const gone of ['TESTNEBULA', 'USDT0(DEPRECATED)', 'XPL_(DEPRECATED)']) assert.equal(live.some((t) => t.symbol === gone), false, gone);
  const fms = find(live, 'solana', 'FMS');
  assert.equal(fms.dex, true);
  assert.equal(fms.near, null);
  // In the sandbox Solana has no market, so a listing NEAR Intents does not trade reaches nothing.
  assert.equal(buildCatalog([...NEAR, ...extra], 'testnet').some((t) => t.symbol === 'FMS'), false);
});

test('each side offers only what can be swapped: sources pay, a destination is what the source reaches', () => {
  const live = buildCatalog(NEAR, 'public', [{ chain: 'unichain', name: 'Unichain', receives: 'USDT0', eid: 30320 }]);
  const oftOnly = find(live, 'unichain', 'USDT0');
  assert.equal(canPayWith(oftOnly), false, 'reached only through the OFT: a destination, never a source');
  assert.equal(canPayWith(find(live, 'stellar', 'EURC')), true, 'the Stellar DEX takes it');
  // From EURC (no NEAR Intents listing): the Stellar DEX only.
  const fromEurc = receivableFrom(find(live, 'stellar', 'EURC'), live, 'public');
  assert.ok(fromEurc.length > 0);
  assert.ok(fromEurc.every((t) => t.chain === 'stellar' && t.symbol !== 'EURC'));
  // From BTC: every NEAR Intents token but itself, nothing that only a chain market or the OFT reaches.
  const fromBtc = receivableFrom(find(live, 'btc', 'BTC'), live, 'public');
  assert.ok(fromBtc.every((t) => t.near !== null && t.symbol !== 'BTC'));
  assert.ok(!fromBtc.some((t) => t.key === oftOnly.key));
  // From Stellar's USDT0, the OFT destination is reachable.
  assert.ok(receivableFrom(find(live, 'stellar', 'USDT0'), live, 'public').some((t) => t.key === oftOnly.key));
  // Every offered pair has a route.
  for (const from of live.filter(canPayWith)) for (const to of receivableFrom(from, live, 'public')) assert.notEqual(routeFor(from, to, 'public').kind, 'none');
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

test('USDT0 on Stellar reaches the OFT networks: the listed USDT where NEAR Intents has it, its own USDT0 elsewhere', () => {
  const routes = [
    { chain: 'eth', name: 'Ethereum', eid: 30101, receives: 'USDT' as const },
    { chain: 'mantle', name: 'Mantle', eid: 30181, receives: 'USDT0' as const },
  ];
  const near: NearAsset[] = [...NEAR, { chain: 'eth', chainName: 'Ethereum', symbol: 'USDT', assetId: 'et', decimals: 6, contract: '0xdAC17F958D2ee523a2206206994597C13D831ec7', priceUsd: 1 }];
  const cat = buildCatalog(near, 'public', routes);
  const usdt0 = find(cat, 'stellar', 'USDT0');
  const ethUsdt = find(cat, 'eth', 'USDT');
  const mantle = find(cat, 'mantle', 'USDT0');
  assert.equal(ethUsdt.usdt0, true);
  assert.equal(cat.filter((t) => t.chain === 'eth' && t.symbol === 'USDT').length, 1, 'the listing and the OFT destination are one token');
  assert.equal(mantle.chainName, 'Mantle');
  assert.equal(mantle.near, null);
  assert.deepEqual(routeFor(usdt0, ethUsdt, 'public'), { kind: 'usdt0', chain: 'eth' });
  assert.deepEqual(routeFor(usdt0, mantle, 'public'), { kind: 'usdt0', chain: 'mantle' });
  // Only Stellar's USDT0 takes the OFT: XLM to Mantle has no route at all.
  assert.equal(routeFor(find(cat, 'stellar', 'XLM'), mantle, 'public').kind, 'none');
  // The sandbox has no USDT0 (it does not exist on testnet).
  assert.equal(buildCatalog(near, 'testnet', routes).some((t) => t.usdt0), false);
});

test('USDT0 crosses with six decimals: the seventh stays on Stellar', () => {
  assert.equal(bridgedAmount('12.5'), '12.5');
  assert.equal(bridgedAmount('1.0000001'), '1');
  assert.equal(bridgedAmount('0.0000009'), null);
  assert.equal(bridgedAmount('abc'), null);
  assert.equal(isEvmAddress('0x2c7536E3605D9C16a7a3D7b1898e529396a65c23'), true);
  assert.equal(isEvmAddress('GABC'), false);
});
