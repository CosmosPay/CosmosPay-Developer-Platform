/* embedI18n.test.ts checks the embed's copy (src/embed/i18n.ts): every locale complete, and the
   checkout's sentences word for word those of the hosted checkout (src/lib/payments/i18n.ts),
   so the payer reads the same thing inline and on the payments site. */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { EMBED_LOCALES, EMBED_MESSAGES } from '@/embed/i18n';
import { LOCALES, MESSAGES } from '@/lib/payments/i18n';

function paths(obj: unknown, at = ''): string[] {
  if (!obj || typeof obj !== 'object') return [at];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) => paths(v, at ? `${at}.${k}` : k));
}

function get(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], obj);
}

/* The one sentence that differs on purpose: the hosted page adds "you can close this page". */
const OWN_WORDING = new Set(['body.paid']);

test('the embed ships the same five languages as the payments site', () => {
  assert.deepEqual([...EMBED_LOCALES], LOCALES.map((l) => l.code));
});

test('every locale has exactly the English keys, none empty', () => {
  const expected = paths(EMBED_MESSAGES.en).sort();
  for (const code of EMBED_LOCALES) {
    assert.deepEqual(paths(EMBED_MESSAGES[code]).sort(), expected, code);
    for (const p of expected) {
      const value = get(EMBED_MESSAGES[code], p);
      assert.ok(typeof value === 'string' && value.trim(), `${code}.${p} is empty`);
    }
  }
});

test("the checkout's strings are the hosted checkout's, word for word", () => {
  for (const code of EMBED_LOCALES) {
    for (const p of paths(EMBED_MESSAGES[code].checkout)) {
      if (OWN_WORDING.has(p)) continue;
      assert.equal(get(EMBED_MESSAGES[code].checkout, p), get(MESSAGES[code].checkout, p), `${code}.checkout.${p}`);
    }
    assert.equal(EMBED_MESSAGES[code].by, MESSAGES[code].footer.by, `${code}.by`);
  }
});

test('the inline "paid" line does not tell the payer to close a page', () => {
  for (const code of EMBED_LOCALES) {
    const inline = EMBED_MESSAGES[code].checkout.body.paid;
    const hosted = MESSAGES[code].checkout.body.paid;
    assert.notEqual(inline, hosted, code);
    assert.ok(hosted.startsWith(inline.replace(/\.$/, '')), `${code}: "${inline}" should open "${hosted}"`);
  }
});
