import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CHAINS,
  DEX_CHAINS,
  EVM_CHAIN_IDS,
  EVM_CHAIN_PARAMS,
  EVM_CHAINS,
  NETWORK_COUNTS,
  PAYMENT_NETWORK_IDS,
  TOKEN_PRESETS,
  assetLabel,
  explorerAccountUrl,
  explorerTxUrl,
  isAddress,
  isChain,
  isDepositNetwork,
  isDexChain,
  isEvmChain,
  isNetwork,
  isSwapNetwork,
  isNetworkAddress,
  NETWORK_ADDRESS_RULES,
  NETWORK_IDS,
  NETWORK_NATIVE_CODES,
  NETWORKS_BY_NAME,
  networkName,
  offersNativeCoin,
  sameNetworkAddress,
  tierOf,
  withNetworkCounts,
} from '@/lib/chains';

const STELLAR = 'GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ';
const SOLANA = 'So11111111111111111111111111111111111111112';
const MONAD = '0x754704bc059f8c67012fed69bc8a327a5aafb603';

test('isChain accepts the four chains only', () => {
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
  assert.equal(isAddress('arc', MONAD), true);
  assert.equal(isAddress('arc', SOLANA), false);
  assert.equal(isAddress('solana', ` ${SOLANA} `), true);
});

test('every token preset has an issuer of its own chain', () => {
  for (const [chain, tiers] of Object.entries(TOKEN_PRESETS)) {
    for (const presets of Object.values(tiers)) {
      for (const p of presets) assert.equal(isAddress(chain as 'solana' | 'monad' | 'arc', p.issuer), true, `${chain} ${p.code}`);
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

test('every network has an address rule, a coin and a name, and the four chains are networks too', () => {
  assert.equal(NETWORK_IDS.length, 35);
  assert.equal(PAYMENT_NETWORK_IDS.length, 36);
  for (const id of PAYMENT_NETWORK_IDS) {
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
  assert.equal(NETWORKS_BY_NAME.length, PAYMENT_NETWORK_IDS.length);
  assert.ok(NETWORKS_BY_NAME.includes('arc'));
});

/* Arc is a chain a payment settles on natively, beside Stellar, Solana and Monad, and no swap
   reaches it: it is out of the swap platform's networks, its markets and its deposit routes. */
test('Arc is a native payment chain that no swap reaches', () => {
  assert.equal(isChain('arc'), true);
  assert.equal(isNetwork('arc'), true);
  assert.equal(isSwapNetwork('arc'), false);
  assert.equal(isDepositNetwork('arc'), false);
  assert.equal(isDexChain('arc'), false);
  assert.deepEqual([...DEX_CHAINS], ['stellar', 'solana', 'monad']);
  assert.ok(!(NETWORK_IDS as readonly string[]).includes('arc'));
  assert.equal(networkName('arc'), 'Arc');
  assert.equal(NETWORK_NATIVE_CODES.arc, 'USDC');
  assert.equal(offersNativeCoin('arc'), false);
  assert.equal(offersNativeCoin('monad'), true);
  for (const c of ['monad', 'arc']) assert.equal(isEvmChain(c), true);
  assert.deepEqual([...EVM_CHAINS], ['monad', 'arc']);
  assert.equal(sameNetworkAddress('arc', MONAD, MONAD.toUpperCase().replace('0X', '0x')), true);
});

test('Arc: its chain ids, presets, explorers and wallet parameters per tier', () => {
  assert.deepEqual(EVM_CHAIN_IDS.arc, { public: 5042, testnet: 5042002 });
  assert.deepEqual(TOKEN_PRESETS.arc.public.map((p) => [p.code, p.issuer, p.decimals]), [
    ['USDC', '0x3600000000000000000000000000000000000000', 6],
    ['EURC', '0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1', 6],
  ]);
  assert.deepEqual(TOKEN_PRESETS.arc.testnet.map((p) => [p.code, p.issuer, p.decimals]), [
    ['USDC', '0x3600000000000000000000000000000000000000', 6],
    ['EURC', '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a', 6],
  ]);
  const hash = `0x${'e'.repeat(64)}`;
  assert.equal(explorerTxUrl('arc', 'public', hash), `https://explorer.arc.io/tx/${hash}`);
  assert.equal(explorerTxUrl('arc', 'testnet', hash), `https://explorer.testnet.arc.io/tx/${hash}`);
  assert.equal(explorerAccountUrl('arc', 'testnet', MONAD), `https://explorer.testnet.arc.io/address/${MONAD}`);
  assert.equal(explorerTxUrl('arc', 'public', 'e'.repeat(64)), null);
  for (const tier of ['public', 'testnet'] as const) {
    const p = EVM_CHAIN_PARAMS.arc[tier];
    assert.equal(p.chainId, EVM_CHAIN_IDS.arc[tier]);
    assert.deepEqual(p.nativeCurrency, { name: 'USDC', symbol: 'USDC', decimals: 18 });
    assert.ok(p.rpcUrls.every((u) => u.startsWith('https://')) && p.blockExplorerUrls.every((u) => u.startsWith('https://')));
  }
  assert.equal(EVM_CHAIN_PARAMS.arc.public.chainName, 'Arc');
  assert.equal(EVM_CHAIN_PARAMS.arc.testnet.chainName, 'Arc Testnet');
  assert.deepEqual(EVM_CHAIN_PARAMS.arc.public.rpcUrls, ['https://rpc.mainnet.arc.io']);
  assert.deepEqual(EVM_CHAIN_PARAMS.arc.testnet.rpcUrls, ['https://rpc.testnet.arc.io']);
  assert.equal(EVM_CHAIN_PARAMS.monad.public.chainId, EVM_CHAIN_IDS.monad.public);
});

test('copy counts the networks Cosmos Pay works with as {n} and the ones its swaps reach as {swapN}', () => {
  assert.deepEqual(NETWORK_COUNTS, { n: 36, swapN: 35 });
  assert.equal(withNetworkCounts('on {n} networks, swaps across {swapN}, {n} again'), 'on 36 networks, swaps across 35, 36 again');
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
