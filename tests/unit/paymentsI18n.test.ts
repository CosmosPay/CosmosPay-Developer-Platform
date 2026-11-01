import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOCALES, MESSAGES, resolveLocale } from '@/lib/payments/i18n';
import { LANDING } from '@/lib/payments/landing-i18n';
import { LEARN } from '@/lib/payments/learn/index';

/* Every key path of a catalog, so locales can be compared for shape. */
function paths(obj: unknown, at = ''): string[] {
  if (!obj || typeof obj !== 'object') return [at];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) => paths(v, at ? `${at}.${k}` : k));
}

test('every locale has exactly the English keys, none empty', () => {
  const expected = paths(MESSAGES.en).sort();
  for (const { code } of LOCALES) {
    assert.deepEqual(paths(MESSAGES[code]).sort(), expected, code);
    for (const p of paths(MESSAGES[code])) {
      const value = p.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], MESSAGES[code]);
      assert.ok(typeof value === 'string' && value.trim(), `${code}.${p} is empty`);
    }
  }
});

test('resolveLocale prefers ?lang, then the cookie, then Accept-Language, then English', () => {
  assert.equal(resolveLocale({ query: 'de', cookie: 'es', acceptLanguage: 'fr' }), 'de');
  assert.equal(resolveLocale({ query: 'xx', cookie: 'es', acceptLanguage: 'fr' }), 'es');
  assert.equal(resolveLocale({ cookie: 'xx', acceptLanguage: 'pt-BR,pt;q=0.9,en;q=0.8' }), 'pt');
  assert.equal(resolveLocale({ acceptLanguage: 'ja,fr;q=0.5' }), 'fr');
  assert.equal(resolveLocale({ acceptLanguage: 'en;q=0.2,es;q=0.9' }), 'es');
  assert.equal(resolveLocale({ acceptLanguage: 'ja' }), 'en');
  assert.equal(resolveLocale({}), 'en');
});

test('the landing copy has exactly the English keys in every locale, none empty', () => {
  const expected = paths(LANDING.en).sort();
  for (const { code } of LOCALES) {
    assert.deepEqual(paths(LANDING[code]).sort(), expected, code);
    for (const p of paths(LANDING[code])) {
      const value = p.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], LANDING[code]);
      assert.ok(typeof value === 'string' && value.trim(), `${code}.${p} is empty`);
    }
  }
});

test('every locale keeps the {rate} placeholder the page fills in', () => {
  for (const { code } of LOCALES) assert.match(LANDING[code].compare.rows.fees.us, /\{rate\}/, code);
});

test('the guides have exactly the English keys in every locale, none empty, with the same placeholders', () => {
  const expected = paths(LEARN.en).sort();
  const at = (catalog: unknown, p: string) => p.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], catalog);
  const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
  for (const { code } of LOCALES) {
    assert.deepEqual(paths(LEARN[code]).sort(), expected, code);
    for (const p of expected) {
      const value = at(LEARN[code], p);
      assert.ok(typeof value === 'string' && value.trim(), `${code}.${p} is empty`);
      assert.equal(placeholders(value as string), placeholders(at(LEARN.en, p) as string), `${code}.${p} placeholders`);
    }
  }
});
