import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { analyticsEnabled, analyticsSnippet } from '@/lib/analytics';
import { indexablePages } from '@/lib/seo/indexable';

const GA = 'G-DP0DSQMKSQ';

test('Google Analytics runs on the company site\'s indexable pages only', () => {
  for (const { path } of indexablePages('site')) {
    assert.equal(analyticsEnabled({ gaId: GA, area: 'site', path, noindex: false }), true, path);
    assert.equal(analyticsEnabled({ gaId: GA, area: 'site', path, noindex: true }), false, `${path} noindex`);
    assert.equal(analyticsEnabled({ gaId: '', area: 'site', path, noindex: false }), false, `${path} without an id`);
  }
  // The platform: addresses that carry invitation tokens, dashboard searches, KYC receivers.
  for (const path of ['/dashboard', '/invite/3f9c2d7e-token', '/kyc/return/org_1/prod/rcv_1', '/onboarding', '/swagger', '/login', '/', '/pricing']) {
    assert.equal(analyticsEnabled({ gaId: GA, area: 'dev', path, noindex: false }), false, `dev ${path}`);
  }
  // The gateway: payment links, /pay with its URI, private checkouts, and its content pages too.
  for (const path of ['/cmh4x2k9a0001l70g8v5q3z2w', '/pay', '/zk/cm1x2y3z4a5b6c7d8e9f0g1h2', '/preview/split', '/', '/faq']) {
    assert.equal(analyticsEnabled({ gaId: GA, area: 'payments', path, noindex: false }), false, `payments ${path}`);
  }
  // A page of the company site that is not indexable (its canonical is the gateway's), and no area.
  assert.equal(analyticsEnabled({ gaId: GA, area: 'site', path: '/swaps', noindex: false }), false);
  assert.equal(analyticsEnabled({ gaId: GA, area: undefined, path: '/', noindex: false }), false);
  // An id that is not a measurement id is never written into a script.
  assert.equal(analyticsEnabled({ gaId: "G-X');alert(1)//", area: 'site', path: '/', noindex: false }), false);
  assert.equal(analyticsSnippet("G-X');alert(1)//"), null);
});

/** Runs the snippet as a browser would, at `href`, and returns what it queued and loaded. */
function run(href: string, referrer = '') {
  const queued: unknown[][] = [];
  const loaded: string[] = [];
  const listeners: Record<string, () => void> = {};
  const window: Record<string, unknown> = {
    addEventListener: (type: string, fn: () => void) => (listeners[type] = fn),
    setTimeout: (fn: () => void) => fn(),
  };
  const document = {
    readyState: 'loading',
    referrer,
    head: { appendChild: (el: { src: string }) => loaded.push(el.src) },
    createElement: () => ({ async: false, src: '' }),
  };
  const context = vm.createContext({ window, document, location: { href }, URL, Date, encodeURIComponent, setTimeout: window.setTimeout });
  window.dataLayer = { push: (args: ArrayLike<unknown>) => queued.push(Array.from(args)) };
  context.dataLayer = window.dataLayer;
  vm.runInContext(analyticsSnippet(GA)!, context);
  listeners.load?.();
  const config = queued.find((args) => args[0] === 'config');
  // Copied out of the script's realm, so it compares as a plain object.
  return { config: JSON.parse(JSON.stringify(config?.[2] ?? null)) as Record<string, string>, id: config?.[1], loaded };
}

test('the page view names the address with lang as its only query parameter, and the referrer bare', () => {
  const view = run('https://cosmospay.lat/pricing?utm_source=chatgpt.com&lang=es&token=abc123&email=a%40b.c#plans', 'https://cosmospay.lat/?lang=es&q=secret#x');
  assert.equal(view.id, GA);
  assert.deepEqual(view.config, {
    page_location: 'https://cosmospay.lat/pricing?lang=es',
    page_path: '/pricing?lang=es',
    page_referrer: 'https://cosmospay.lat/',
  });
  assert.deepEqual(view.loaded, [`https://www.googletagmanager.com/gtag/js?id=${GA}`], 'gtag.js once the page has loaded');

  const english = run('https://cosmospay.lat/?invite=tok_123&next=%2Fdashboard');
  assert.deepEqual(english.config, { page_location: 'https://cosmospay.lat/', page_path: '/', page_referrer: '' });
  // A lang value is passed through encoded, never as markup.
  assert.equal(run('https://cosmospay.lat/about?lang=%3Cx%3E').config.page_location, 'https://cosmospay.lat/about?lang=%3Cx%3E');
});
