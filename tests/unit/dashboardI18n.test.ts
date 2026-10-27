import { test } from "node:test";
import assert from "node:assert/strict";
import { messages } from "@/lib/i18n/messages/index";
import { LOCALES } from "@/lib/i18n/locales";

/* The platform's catalog (dashboard, nav, company site, onboarding): every language mirrors
   English key for key, with the same {placeholders}, so no screen falls back to a blank. */

type Leaf = string | number | boolean | null;
function flatten(value: unknown, prefix = "", out: Record<string, Leaf> = {}): Record<string, Leaf> {
  if (Array.isArray(value)) {
    value.forEach((v, i) => flatten(v, `${prefix}[${i}]`, out));
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  } else {
    out[prefix] = value as Leaf;
  }
  return out;
}
const tokens = (s: Leaf) => (typeof s === "string" ? [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",") : "");

const en = flatten(messages.en);

test("every language in the picker has a catalog, and every catalog is in the picker", () => {
  assert.deepEqual(LOCALES.map((l) => l.code).sort(), Object.keys(messages).sort());
  for (const code of ["en", "es", "pt", "fr", "de", "hi", "zh"]) assert.ok(code in messages, code);
});

for (const [code, catalog] of Object.entries(messages)) {
  if (code === "en") continue;
  const other = flatten(catalog);
  test(`${code} has exactly the keys English has`, () => {
    const missing = Object.keys(en).filter((k) => !(k in other));
    const extra = Object.keys(other).filter((k) => !(k in en));
    assert.deepEqual({ missing, extra }, { missing: [], extra: [] });
  });
  test(`${code} keeps every {placeholder} and leaves no string empty`, () => {
    const wrong = Object.keys(en).filter((k) => typeof en[k] === "string" && tokens(en[k]) !== tokens(other[k]));
    const empty = Object.keys(other).filter((k) => other[k] === "");
    assert.deepEqual({ wrong, empty }, { wrong: [], empty: [] });
  });
}

test("no catalog uses the em dash", () => {
  for (const [code, catalog] of Object.entries(messages)) {
    const EM_DASH = String.fromCharCode(0x2014);
    const hits = Object.entries(flatten(catalog)).filter(([, v]) => typeof v === "string" && v.includes(EM_DASH));
    assert.deepEqual(hits.map(([k]) => k), [], code);
  }
});
