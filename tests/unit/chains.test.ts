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
