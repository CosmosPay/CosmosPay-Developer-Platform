import { test } from "node:test";
import assert from "node:assert/strict";
import { LANDING } from "@/lib/payments/landing-i18n";
import { LEARN } from "@/lib/payments/learn/index";
import { MESSAGES } from "@/lib/payments/i18n";
import { EMBED_MESSAGES } from "@/embed/i18n";
import { messages } from "@/lib/i18n/messages/index";
import { learnHrefs } from "@/lib/payments/learn/links";
import { standardAssets } from "@/lib/stellar-assets";
import { networkPresets } from "@/lib/payments/network-pages";
import { CHAINS } from "@/lib/chains";
import { llmsFullDocs } from "@/lib/seo/llms-full";

/* Customers never learn who Cosmos Pay's providers are (product owner, 2026-11-03): no string of
   any catalog, in any language, names the services Cosmos Pay is built on. The copy says what
   happens instead (a cross-chain swap, the USDT0 bridge, a confidential token on Stellar). Only the
   terms of service name them, where the law requires it (src/lib/site/terms.ts, not a catalog). */

const PROVIDERS = /NEAR Intents|1Click|LayerZero|Jupiter|Kuru|OpenZeppelin|BlindPay|Trustless Work/i;

type Leaf = string | number | boolean | null;
function flatten(value: unknown, prefix = "", out: Record<string, Leaf> = {}): Record<string, Leaf> {
  if (Array.isArray(value)) value.forEach((v, i) => flatten(v, `${prefix}[${i}]`, out));
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  else out[prefix] = value as Leaf;
  return out;
}

const CATALOGS = { gateway: LANDING, guides: LEARN, checkout: MESSAGES, embed: EMBED_MESSAGES, platform: messages } as const;

for (const [name, byLang] of Object.entries(CATALOGS)) {
  test(`${name}: no string names a provider, in any language`, () => {
    for (const [lang, catalog] of Object.entries(byLang as Record<string, unknown>)) {
      const named = Object.entries(flatten(catalog)).filter(([, v]) => typeof v === "string" && PROVIDERS.test(v)).map(([k]) => k);
      assert.deepEqual(named, [], `${name} ${lang}`);
    }
  });
}

/* Data, not catalogs, also reaches the pages: the presets the network pages and the dashboard's
   asset pickers name each asset's issuer from. */
test("no asset preset names a provider as its issuer, on any network", () => {
  for (const tier of ["public", "testnet"] as const) {
    for (const a of standardAssets(tier)) assert.doesNotMatch(a.issuerName ?? "", PROVIDERS, `${tier} ${a.code}`);
  }
  for (const chain of CHAINS) {
    for (const row of networkPresets(chain)) assert.doesNotMatch(row.issuer ?? "", PROVIDERS, `${chain} ${row.code}`);
  }
});

test("no page's Markdown names a provider, but the terms, where the law requires it", () => {
  const input = { site: "https://cosmospay.lat", dev: "https://dev.cosmospay.lat", payments: "https://payments.cosmospay.lat", api: "https://api.cosmospay.lat/cosmos-api", profiles: {} };
  for (const area of ["site", "payments"] as const) {
    for (const doc of llmsFullDocs(area, input)) {
      if (new URL(doc.url).pathname === "/tos") continue;
      assert.doesNotMatch(JSON.stringify(doc), PROVIDERS, doc.url);
    }
  }
});

test("the guides cite no provider's page as their source", () => {
  for (const href of Object.values(learnHrefs("https://dev.cosmospay.lat/docs/"))) {
    assert.doesNotMatch(href, /layerzero|near\.org|near-intents|jup\.ag|kuru|openzeppelin|blindpay|trustlesswork/i, href);
  }
});
