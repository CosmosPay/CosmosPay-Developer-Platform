import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GITHUB_ORG,
  articleNode,
  howToNode,
  itemListNode,
  chromeStoreListing,
  SDK_NPM,
  jsonLdText,
  monthlyPrice,
  orgId,
  organizationNode,
  planOffers,
  plansProductNode,
  productNodes,
  sameAsProfiles,
  serviceNode,
  webPageNodes,
  webSiteNode,
} from '@/lib/seo/schema';
import { PLAN_IDS, PLAN_SPECS } from '@/lib/plans';

const SITE = 'https://cosmospay.lat';
const SOCIAL = {
  x: 'https://x.com/CosmosPay',
  instagram: 'https://www.instagram.com/cosmospay.lat/',
  discord: 'https://discord.gg/Yb5MNcqQsp',
  whatsapp: 'https://wa.me/5493874732727',
  linkedin: 'https://www.linkedin.com/company/cosmospay/',
};

test('sameAs keeps the profiles, drops the chat link, and adds GitHub and npm', () => {
  const sameAs = sameAsProfiles(SOCIAL);
  assert.ok(!sameAs.some((u) => u.includes('wa.me')));
  for (const url of [SOCIAL.x, SOCIAL.instagram, SOCIAL.discord, SOCIAL.linkedin, GITHUB_ORG, SDK_NPM]) assert.ok(sameAs.includes(url), url);
});

test('the organization is one entity with a stable @id, a logo and its contact', () => {
  const org = organizationNode(SITE, sameAsProfiles(SOCIAL));
  assert.equal(org['@id'], 'https://cosmospay.lat/#organization');
  assert.equal(org['@id'], orgId(SITE));
  assert.equal(org.url, 'https://cosmospay.lat/');
  assert.equal((org.logo as { url: string }).url, 'https://cosmospay.lat/android-chrome-512x512.png');
  assert.equal(org.email, 'organization@cosmospay.lat');
  assert.ok(!('address' in org), 'no address: the source states none');
  assert.ok(!('aggregateRating' in org));
});

test('a page links to its site and, below the home, to its breadcrumb trail', () => {
  const [page, crumbs] = webPageNodes({
    url: 'https://cosmospay.lat/pricing?lang=es',
    name: 'Precios | Cosmos Pay',
    lang: 'es',
    origin: SITE,
    breadcrumb: [
      { name: 'Inicio', url: 'https://cosmospay.lat/?lang=es' },
      { name: 'Precios', url: 'https://cosmospay.lat/pricing?lang=es' },
    ],
    mainEntity: 'https://cosmospay.lat/pricing#product',
  });
  assert.equal(page['@id'], 'https://cosmospay.lat/pricing?lang=es#webpage');
  assert.deepEqual(page.isPartOf, { '@id': 'https://cosmospay.lat/#website' });
  assert.deepEqual(page.breadcrumb, { '@id': crumbs['@id'] });
  assert.deepEqual(page.mainEntity, { '@id': 'https://cosmospay.lat/pricing#product' });
  assert.equal(crumbs['@type'], 'BreadcrumbList');
  assert.equal((crumbs.itemListElement as unknown[]).length, 2);
  // The home has no trail.
  assert.equal(webPageNodes({ url: `${SITE}/`, name: 'Cosmos Pay', lang: 'en', origin: SITE }).length, 1);
  // A FAQ page is a WebPage and a FAQPage.
  assert.deepEqual(webPageNodes({ url: `${SITE}/faq`, name: 'FAQ', lang: 'en', origin: SITE, types: ['WebPage', 'FAQPage'] })[0]['@type'], ['WebPage', 'FAQPage']);
  // The about page is an AboutPage whose main entity is the organisation itself.
  const [about] = webPageNodes({ url: `${SITE}/about?lang=en`, name: 'About Cosmos Pay', lang: 'en', origin: SITE, types: ['AboutPage'], mainEntity: `${SITE}/#organization` });
  assert.equal(about['@type'], 'AboutPage');
  assert.deepEqual(about.mainEntity, { '@id': 'https://cosmospay.lat/#organization' });
});

test('the website names its languages and its publisher', () => {
  const site = webSiteNode({ origin: SITE, name: 'Cosmos Pay', site: SITE, langs: ['en', 'es'] });
  assert.equal(site['@id'], 'https://cosmospay.lat/#website');
  assert.deepEqual(site.inLanguage, ['en', 'es']);
  assert.deepEqual(site.publisher, { '@id': 'https://cosmospay.lat/#organization' });
});

test('only plans with a fixed monthly price become offers, at the price plans.ts states', () => {
  assert.equal(monthlyPrice('$33/mo'), 33);
  assert.equal(monthlyPrice('1.5% + 18¢'), null);
  assert.equal(monthlyPrice('Custom'), null);
  const offers = planOffers(`${SITE}/pricing`, SITE);
  const priced = PLAN_IDS.filter((id) => monthlyPrice(PLAN_SPECS[id].price) !== null);
  assert.ok(priced.length > 0);
  assert.equal(offers.length, priced.length);
  for (const [i, id] of priced.entries()) {
    const offer = offers[i] as Record<string, unknown>;
    assert.equal(offer.price, String(monthlyPrice(PLAN_SPECS[id].price)));
    assert.equal(offer.priceCurrency, 'USD');
    assert.ok(String(offer.description).startsWith(PLAN_SPECS[id].perTx), id);
  }
  assert.ok(!offers.some((o) => /community|starter|enterprise/i.test(String(o.name))), 'no free, rate-only or custom plan as an offer');
  const product = plansProductNode({ url: `${SITE}/pricing`, site: SITE, description: 'Plans', image: `${SITE}/og-image.png` });
  assert.equal(product['@id'], 'https://cosmospay.lat/pricing#product');
  assert.ok(!('aggregateRating' in product) && !('review' in product));
});

test('the home names the API, the SDK and the wallet, with no offer and no rating', () => {
  const nodes = productNodes({
    site: SITE,
    docs: 'https://dev.cosmospay.lat/docs/',
    apiBase: 'https://api.cosmospay.lat/cosmos-api',
    wallet: { version: '1.8.0', webApp: 'https://cosmospay.lat/wallet/', chromeStore: 'https://chromewebstore.google.com/detail/x/abc' },
  });
  assert.deepEqual(nodes.map((n) => n['@type']), ['WebAPI', 'SoftwareSourceCode', 'SoftwareApplication']);
  const wallet = nodes[2];
  assert.equal(wallet.softwareVersion, '1.8.0');
  for (const node of nodes) {
    assert.ok(!('offers' in node) && !('aggregateRating' in node), String(node['@type']));
    assert.deepEqual(Object.values(node).filter((v) => typeof v === 'object' && v && '@id' in v && (v as { '@id': string })['@id'].endsWith('#organization')).length > 0, true);
  }
  const api = nodes[0];
  assert.equal(api.documentation, 'https://dev.cosmospay.lat/docs/');
  assert.equal(api.url, 'https://dev.cosmospay.lat/docs/api/');
});

test('a service is provided by the organization', () => {
  const s = serviceNode({ id: 'https://payments.cosmospay.lat/#service', name: 'Cosmos Pay Payments', serviceType: 'Payment gateway', description: 'd', url: 'https://payments.cosmospay.lat/', site: SITE });
  assert.deepEqual(s.provider, { '@id': 'https://cosmospay.lat/#organization' });
});

test('the script text cannot close its element', () => {
  const text = jsonLdText([{ '@type': 'Thing', name: '</script><script>alert(1)</script>' }]);
  assert.ok(!text.includes('<'));
  assert.deepEqual(JSON.parse(text)['@graph'][0].name, '</script><script>alert(1)</script>');
  assert.equal(JSON.parse(text)['@context'], 'https://schema.org');
});

test('the Chrome Web Store link is the listing by id, without its slug or interface language', () => {
  assert.equal(
    chromeStoreListing('https://chromewebstore.google.com/detail/cosmos-pay-%E2%80%94-stellar-wall/jibiahkbhhmddnahglhffkejcfhalbgj?hl=es'),
    'https://chromewebstore.google.com/detail/jibiahkbhhmddnahglhffkejcfhalbgj',
  );
  assert.equal(chromeStoreListing('https://example.com/other'), 'https://example.com/other');
});

const PAY = 'https://payments.cosmospay.lat';

test('a guide is an article by the shared organization, the main content of its page', () => {
  const url = `${PAY}/learn/accept-usdc-payments?lang=es`;
  const node = articleNode({
    url,
    type: 'TechArticle',
    headline: 'Cómo aceptar pagos en USDC',
    description: 'Una guía.',
    lang: 'es',
    origin: PAY,
    site: SITE,
    published: '2026-11-01',
    modified: '2026-11-02',
  });
  assert.equal(node['@type'], 'TechArticle');
  assert.equal(node['@id'], `${url}#article`);
  assert.equal(node.inLanguage, 'es');
  assert.deepEqual(node.author, { '@id': 'https://cosmospay.lat/#organization' });
  assert.deepEqual(node.publisher, node.author);
  assert.deepEqual(node.mainEntityOfPage, { '@id': `${url}#webpage` });
  assert.deepEqual(node.isPartOf, { '@id': `${PAY}/#website` });
  assert.equal(node.datePublished, '2026-11-01');
  assert.equal(node.dateModified, '2026-11-02');
  assert.equal('image' in node, false);
});

test('a HowTo numbers its steps and points each at its anchor on the page', () => {
  const url = `${PAY}/learn/whatsapp-payment-links`;
  const node = howToNode({ url, name: 'Send a link', description: 'd', lang: 'en', steps: [{ name: 'Create', text: 'a' }, { name: 'Send', text: 'b' }] });
  const steps = node.step as Record<string, unknown>[];
  assert.equal(steps.length, 2);
  assert.deepEqual(steps[1], { '@type': 'HowToStep', position: 2, name: 'Send', text: 'b', url: `${url}#step-2` });
});

test('a hub lists its pages in order', () => {
  const list = itemListNode(`${PAY}/learn#guides`, [{ name: 'A', url: `${PAY}/learn/a` }, { name: 'B', url: `${PAY}/learn/b` }]);
  assert.equal(list.numberOfItems, 2);
  assert.deepEqual((list.itemListElement as Record<string, unknown>[])[0], { '@type': 'ListItem', position: 1, name: 'A', url: `${PAY}/learn/a` });
});
