import { test } from "node:test";
import assert from "node:assert/strict";
import { LANDING } from "@/lib/payments/landing-i18n";
import { LEARN } from "@/lib/payments/learn/index";
import { MESSAGES } from "@/lib/payments/i18n";
import { EMBED_MESSAGES } from "@/embed/i18n";
import { messages } from "@/lib/i18n/messages/index";

/* Protected payments (the payment held in an on-chain contract until the merchant releases it)
   are offered and priced (PROTECTED_PAYMENT_FEE_PCT) but not built yet (product owner, 2026-11-01):
   every string that names them says they are coming soon, in the catalog's own word for it
   (`soon`). The keys below are labelled by their component instead (a "Coming soon" line under a
   card's title, beside the calculator's switch, under a table row's name), or are the protected
   payment FAQ's question, whose answer opens with the label.
   People never read the old name, escrow (product owner, 2026-11-02): it fails in every catalog,
   labelled or not, except as the name of the provider Escrow.com. */

type Leaf = string | number | boolean | null;
function flatten(value: unknown, prefix = "", out: Record<string, Leaf> = {}): Record<string, Leaf> {
  if (Array.isArray(value)) value.forEach((v, i) => flatten(v, `${prefix}[${i}]`, out));
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  else out[prefix] = value as Leaf;
  return out;
}

// The protected payment in every language the catalogs use, singular or plural, in any case.
const PROTECTED = /protected payments?|pagos? protegidos?|pagamentos? protegidos?|paiements? protégés?|geschützte[nr]? Zahlung(en)?|सुरक्षित भुगतान|受保护付款/i;
const mentions = (text: string) => PROTECTED.test(text);
// The old name in every language the catalogs used it in (Hindi transliterated it, Chinese said 担保).
// Escrow.com is the provider protected payments are priced against: its name and its domain stay.
const ESCROW = /escrow|एस्क्रो|担保/i;
const saysEscrow = (text: string) => ESCROW.test(text.replace(/Escrow\.com/gi, ""));

const GATEWAY_LABELLED_BY_COMPONENT = [
  /^benefits\.protected\./,
  /^settle\.protected\./,
  /^calc\.protected$/,
  /^comparePage\.services\.protected$/,
  /^comparePage\.(protected|escrowCom)$/,
  /^ui\.held$/,
  /^faq\.protected\.q$/,
  /^soon$/,
];
const PLATFORM_LABELLED_BY_COMPONENT = [/^pricing\.ratesRows\.protected$/, /^pricing\.soon$/];

for (const [lang, t] of Object.entries(LANDING)) {
  test(`gateway (${lang}): every string that names protected payments says they are coming soon`, () => {
    // The pattern knows this language's name for them, or the test below would pass on nothing.
    assert.match(t.comparePage.services.protected, PROTECTED);
    assert.match(t.settle.protected.title, PROTECTED);
    const label = t.soon.toLowerCase();
    const unlabelled = Object.entries(flatten(t)).filter(
      ([key, value]) =>
        typeof value === "string" && mentions(value) && !GATEWAY_LABELLED_BY_COMPONENT.some((re) => re.test(key)) && !value.toLowerCase().includes(label),
    );
    assert.deepEqual(unlabelled.map(([key]) => key), []);
    // The protected payment FAQ's answer opens with the label, since its question cannot carry it.
    assert.ok(t.faq.protected.a.toLowerCase().includes(label), "faq.protected.a");
  });
}

/* The guides (src/lib/payments/learn/) carry the gateway's label for them too (`soon`). */
for (const [lang, t] of Object.entries(LEARN)) {
  test(`gateway guides (${lang}): every string that names protected payments says they are coming soon`, () => {
    const label = LANDING[lang as keyof typeof LANDING].soon.toLowerCase();
    const unlabelled = Object.entries(flatten(t)).filter(([, value]) => typeof value === "string" && mentions(value) && !value.toLowerCase().includes(label));
    assert.deepEqual(unlabelled.map(([key]) => key), []);
  });
}

for (const [lang, catalog] of Object.entries(messages)) {
  test(`company site (${lang}): every string that names protected payments says they are coming soon`, () => {
    assert.match(catalog.pricing.ratesRows.protected, PROTECTED);
    const label = catalog.pricing.soon.toLowerCase();
    const unlabelled = Object.entries(flatten(catalog)).filter(
      ([key, value]) =>
        typeof value === "string" && mentions(value) && !PLATFORM_LABELLED_BY_COMPONENT.some((re) => re.test(key)) && !value.toLowerCase().includes(label),
    );
    assert.deepEqual(unlabelled.map(([key]) => key), []);
  });
}

const CATALOGS = { gateway: LANDING, guides: LEARN, checkout: MESSAGES, embed: EMBED_MESSAGES, platform: messages } as const;
for (const [name, byLang] of Object.entries(CATALOGS)) {
  test(`${name}: no string says escrow, in any language (Escrow.com, the provider, aside)`, () => {
    for (const [lang, catalog] of Object.entries(byLang)) {
      const said = Object.entries(flatten(catalog)).filter(([, value]) => typeof value === "string" && saysEscrow(value));
      assert.deepEqual(said.map(([key]) => key), [], lang);
    }
  });
}
