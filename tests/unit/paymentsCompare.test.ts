import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BITPAY, COMPARE_CHECKED, ESCROW_COM, METAMASK, RAILGUN, compareRows, compareSources, formatRate, parseRate } from '@/lib/payments/compare';
import { ESCROW_FEE_PCT, PLAN_IDS, PLAN_SPECS, PRIVATE_PAYMENT_FEE_PCT, planSwapFeeBps } from '@/lib/plans';
import { LANDING } from '@/lib/payments/landing-i18n';
import { LOCALES } from '@/lib/payments/i18n';

/* CLAUDE.md, "Plans": every Cosmos Pay rate is 75% of the competition's, rounded down. */
const RULE = 0.75;
const atMost = (ours: number, theirs: number) => ours <= theirs * RULE + 1e-9;

test('rates read and print the way the providers and plans.ts write them', () => {
  assert.deepEqual(parseRate('1.5% + 18¢'), { pct: 1.5, cents: 18 });
  assert.deepEqual(parseRate('0.875%'), { pct: 0.875 });
  assert.equal(parseRate('Custom'), null);
  assert.equal(formatRate({ pct: 2, cents: 25 }), '2% + 25¢');
  assert.equal(formatRate({ pct: 0.25 }), '0.25%');
  for (const id of PLAN_IDS) {
    const rate = parseRate(PLAN_SPECS[id].perTx);
    if (rate) assert.equal(formatRate(rate), PLAN_SPECS[id].perTx, id);
  }
});

test('each Cosmos Pay rate is at most 75% of the published rate it sits next to', () => {
  const rows = compareRows();
  assert.deepEqual([...new Set(rows.map((r) => r.service))], ['payments', 'swaps', 'private', 'escrow']);
  for (const row of rows) {
    assert.ok(atMost(row.ours.pct, row.theirs.pct), `${row.service} ${row.plan ?? ''}: ${row.ours.pct}% vs ${row.theirs.pct}%`);
    if (row.theirs.cents !== undefined) assert.ok(row.ours.cents !== undefined && atMost(row.ours.cents, row.theirs.cents), `${row.plan} cents`);
  }
  // Every offered plan's swap commission, not only the highest one the row shows.
  for (const id of PLAN_IDS) assert.ok(atMost(planSwapFeeBps(id) / 100, METAMASK.rate.pct), `${id} swap`);
});

test('the rows read Cosmos Pay’s rates from plans.ts', () => {
  const rows = compareRows();
  const payments = rows.filter((r) => r.service === 'payments');
  assert.deepEqual(payments.map((r) => r.plan), ['starter', 'essentials', 'growth']);
  for (const r of payments) assert.equal(formatRate(r.ours), PLAN_SPECS[r.plan!].perTx);
  assert.deepEqual(payments.map((r) => r.theirs), BITPAY.tiers.map((t) => t.rate));
  assert.equal(payments[0].monthly, undefined, 'Starter has no monthly fee');
  assert.equal(`$${payments[1].monthly}/mo`, PLAN_SPECS.essentials.price);
  assert.equal(rows.find((r) => r.service === 'swaps')?.ours.pct, Math.max(...PLAN_IDS.map((id) => planSwapFeeBps(id) / 100)));
  assert.equal(rows.find((r) => r.service === 'private')?.ours.pct, PRIVATE_PAYMENT_FEE_PCT);
  assert.equal(rows.find((r) => r.service === 'escrow')?.ours.pct, ESCROW_FEE_PCT);
});

test('every published rate names its provider’s own pricing page and the day it was read', () => {
  assert.match(COMPARE_CHECKED, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(!Number.isNaN(Date.parse(`${COMPARE_CHECKED}T00:00:00Z`)));
  const hosts = { BitPay: 'www.bitpay.com', MetaMask: 'support.metamask.io', RAILGUN: 'docs.railgun.org', 'Escrow.com': 'www.escrow.com' };
  const sources = compareSources();
  assert.deepEqual(sources.map((s) => s.provider), Object.keys(hosts));
  for (const { provider, source } of sources) assert.equal(new URL(source).host, hosts[provider as keyof typeof hosts], provider);
  assert.deepEqual([BITPAY.tiers[0].below, BITPAY.tiers[1].from], [500_000, 500_000]);
  assert.equal(BITPAY.tiers.at(-1)?.below, null);
  assert.deepEqual([ESCROW_COM.upTo, ESCROW_COM.minFee, RAILGUN.rate.pct], [5_000, 50, 0.25]);
});

test('the comparison copy keeps its placeholders in every language and uses no em dash', () => {
  const EM_DASH = String.fromCharCode(0x2014);
  const en = LANDING.en.comparePage;
  const holes = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
  for (const { code } of LOCALES) {
    const c = LANDING[code].comparePage;
    for (const key of ['noMonthly', 'monthly', 'swaps', 'bandUnder', 'bandBetween', 'bandFrom', 'escrowCom', 'asOf'] as const) {
      assert.equal(holes(c[key]), holes(en[key]), `${code}.comparePage.${key}`);
    }
    assert.ok(!JSON.stringify(LANDING[code]).includes(EM_DASH), `${code} has an em dash`);
  }
});
