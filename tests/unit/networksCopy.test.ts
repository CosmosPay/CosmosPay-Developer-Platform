import { test } from "node:test";
import assert from "node:assert/strict";
import { landingContent } from "@/lib/payments/landing-content";
import { messages } from "@/lib/i18n/messages/index";
import { LOCALES } from "@/lib/i18n/locales";
import { NETWORK_IDS, networkName } from "@/lib/chains";

/* Cosmos Pay works with every network of its swap platform (product owner, 2026-11-03: "no
   pongas estrictamente solana monad o stellar, sino toda nuestra colección", and again when the
   hero and the FAQ still named the three first). Where Cosmos Pay presents itself, the copy
   counts the whole collection instead of naming Stellar, Solana and Monad as its networks. The
   network pages, the guide comparing those three and the dashboard's forms still name them:
   they are about them. */

const THREE = ["Stellar", "Solana", "Monad"];
// The networks answer lists the whole collection by name, those three among the rest: that list
// is the point, so it is taken out before looking.
const withoutList = (text: string) => NETWORK_IDS.every((id) => text.includes(networkName(id))) ? text.replace(new RegExp(`${networkName(NETWORK_IDS[0])}.*${networkName(NETWORK_IDS[NETWORK_IDS.length - 1])}`, "s"), "") : text;
const namesTwo = (text: string) => THREE.filter((name) => withoutList(text).includes(name)).length >= 2;
const langs = LOCALES.map((l) => (typeof l === "string" ? l : (l as { code: string }).code));

test("the gateway's hero, how it works and every answer of its FAQ count the networks, in every language", () => {
  for (const lang of langs) {
    const { t, faq } = landingContent(lang as never);
    const texts = { "meta.description": t.meta.description, "hero.lede": t.hero.lede, "how.pay.body": t.how.pay.body, ...Object.fromEntries(faq.map((f, i) => [`faq[${i}]`, f.a])) };
    for (const [key, text] of Object.entries(texts)) assert.ok(!namesTwo(text), `${lang} ${key}: ${text}`);
    assert.ok(t.hero.lede.includes(String(NETWORK_IDS.length)), `${lang} hero.lede names the count`);
  }
});

test("the gateway's copy leaves no network count unfilled, but its step counters", () => {
  for (const lang of langs) {
    const leftover: string[] = [];
    const walk = (value: unknown, path: string) => {
      if (typeof value === "string") {
        if (value.includes("{n}") && !path.endsWith(".counter")) leftover.push(path);
      } else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) walk(v, `${path}.${k}`);
    };
    walk(landingContent(lang as never).t, lang);
    assert.deepEqual(leftover, [], lang);
  }
});

test("the company site presents Cosmos Pay by every network it works with, in every language", () => {
  for (const [lang, m] of Object.entries(messages as Record<string, any>)) {
    const texts: Record<string, string> = {
      "footer.tagline": m.footer.tagline,
      "landing.meta.description": m.landing.meta.description,
      "landing.hero.lede": m.landing.hero.lede,
      "landing.wallet.lede": m.landing.wallet.lede,
      "landing.stats.answer": m.landing.stats.answer,
      "landing.cta.desc": m.landing.cta.desc,
      "about.lede": m.about.lede,
      "onboarding.specTagline": m.onboarding.specTagline,
    };
    m.landing.stats.items.forEach((item: string, i: number) => { texts[`landing.stats.items[${i}]`] = item; });
    for (const [key, text] of Object.entries(texts)) assert.ok(!namesTwo(text), `${lang} ${key}: ${text}`);
  }
});
