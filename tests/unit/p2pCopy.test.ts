/* p2pCopy.test.ts: the P2P market's copy (src/lib/i18n/messages/p2p and p2p-public) follows the
   product owner's rules beyond the catalogs' own parity test: every language is really translated
   (not a copy of English left behind), and no string names a network. The market runs on the EVM
   networks where its contract is deployed: screens name them only in pickers, from the market's
   own answer, and count them from it; never "Stellar, Solana and Monad" or any fixed list. The
   word escrow and providers' names are checked for every catalog by noEscrowWord.test.ts and
   noProviderNames.test.ts. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { messages } from "@/lib/i18n/messages/index";

type Leaf = string | number | boolean | null;
function flatten(value: unknown, prefix = "", out: Record<string, Leaf> = {}): Record<string, Leaf> {
  if (Array.isArray(value)) value.forEach((v, i) => flatten(v, `${prefix}[${i}]`, out));
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  else out[prefix] = value as Leaf;
  return out;
}

const BLOCKS = ["p2p", "p2pPublic"] as const;
// Strings that read the same in every language: codes, acronyms, product names, sample values.
const SAME_OK = /^(?:[A-Z0-9 .,:+&/·{}#-]+|P2P|PIX|SPEI|CLABE|CBU|CVU|RFC|RUT|CCI|DNI|NIT|TypeScript|Bancolombia|Lumio[^"]*|Ana Gómez|ana[.@][\w.@-]+|\{n\} [a-z]+|\{\w+\}.*)$/;

for (const block of BLOCKS) {
  const en = flatten((messages.en as Record<string, unknown>)[block]);
  for (const [lang, catalog] of Object.entries(messages)) {
    if (lang === "en") continue;
    test(`${block}: ${lang} is translated, not a copy of English`, () => {
      const other = flatten((catalog as Record<string, unknown>)[block]);
      const strings = Object.keys(en).filter((k) => typeof en[k] === "string");
      const same = strings.filter((k) => other[k] === en[k] && !SAME_OK.test(String(en[k])));
      assert.ok(same.length <= Math.max(3, Math.floor(strings.length * 0.05)), `${same.length} of ${strings.length} strings still English: ${same.slice(0, 12).join(", ")}`);
    });
  }
}

test("no P2P string names a network: networks come from the market, in pickers", () => {
  const NETWORK = /\b(Stellar|Solana|Monad|Ethereum|Arbitrum|Optimism|Polygon|Avalanche|BNB Chain|Base Sepolia|Gnosis)\b/;
  for (const [lang, catalog] of Object.entries(messages)) {
    for (const block of BLOCKS) {
      const named = Object.entries(flatten((catalog as Record<string, unknown>)[block])).filter(([, v]) => typeof v === "string" && NETWORK.test(v)).map(([k]) => k);
      assert.deepEqual(named, [], `${lang} ${block}`);
    }
  }
});
