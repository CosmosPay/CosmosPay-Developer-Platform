import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CHAINS,
  TOKEN_PRESETS,
  assetLabel,
  explorerAccountUrl,
  explorerTxUrl,
  isAddress,
  isChain,
  isDepositNetwork,
  isNetwork,
  isNetworkAddress,
  NETWORK_ADDRESS_RULES,
  NETWORK_IDS,
  NETWORK_NATIVE_CODES,
  NETWORKS_BY_NAME,
  networkName,
  sameNetworkAddress,
  tierOf,
} from '@/lib/chains';

const STELLAR = 'GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ';
const SOLANA = 'So11111111111111111111111111111111111111112';
const MONAD = '0x754704bc059f8c67012fed69bc8a327a5aafb603';

test('isChain accepts the three chains only', () => {
  for (const c of CHAINS) assert.equal(isChain(c), true);
  assert.equal(isChain('ethereum'), false);
  assert.equal(isChain(undefined), false);
});

test('tierOf reads every chain name for mainnet as public', () => {
  assert.equal(tierOf('public'), 'public');
  assert.equal(tierOf('mainnet'), 'public');
  assert.equal(tierOf('mainnet-beta'), 'public');
  assert.equal(tierOf('testnet'), 'testnet');
  assert.equal(tierOf('devnet'), 'testnet');
  assert.equal(tierOf(null), 'testnet');
});

test('isAddress checks each chain by its own shape', () => {
  assert.equal(isAddress('stellar', STELLAR), true);
  assert.equal(isAddress('stellar', SOLANA), false);
  assert.equal(isAddress('solana', SOLANA), true);
  assert.equal(isAddress('solana', MONAD), false);
  assert.equal(isAddress('monad', MONAD), true);
  assert.equal(isAddress('monad', STELLAR), false);
  assert.equal(isAddress('solana', ` ${SOLANA} `), true);
});

test('every token preset has an issuer of its own chain', () => {
  for (const [chain, tiers] of Object.entries(TOKEN_PRESETS)) {
    for (const presets of Object.values(tiers)) {
      for (const p of presets) assert.equal(isAddress(chain as 'solana' | 'monad', p.issuer), true, `${chain} ${p.code}`);
    }
  }
});

test('explorerTxUrl follows the chain and the network', () => {
  const stellarHash = 'a'.repeat(64);
  assert.equal(explorerTxUrl('stellar', 'testnet', stellarHash), `https://stellar.expert/explorer/testnet/tx/${stellarHash}`);
  assert.equal(explorerTxUrl('solana', 'testnet', SOLANA + 'abc'), `https://explorer.solana.com/tx/${SOLANA}abc?cluster=devnet`);
  assert.equal(explorerTxUrl('monad', 'public', `0x${'b'.repeat(64)}`), `https://monadscan.com/tx/0x${'b'.repeat(64)}`);
});

test('explorerTxUrl refuses a hash outside the chain alphabet', () => {
  assert.equal(explorerTxUrl('stellar', 'public', 'nothex/../x'), null);
  assert.equal(explorerTxUrl('monad', 'public', 'a'.repeat(64)), null);
  assert.equal(explorerTxUrl('solana', 'public', null), null);
});

test('explorerAccountUrl links valid addresses only', () => {
  assert.equal(explorerAccountUrl('stellar', 'public', STELLAR), `https://stellar.expert/explorer/public/account/${STELLAR}`);
  assert.equal(explorerAccountUrl('monad', 'testnet', MONAD), `https://testnet.monadexplorer.com/address/${MONAD}`);
  assert.equal(explorerAccountUrl('solana', 'public', 'not an address'), null);
});

test('assetLabel names the native coin, a code, or a shortened token', () => {
  assert.equal(assetLabel('solana', 'native'), 'SOL');
  assert.equal(assetLabel('monad', null), 'MON');
  assert.equal(assetLabel('stellar', `USDC:${STELLAR}`), 'USDC');
  assert.equal(assetLabel('solana', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'), 'EPjF…Dt1v');
});

test('every network has an address rule, a coin and a name, and the three chains are networks too', () => {
  assert.equal(NETWORK_IDS.length, 35);
  for (const id of NETWORK_IDS) {
    assert.ok(NETWORK_ADDRESS_RULES[id], id);
    assert.ok(NETWORK_NATIVE_CODES[id], id);
    assert.ok(networkName(id), id);
  }
  for (const c of CHAINS) {
    assert.equal(isNetwork(c), true);
    assert.equal(isDepositNetwork(c), false);
  }
  assert.equal(isDepositNetwork('tron'), true);
  assert.equal(isNetwork('toString'), false);
});

test('a picker lists the networks by name, so none comes first for being one of ours', () => {
  const names = NETWORKS_BY_NAME.map((id) => networkName(id));
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b, 'en')));
  assert.equal(NETWORKS_BY_NAME.length, NETWORK_IDS.length);
});

test('each network checks its own address shape, as the Payments API does', () => {
  const ok: Record<string, string> = {
    eth: '0x2527D02599Ba641c19FEa793cD0F167589a0f10D',
    btc: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
    tron: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
    xrp: 'rEb8TK3gBgk5auZkwc6sHnwrGVJH8DuaLh',
    near: 'alice.near',
    sui: `0x${'a'.repeat(64)}`,
    cardano: `addr1${'q'.repeat(98)}`,
    ton: `0:${'a'.repeat(64)}`,
    doge: 'DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L',
  };
  for (const [network, address] of Object.entries(ok)) assert.equal(isNetworkAddress(network, address), true, network);
  assert.equal(isNetworkAddress('btc', 'BC1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq'), false, 'mixed-case bech32');
  assert.equal(isNetworkAddress('tron', ok.eth), false);
  assert.equal(isNetworkAddress('eth', ok.tron), false);
  assert.equal(isNetworkAddress('nope', ok.eth), false);
  assert.equal(sameNetworkAddress('base', ok.eth, ok.eth.toLowerCase()), true);
  assert.equal(sameNetworkAddress('tron', ok.tron, ok.tron.toLowerCase()), false);
});

test('a network reached on mainnet only has explorers there, and none in the sandbox', () => {
  const evm = '0x2527D02599Ba641c19FEa793cD0F167589a0f10D';
  const hash = `0x${'c'.repeat(64)}`;
  assert.equal(explorerTxUrl('base', 'public', hash), `https://basescan.org/tx/${hash}`);
  assert.equal(explorerTxUrl('base', 'testnet', hash), null);
  assert.equal(explorerAccountUrl('arb', 'public', evm), `https://arbiscan.io/address/${evm}`);
  assert.equal(explorerTxUrl('btc', 'public', 'd'.repeat(64)), `https://blockchair.com/bitcoin/transaction/${'d'.repeat(64)}`);
  assert.equal(explorerTxUrl('tron', 'public', 'nothex/../x'), null);
  assert.equal(explorerTxUrl('hood', 'public', hash), null);
  assert.equal(assetLabel('tron', 'native'), 'TRX');
});
