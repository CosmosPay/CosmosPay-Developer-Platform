/* embedOptions.test.ts — the embed's attributes and the URLs it builds (src/embed/options.ts). */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import {
  checkoutUrl,
  DEMO_SEQUENCE,
  isDemo,
  previewUrl,
  parseLinkId,
  parseTheme,
  popupFeatures,
  popupName,
  resolveLang,
  supportedLang,
} from '@/embed/options';

const ID = 'cmh4x2k9a0001l70g8v5q3z2w';
const ORIGIN = 'https://payments.cosmospay.lat';

test('link: a payment link id, trimmed, or nothing', () => {
  assert.equal(parseLinkId(ID), ID);
  assert.equal(parseLinkId(`  ${ID}\n`), ID);
  for (const bad of [null, undefined, '', 'LINK_ID', ID.toUpperCase(), `${ID}/x`, `../${ID}`, 'javascript:alert(1)']) {
    assert.equal(parseLinkId(bad), null, String(bad));
  }
});

test('theme: light, dark or auto, light when absent or unknown', () => {
  assert.equal(parseTheme('dark'), 'dark');
  assert.equal(parseTheme(' AUTO '), 'auto');
  assert.equal(parseTheme('light'), 'light');
  for (const other of [null, undefined, '', 'blue', 'system']) assert.equal(parseTheme(other), 'light', String(other));
});

test('lang: the attribute when shipped, else the browser languages, else English', () => {
  assert.equal(resolveLang('es', ['de']), 'es');
  assert.equal(resolveLang('pt-BR', []), 'pt');
  assert.equal(resolveLang('FR_ca', []), 'fr');
  assert.equal(resolveLang('ja', ['ja-JP', 'de-AT', 'en']), 'de');
  assert.equal(resolveLang(null, ['es-419', 'en']), 'es');
  assert.equal(resolveLang('', ['zh-CN']), 'en');
  assert.equal(resolveLang(undefined), 'en');
  assert.equal(supportedLang('de'), 'de');
  assert.equal(supportedLang('xx'), null);
  assert.equal(supportedLang(null), null);
});

test('the checkout URL is the link on the payments origin, with lang only when given', () => {
  assert.equal(checkoutUrl(ORIGIN, ID), `${ORIGIN}/${ID}`);
  assert.equal(checkoutUrl(ORIGIN, ID, 'es'), `${ORIGIN}/${ID}?lang=es`);
  assert.equal(checkoutUrl('http://payments.cosmospay.localhost:4331', ID), `http://payments.cosmospay.localhost:4331/${ID}`);
});

test('the popup is 480x780, centred on the window, never off the top-left', () => {
  assert.equal(
    popupFeatures({ screenX: 100, screenY: 50, outerWidth: 1280, outerHeight: 900 }),
    'popup=yes,width=480,height=780,left=500,top=110',
  );
  assert.equal(
    popupFeatures({ screenX: 0, screenY: 0, outerWidth: 360, outerHeight: 640 }),
    'popup=yes,width=480,height=780,left=0,top=0',
  );
  assert.equal(
    popupFeatures({ screenX: NaN, screenY: Infinity, outerWidth: 1000, outerHeight: 1000 }),
    'popup=yes,width=480,height=780,left=260,top=110',
  );
  // No `noopener`: the button needs the window it opened, the checkout needs its opener.
  assert.doesNotMatch(popupFeatures({ screenX: 0, screenY: 0, outerWidth: 0, outerHeight: 0 }), /noopener|noreferrer/);
  assert.equal(popupName(ID), `cosmospay-${ID}`);
});

test("demo: a boolean attribute, the sample checkout it opens, the states it plays", () => {
  assert.equal(isDemo(""), true);
  assert.equal(isDemo("demo"), true);
  assert.equal(isDemo("false"), false);
  assert.equal(isDemo(null), false);
  assert.equal(previewUrl("https://payments.cosmospay.lat"), "https://payments.cosmospay.lat/preview/classic");
  assert.equal(previewUrl("https://payments.cosmospay.lat", "es"), "https://payments.cosmospay.lat/preview/classic?lang=es");
  // open, then confirming, then paid: a demo never shows a failure or a refund
  assert.deepEqual(DEMO_SEQUENCE.map((s) => s.status), ["PENDING", "SUBMITTED", "SUCCEEDED"]);
  assert.ok(DEMO_SEQUENCE.every((s) => s.ms >= 1000));
});
