/* pricingCatalog.test.ts: the pricing page and the onboarding wizard pair translated copy
   with plan data by POSITION (the plan cards with PLAN_META and PLAN_IDS, the compare table's
   columns with PLAN_IDS) or by id (the wizard's cards). A column added or dropped in one
   catalog and not the others shifts every value under the wrong plan, silently. */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { PLAN_META } from '@/components/cosmos/pricing/data';
import { PLAN_DATA, PLAN_IDS as ONBOARDING_PLAN_IDS, SUPPORT_FOR, VOL_REC } from '@/components/cosmos/onboarding/data';
import { messages } from '@/lib/i18n/messages/index';
import { PLAN_IDS, isOfferedPlan } from '@/lib/plans';

const LOCALES = Object.keys(messages) as (keyof typeof messages)[];

/* Every key path of a subtree (array lengths included), so locales can be compared for shape. */
function paths(obj: unknown, at = ''): string[] {
  if (Array.isArray(obj)) return [`${at}[${obj.length}]`, ...obj.flatMap((v, i) => paths(v, `${at}[${i}]`))];
  if (!obj || typeof obj !== 'object') return [at];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) => paths(v, at ? `${at}.${k}` : k));
}

test('the pricing and onboarding copy has the same shape in every locale', () => {
  for (const code of LOCALES) {
    assert.deepEqual(paths(messages[code].pricing).sort(), paths(messages.en.pricing).sort(), `${code}.pricing`);
    assert.deepEqual(paths(messages[code].onboarding).sort(), paths(messages.en.onboarding).sort(), `${code}.onboarding`);
  }
});

test('the plan cards line up with PLAN_META and the offered plans (Enterprise has its own card)', () => {
  const offered = PLAN_IDS.filter((id) => id !== 'enterprise');
  assert.equal(PLAN_META.length, offered.length);
  for (const code of LOCALES) {
    const { plans } = messages[code].pricing;
    assert.deepEqual(plans.map((p) => p.name), offered.map((id) => messages.en.dash.planNames[id]), code);
    plans.forEach((plan, i) => assert.equal(plan.feats.length, PLAN_META[i].on.length, `${code} ${plan.name} feats`));
  }
});

test('the compare table has one column per offered plan, and no legacy plan', () => {
  for (const code of LOCALES) {
    const p = messages[code].pricing;
    assert.equal(p.compareHead.length, PLAN_IDS.length + 1, `${code} compareHead`);
    assert.deepEqual(p.compareHead.slice(1), PLAN_IDS.map((id) => messages.en.dash.planNames[id]), `${code} compareHead`);
    for (const row of p.compare) assert.equal(row.v.length, PLAN_IDS.length, `${code} compare row "${row.l}"`);
  }
});

test('the onboarding wizard only offers plans that are still offered, each with its data and copy', () => {
  for (const id of ONBOARDING_PLAN_IDS) {
    assert.ok(isOfferedPlan(id), `${id} is not offered`);
    assert.ok(PLAN_DATA[id as keyof typeof PLAN_DATA], `${id} has no PLAN_DATA`);
    assert.ok(SUPPORT_FOR[id as keyof typeof SUPPORT_FOR], `${id} has no support level`);
    for (const code of LOCALES) {
      const ob = messages[code].onboarding;
      assert.ok(ob.plans[id as keyof typeof ob.plans], `${code}.onboarding.plans.${id}`);
      assert.ok(ob.supportLevels[SUPPORT_FOR[id as keyof typeof SUPPORT_FOR] as keyof typeof ob.supportLevels], `${code} support level for ${id}`);
    }
  }
  assert.deepEqual(Object.keys(PLAN_DATA).sort(), [...ONBOARDING_PLAN_IDS].sort());
  for (const rec of Object.values(VOL_REC)) assert.ok(ONBOARDING_PLAN_IDS.includes(rec), `recommends ${rec}`);
});
