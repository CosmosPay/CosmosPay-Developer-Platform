import { test } from "node:test";
import assert from "node:assert/strict";
import { messages } from "@/lib/i18n/messages/index";
import { PLAN_SPECS, pricingCopyVars } from "@/lib/plans";

/* The company site's pricing copy says what a payment costs, from the specs: a lede or an answer
   that mentions the fee without its rate left the reader asking how much it is. */
const fill = (text: string, vars: Record<string, string>) => text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? vars[k] : m));

test("the pricing lede and the monthly-fee answer name Starter's rate in every language", () => {
  const vars = pricingCopyVars();
  for (const [lang, m] of Object.entries(messages)) {
    const pricing = (m as any).pricing;
    assert.ok(fill(pricing.lede, vars).includes(PLAN_SPECS.starter.perTx), `${lang} pricing.lede`);
    assert.ok(fill(pricing.faqs[0].a, vars).includes(PLAN_SPECS.starter.perTx), `${lang} pricing.faqs[0].a`);
  }
});

test("every placeholder in the pricing lede and answers has a value", () => {
  const vars = pricingCopyVars();
  for (const [lang, m] of Object.entries(messages)) {
    const pricing = (m as any).pricing;
    for (const text of [pricing.lede, ...pricing.faqs.map((f: { a: string }) => f.a)]) {
      assert.doesNotMatch(fill(text, vars), /\{\w+\}/, `${lang}: ${text.slice(0, 60)}`);
    }
  }
});
