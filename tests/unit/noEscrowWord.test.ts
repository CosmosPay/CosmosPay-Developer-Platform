import { test } from "node:test";
import assert from "node:assert/strict";
import { LANDING } from "@/lib/payments/landing-i18n";
import { LEARN } from "@/lib/payments/learn/index";
import { MESSAGES } from "@/lib/payments/i18n";
import { EMBED_MESSAGES } from "@/embed/i18n";
import { messages } from "@/lib/i18n/messages/index";

/* Protected payments (the payment held in a smart contract until the order is delivered) are
   available (product owner, 2026-11-03): no string that names them carries a "coming soon" label,
   in any language. The label stays only where it marks something not built yet (the e-commerce
   plugins' tag on the gateway).
   People never read the old name, escrow (product owner, 2026-11-02): it fails in every catalog
   except as the name of the provider Escrow.com. */

type Leaf = string | number | boolean | null;
function flatten(value: unknown, prefix = "", out: Record<string, Leaf> = {}): Record<string, Leaf> {
  if (Array.isArray(value)) value.forEach((v, i) => flatten(v, `${prefix}[${i}]`, out));
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  else out[prefix] = value as Leaf;
  return out;
}
const strings = (catalog: unknown): [string, string][] =>
  Object.entries(flatten(catalog)).filter((entry): entry is [string, string] => typeof entry[1] === "string");

// The protected payment in every language the catalogs use, singular or plural, in any case.
const PROTECTED = /protected payments?|pagos? protegidos?|pagamentos? protegidos?|paiements? protégés?|geschützte[nr]? Zahlung(en)?|सुरक्षित भुगतान|受保护付款/i;
// The old name in every language the catalogs used it in (Hindi transliterated it, Chinese said 担保).
// Escrow.com is the provider protected payments are priced against: its name and its domain stay.
const ESCROW = /escrow|एस्क्रो|担保/i;
const saysEscrow = (text: string) => ESCROW.test(text.replace(/Escrow\.com/gi, ""));
// Each catalog's word for "coming soon", as the e-commerce plugins' tag still uses it.
const SOON: Record<keyof typeof LANDING, RegExp> = {
  en: /coming soon/i,
  es: /próximamente/i,
  pt: /em breve/i,
  fr: /bientôt/i,
  de: /demnächst/i,
  hi: /जल्द आ/,
  zh: /即将/,
};

const CATALOGS = { gateway: LANDING, guides: LEARN, checkout: MESSAGES, embed: EMBED_MESSAGES, platform: messages } as const;

for (const [name, byLang] of Object.entries(CATALOGS)) {
  test(`${name}: no string says escrow, in any language (Escrow.com, the provider, aside)`, () => {
    for (const [lang, catalog] of Object.entries(byLang)) {
      const said = strings(catalog).filter(([, value]) => saysEscrow(value));
      assert.deepEqual(said.map(([key]) => key), [], lang);
    }
  });

  test(`${name}: no protected-payment string carries the "coming soon" label, in any language`, () => {
    for (const [lang, catalog] of Object.entries(byLang)) {
      const soon = SOON[lang as keyof typeof SOON];
      assert.ok(soon, `${lang} has a label pattern`);
      const labelled = strings(catalog).filter(([, value]) => PROTECTED.test(value) && soon.test(value));
      assert.deepEqual(labelled.map(([key]) => key), [], lang);
    }
  });
}

for (const [lang, t] of Object.entries(LANDING)) {
  test(`gateway (${lang}): the guards know this language's words`, () => {
    // The name pattern matches this language's name for protected payments, or the guard above
    // would pass on nothing.
    assert.match(t.comparePage.services.protected, PROTECTED);
    assert.match(t.settle.protected.title, PROTECTED);
    assert.match(t.faq.protected.q, PROTECTED);
    assert.match(messages[lang as keyof typeof messages].pricing.ratesRows.protected, PROTECTED);
    // The label pattern matches the catalog's own word for it (the plugins' tag).
    assert.match(t.integrations.plugins.tag, SOON[lang as keyof typeof SOON]);
  });
}
