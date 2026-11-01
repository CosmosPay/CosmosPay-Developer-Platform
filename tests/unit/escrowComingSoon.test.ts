import { test } from "node:test";
import assert from "node:assert/strict";
import { LANDING } from "@/lib/payments/landing-i18n";
import { LEARN } from "@/lib/payments/learn/index";
import { messages } from "@/lib/i18n/messages/index";

/* Escrow is offered and priced (ESCROW_FEE_PCT) but not built yet (product owner, 2026-11-01): every
   string that names it says it is coming soon, in the catalog's own word for it (`soon`). The keys
   below are labelled by their component instead (a "Coming soon" line under a card's title, beside
   the calculator's switch, under a table row's name), or are the escrow FAQ's question, whose
   answer opens with the label. */

type Leaf = string | number | boolean | null;
function flatten(value: unknown, prefix = "", out: Record<string, Leaf> = {}): Record<string, Leaf> {
  if (Array.isArray(value)) value.forEach((v, i) => flatten(v, `${prefix}[${i}]`, out));
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  else out[prefix] = value as Leaf;
  return out;
}

// Escrow in every language the catalogs use (Hindi transliterates it, Chinese says 担保).
const ESCROW = /escrow|एस्क्रो|担保/i;
const mentions = (text: string) => ESCROW.test(text.replace(/Escrow\.com/g, ""));

const GATEWAY_LABELLED_BY_COMPONENT = [
  /^benefits\.escrow\./,
  /^settle\.escrow\./,
  /^calc\.escrow$/,
  /^comparePage\.services\.escrow$/,
  /^comparePage\.escrow(Com)?$/,
  /^ui\.held$/,
  /^faq\.escrow\.q$/,
  /^soon$/,
];
const PLATFORM_LABELLED_BY_COMPONENT = [/^pricing\.ratesRows\.escrow$/, /^pricing\.soon$/];

for (const [lang, t] of Object.entries(LANDING)) {
  test(`gateway (${lang}): every string that names escrow says it is coming soon`, () => {
    const label = t.soon.toLowerCase();
    const unlabelled = Object.entries(flatten(t)).filter(
      ([key, value]) =>
        typeof value === "string" && mentions(value) && !GATEWAY_LABELLED_BY_COMPONENT.some((re) => re.test(key)) && !value.toLowerCase().includes(label),
    );
    assert.deepEqual(unlabelled.map(([key]) => key), []);
    // The escrow FAQ's answer opens with the label, since its question cannot carry it.
    assert.ok(t.faq.escrow.a.toLowerCase().includes(label), "faq.escrow.a");
  });
}

/* The guides (src/lib/payments/learn/) carry the gateway's label for it too (`soon`). */
for (const [lang, t] of Object.entries(LEARN)) {
  test(`gateway guides (${lang}): every string that names escrow says it is coming soon`, () => {
    const label = LANDING[lang as keyof typeof LANDING].soon.toLowerCase();
    const unlabelled = Object.entries(flatten(t)).filter(([, value]) => typeof value === "string" && mentions(value) && !value.toLowerCase().includes(label));
    assert.deepEqual(unlabelled.map(([key]) => key), []);
  });
}

for (const [lang, catalog] of Object.entries(messages)) {
  test(`company site (${lang}): every string that names escrow says it is coming soon`, () => {
    const label = catalog.pricing.soon.toLowerCase();
    const unlabelled = Object.entries(flatten(catalog)).filter(
      ([key, value]) =>
        typeof value === "string" && mentions(value) && !PLATFORM_LABELLED_BY_COMPONENT.some((re) => re.test(key)) && !value.toLowerCase().includes(label),
    );
    assert.deepEqual(unlabelled.map(([key]) => key), []);
  });
}
