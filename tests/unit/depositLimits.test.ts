import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EVM_NETWORK_IDS, isRouteFeeAccount, isRouteFeeWallet, routeFeeAccount, takesDeposits } from '@/lib/deposit-limits';

const EVM = '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed';

test('a merchant fee on a deposit network is credited to a NEAR account or an EVM address', () => {
  assert.equal(isRouteFeeAccount(EVM), true);
  assert.equal(routeFeeAccount(EVM), EVM.toLowerCase());
  assert.equal(isRouteFeeAccount('shop.near'), true);
  assert.equal(isRouteFeeAccount('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'), false);
  assert.equal(isRouteFeeAccount('GBDHAQXQQ75WVBUZ2IX3O7ME7JOKJUOUPUXRNDCORUJODWQCTVUEQ62R'), false);
});

test('the organization wallets that can take it: NEAR, and EVM ones on any EVM network', () => {
  assert.ok(EVM_NETWORK_IDS.includes('eth') && EVM_NETWORK_IDS.includes('monad') && EVM_NETWORK_IDS.includes('base'));
  assert.ok(!EVM_NETWORK_IDS.includes('sui') && !EVM_NETWORK_IDS.includes('stellar'));
  assert.equal(isRouteFeeWallet('near', 'shop.near'), true);
  assert.equal(isRouteFeeWallet('base', EVM), true);
  assert.equal(isRouteFeeWallet('monad', EVM), true);
  assert.equal(isRouteFeeWallet('tron', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'), false);
  assert.equal(isRouteFeeWallet('sui', '0x' + 'a'.repeat(64)), false);
});

test('a link takes deposits on a deposit network, or on mainnet without a merchant fee', () => {
  assert.equal(takesDeposits('tron', true, true), true);
  assert.equal(takesDeposits('stellar', true, false), true);
  assert.equal(takesDeposits('stellar', false, false), false);
  assert.equal(takesDeposits('solana', true, true), false);
});
