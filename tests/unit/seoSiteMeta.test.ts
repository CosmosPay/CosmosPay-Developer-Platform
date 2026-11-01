import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PAGE_LANGS, SITE_LANGS, SITE_PAGE_PATHS, TOS_LAST_UPDATED, crumbName, siteLang, siteMeta } from '@/lib/seo/site-meta';

const EM_DASH = /—/;
/** Display width as a result snippet measures it: a CJK character takes two Latin ones' room. */
const width = (text: string) => [...text].reduce((n, ch) => n + (/[⺀-鿿豈-﫿＀-￯]/.test(ch) ? 2 : 1), 0);

test('the home and /pricing have their own title and description in every site language', () => {
  for (const page of ['home', 'pricing'] as const) {
    const titles = new Set<string>();
    for (const lang of SITE_LANGS) {
      const { title, description } = siteMeta(page, lang);
      assert.ok(title.includes('Cosmos Pay'), `${page}/${lang} title names the brand`);
      assert.ok(width(title) <= 70, `${page}/${lang} title fits a result (${width(title)})`);
      assert.ok(width(description) >= 80 && width(description) <= 230, `${page}/${lang} description width ${width(description)}`);
      assert.doesNotMatch(title + description, EM_DASH, `${page}/${lang} has no em dash`);
      titles.add(title);
    }
    assert.equal(titles.size, SITE_LANGS.length, `${page}: every language has its own title`);
  }
});

test('titles separate with " | "', () => {
  for (const lang of SITE_LANGS) for (const page of ['home', 'pricing', 'tos'] as const) assert.match(siteMeta(page, lang).title, / \| /);
});

test('the terms exist in English and Spanish; other languages keep the English meta', () => {
  assert.deepEqual(PAGE_LANGS.tos, ['en', 'es']);
  assert.notEqual(siteMeta('tos', 'es').title, siteMeta('tos', 'en').title);
  assert.deepEqual(siteMeta('tos', 'fr'), siteMeta('tos', 'en'));
  assert.match(TOS_LAST_UPDATED, /^\d{4}-\d{2}-\d{2}$/);
});

test('every page has a breadcrumb name in every language, and a public path', () => {
  for (const lang of SITE_LANGS) {
    for (const page of ['home', 'pricing', 'swaps', 'tos'] as const) {
      assert.ok(crumbName(page, lang).length > 0, `${page}/${lang}`);
      assert.match(SITE_PAGE_PATHS[page], /^\/[a-z]*$/);
    }
  }
});

test('an unknown language falls back to English', () => {
  assert.equal(siteLang('xx'), 'en');
  assert.equal(siteLang(undefined), 'en');
  assert.deepEqual(siteMeta('home', 'xx'), siteMeta('home', 'en'));
});
