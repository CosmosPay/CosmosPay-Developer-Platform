// Boot the compiled server and make one real request against it.
//
// WHY THIS EXISTS. `astro build` can emit a dist/ that cannot be imported. The build
// bundles src/ but leaves dependencies EXTERNAL, so nothing resolves `import … from
// 'cookie'` until node loads the entry, and a dependency that renamed an export
// between two versions produces a green build and a server that dies on its first boot
// with `does not provide an export named 'parse'`. That is exactly what shipped: astro
// 7.3 moved to cookie@2, which renamed `parse`/`serialize` to
// `parseCookie`/`stringifyCookie`. A build-only CI cannot see it. This can.
//
// WHAT IT ASSERTS. A bad external import kills the process during startup, before it
// ever listens, so "boots, stays up, and answers an HTTP request" is a complete guard
// for that class. The probe is `/api/openapi.json`: no database, no upstream.
//
// It accepts 200 OR 404, and that is deliberate. `apiDocsEnabled` is
// `import.meta.env.DEV || API_DOCS_ENABLED`, and API_DOCS_ENABLED is an astro:env field
// with `access: 'public'`, so it is INLINED AT BUILD, not read at runtime (see src/lib/api-docs.ts).
// So a production build serves 404 here and no runtime env can change it. Both statuses
// prove the same thing: the entry and its chunks resolved and the router ran. Gating on
// 200 would only mean CI had to build with a flag production does not use, making the
// artifact under test differ from the artifact that ships. When the spec IS served, the
// document is validated too: generating it eagerly imports every
// `src/schemas/**/openapi.ts` (see lib/openapi/auto-load.ts).
//
// READINESS IS TIED TO OUR CHILD, NOT TO THE PORT. The first version of this script
// polled the port until something answered, and a stale server left listening by an
// earlier run answered for it, so it reported a green boot for a dist/ that could not
// be imported at all. A smoke test that can pass while the thing it tests is dead is
// worse than no smoke test. Now the port is checked to be free BEFORE spawning (an
// occupied port is a hard error, never a silent pass) and readiness comes from the
// child's own stdout.
//
// The env below is DUMMY. astro:env validates that the vars are present and typed at
// startup, not that they point anywhere real; nothing here connects to a database or
// to APISIX, so the values only have to satisfy the schema in astro.config.mjs.
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const entry = path.join(root, 'dist', 'server', 'entry.mjs');
const HOST = '127.0.0.1';
const PORT = Number(process.env.SMOKE_PORT || 4399);
const BOOT_TIMEOUT_MS = 60_000;
/* An IndexNow key of the protocol's shape (src/lib/seo/indexnow.ts), only for this run. */
const SMOKE_INDEXNOW_KEY = 'smoke-indexnow-key-0123';

if (!existsSync(entry)) {
  console.error(`[smoke] ${entry} not found; run \`npm run build\` first.`);
  process.exit(1);
}

/** Resolves true when something is already listening on the port. */
function portInUse() {
  return new Promise((resolve) => {
    const socket = net
      .connect({ host: HOST, port: PORT })
      .setTimeout(1500)
      .on('connect', () => (socket.destroy(), resolve(true)))
      .on('timeout', () => (socket.destroy(), resolve(false)))
      .on('error', () => resolve(false));
  });
}

if (await portInUse()) {
  console.error(
    `[smoke] ${HOST}:${PORT} is already in use. Refusing to run: a stale listener would answer ` +
      `the probe and turn a broken build into a green check. Free the port (or set SMOKE_PORT).`,
  );
  process.exit(1);
}

const env = {
  ...process.env,
  HOST,
  PORT: String(PORT),
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://user:pass@127.0.0.1:5432/db',
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || 'smoke-secret',
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || 'https://smoke.invalid',
  PUBLIC_BETTER_AUTH_URL: process.env.PUBLIC_BETTER_AUTH_URL || 'https://smoke.invalid',
  AUTHENTIK_CLIENT_ID: process.env.AUTHENTIK_CLIENT_ID || 'smoke',
  AUTHENTIK_CLIENT_SECRET: process.env.AUTHENTIK_CLIENT_SECRET || 'smoke',
  AUTHENTIK_DISCOVERY_URL:
    process.env.AUTHENTIK_DISCOVERY_URL || 'https://smoke.invalid/.well-known/openid-configuration',
  APISIX_URL: process.env.APISIX_URL || 'http://127.0.0.1:9180',
  APISIX_ADMIN_KEY: process.env.APISIX_ADMIN_KEY || 'smoke',
  APISSIX_ROUTE_ID: process.env.APISSIX_ROUTE_ID || 'smoke',
  COSMOS_API_URL: process.env.COSMOS_API_URL || 'http://127.0.0.1:3000',
  COSMOS_API_ENTRY: process.env.COSMOS_API_ENTRY || '/v1',
  COSMOS_API_REWRITE: process.env.COSMOS_API_REWRITE || '/',
  // Always this one: the key file check below asks for exactly it.
  INDEXNOW_KEY: SMOKE_INDEXNOW_KEY,
};

const server = spawn(process.execPath, [entry], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });

let output = '';
let settled = false;
let resolveReady;
const ready = new Promise((r) => (resolveReady = r));

/** Print whatever the server said before dying; the import error lives in there. */
function fail(message) {
  if (settled) return;
  settled = true;
  console.error(`[smoke] ${message}`);
  if (output.trim()) console.error(`[smoke] server output:\n${output.trim()}`);
  server.kill();
  process.exit(1);
}

function absorb(chunk) {
  output += chunk;
  // @astrojs/node standalone announces itself once the HTTP server is up. This (not a
  // successful connection to the port) is what proves OUR process is the one serving.
  if (/Server listening on/i.test(output)) resolveReady(true);
}
server.stdout.on('data', absorb);
server.stderr.on('data', absorb);

// A server that exits before the probe has failed, whatever the code: the standalone
// entry is supposed to stay up serving requests.
server.on('exit', (code) => fail(`server exited early with code ${code}`));
server.on('error', (err) => fail(`could not spawn the server: ${err.message}`));

const timedOut = Symbol('timeout');
const outcome = await Promise.race([
  ready,
  new Promise((r) => setTimeout(() => r(timedOut), BOOT_TIMEOUT_MS)),
]);
if (outcome === timedOut) fail(`server never reported "Server listening" within ${BOOT_TIMEOUT_MS}ms`);

const url = `http://${HOST}:${PORT}/api/openapi.json`;
const res = await fetch(url, { signal: AbortSignal.timeout(15_000) }).catch((e) =>
  fail(`GET /api/openapi.json never completed: ${e.message}`),
);

if (res.status !== 200 && res.status !== 404) {
  fail(`GET /api/openapi.json returned ${res.status}; expected 200 (spec served) or 404 (spec disabled)`);
}

let detail = 'spec disabled by API_DOCS_ENABLED (404), boot and routing verified';
if (res.status === 200) {
  const body = await res.json().catch(() => null);
  if (!body || typeof body.openapi !== 'string') {
    fail(`GET /api/openapi.json did not return an OpenAPI document (got: ${JSON.stringify(body)?.slice(0, 200)})`);
  }
  const paths = Object.keys(body.paths || {}).length;
  if (paths === 0) fail('the OpenAPI document has no paths; the schema auto-load found nothing');
  detail = `served ${paths} documented paths`;
}

// The merchant embed is a static file `npm run build` bundles into public/ BEFORE astro build
// copies public/ into dist/client. Served here, the order of that chain held; a 404 means
// merchants' pages would load nothing from /embed/cosmos-pay.js.
const embed = await fetch(`http://${HOST}:${PORT}/embed/cosmos-pay.js`, { signal: AbortSignal.timeout(15_000) }).catch(
  (e) => fail(`GET /embed/cosmos-pay.js never completed: ${e.message}`),
);
const embedBody = embed.status === 200 ? await embed.text() : '';
if (!/javascript/i.test(embed.headers.get('content-type') || '') || !embedBody.includes('cosmos-pay-checkout')) {
  fail(`GET /embed/cosmos-pay.js returned ${embed.status} (${embed.headers.get('content-type')}); expected the embed bundle. Did the build run embed:build before astro build?`);
}
detail += `; embed bundle served (${(embedBody.length / 1024).toFixed(1)} KiB)`;

// HOST ROUTING. One process answers three domains, and src/middleware.ts routes by the host
// of Request.url. Astro takes that host from the Host header only for the domains in
// `security.allowedDomains`; for any other it falls back to the server's own address. With the
// list empty, every request behind nginx was the platform and the company site's pages answered
// a 301 to themselves (v0.9.0 shipped like that). The hosts come from the build's own manifest,
// because the PUBLIC_* origins are inlined at build and this step may not see the same env.
// Each one is asked for /pricing, which only the company site serves: no host may answer with a
// redirect to the very URL it was asked, and one of them must serve the page.
const trusted = trustedHosts();
if (trusted.length === 0) {
  fail('the build trusts no Host header (security.allowedDomains is empty): every domain would be routed as the platform');
}
let servedOn = null;
for (const host of trusted) {
  const res = await getWithHost('/pricing', host).catch((e) => fail(`GET https://${host}/pricing never completed: ${e.message}`));
  const self = `https://${host}/pricing`;
  if (res.status >= 300 && res.status < 400 && res.location === self) {
    fail(`GET ${self} redirected to itself (${res.status}): the Host header was not honoured`);
  }
  if (res.status === 200) servedOn = host;
}
if (!servedOn) fail(`no trusted host (${trusted.join(', ')}) served /pricing: the company site is unreachable`);
detail += `; host routing verified (${trusted.join(', ')}; /pricing on ${servedOn})`;

// INDEXNOW KEY FILE. Every domain must answer /<INDEXNOW_KEY>.txt with the key itself
// (src/pages/[key].txt.ts, let through by src/lib/hosts.ts on every domain), or IndexNow refuses
// that host's submissions (403). The key is read at runtime, so the env above reaches it. Any
// other name is a 404. The www host redirects every path to the apex, so it is not asked.
const keyHosts = trusted.filter((host) => !host.startsWith('www.'));
for (const host of keyHosts) {
  const own = await getWithHost(`/${SMOKE_INDEXNOW_KEY}.txt`, host).catch((e) => fail(`GET https://${host}/<key>.txt never completed: ${e.message}`));
  if (own.status !== 200 || own.body !== SMOKE_INDEXNOW_KEY) {
    fail(`GET https://${host}/${SMOKE_INDEXNOW_KEY}.txt returned ${own.status} "${own.body.slice(0, 80)}"; expected 200 with the key`);
  }
  const other = await getWithHost('/0123456789abcdef.txt', host).catch((e) => fail(`GET https://${host}/0123456789abcdef.txt never completed: ${e.message}`));
  if (other.status !== 404) fail(`GET https://${host}/0123456789abcdef.txt returned ${other.status}; expected 404 for a name that is not the key`);
}
detail += `; IndexNow key file served on ${keyHosts.length} hosts`;

// THE PAGES AS MARKDOWN. /llms-full.txt answers on the company site and the gateway with every
// indexable page in one file (the platform redirects it to the docs' own), and each of those hosts
// answers its home as Markdown at /index.md (src/lib/seo/page-markdown.ts). Both are built from the
// catalogs at request time, so a builder that throws on the built bundle answers 500 here.
let fullOn = 0;
for (const host of keyHosts) {
  const full = await getWithHost('/llms-full.txt', host).catch((e) => fail(`GET https://${host}/llms-full.txt never completed: ${e.message}`));
  if (full.status === 301 && /\/docs\/llms-full\.txt$/.test(full.location ?? '')) continue;
  if (full.status !== 200 || !/^text\/plain/.test(full.type ?? '') || !/^# Cosmos Pay/.test(full.body) || !/\nURL: https?:\/\//.test(full.body)) {
    fail(`GET https://${host}/llms-full.txt returned ${full.status} (${full.type}); expected the pages as text, or a 301 to the docs' own`);
  }
  const home = await getWithHost('/index.md', host).catch((e) => fail(`GET https://${host}/index.md never completed: ${e.message}`));
  if (home.status !== 200 || !/^text\/markdown/.test(home.type ?? '') || !/^# .+\n\nURL: /.test(home.body)) {
    fail(`GET https://${host}/index.md returned ${home.status} (${home.type}); expected the home as Markdown`);
  }
  fullOn++;
}
if (fullOn === 0) fail(`no trusted host (${keyHosts.join(', ')}) served /llms-full.txt`);
detail += `; llms-full.txt and /index.md served on ${fullOn} hosts`;

// AGENT DISCOVERY FILES. Every domain answers /auth.md (how an agent authenticates: Markdown whose
// H1 names auth.md, src/lib/seo/auth-md.ts) and the Agent Skills Discovery index
// (src/lib/seo/agent-skills.ts), each as that domain (src/lib/hosts.ts SHARED_PATHS). A route
// shadowed by src/pages/[...page].md.ts, or a builder that throws on the bundle, fails here.
for (const host of keyHosts) {
  const auth = await getWithHost('/auth.md', host).catch((e) => fail(`GET https://${host}/auth.md never completed: ${e.message}`));
  if (auth.status !== 200 || !/^text\/markdown/.test(auth.type ?? '') || !/^# [^\n]*auth\.md\n/.test(auth.body)) {
    fail(`GET https://${host}/auth.md returned ${auth.status} (${auth.type}); expected Markdown opening with an H1 that names auth.md`);
  }
  const skills = await getWithHost('/.well-known/agent-skills/index.json', host).catch((e) => fail(`GET https://${host}/.well-known/agent-skills/index.json never completed: ${e.message}`));
  let index = null;
  try {
    index = JSON.parse(skills.body);
  } catch {}
  if (skills.status !== 200 || !/^application\/json/.test(skills.type ?? '') || index?.$schema !== 'https://schemas.agentskills.io/discovery/0.2.0/schema.json' || !index.skills?.length) {
    fail(`GET https://${host}/.well-known/agent-skills/index.json returned ${skills.status} (${skills.type}); expected the v0.2.0 skills index`);
  }
}
detail += `; auth.md and the agent skills index served on ${keyHosts.length} hosts`;

// SHARE CARDS. Every address in the company site's and the gateway's sitemaps (each page in each
// language) names its own card as og:image and twitter:image, 1200x630 PNG with its alt
// (src/lib/seo/og-image-urls.ts). The cards are drawn by `npm run og:build` BEFORE astro build and
// fingerprinted by Vite under /_astro/; a page naming its fallback (the brand card, the hero's
// poster) means that step did not run. Each card answers 200 image/png, 1200x630, with the
// immutable Cache-Control /_astro/ gets. Payment links keep the brand card, and the company's
// /swaps names the gateway's card (its canonical page).
//
// The same pass reads each page's links and JSON-LD: no link to a docs page without its trailing
// slash (nginx answers that form with a 301; src/lib/urls.ts docsLink), no HowTo node (Google
// retired its rich results), and one Organization node, byte for byte the same on every page.
const cards = new Map();
let cardPages = 0;
let paymentsHost = null;
let devHost = null;
let organization = null;
let homeProducts = null;
for (const host of keyHosts) {
  const map = await getWithHost('/sitemap.xml', host).catch((e) => fail(`GET https://${host}/sitemap.xml never completed: ${e.message}`));
  if (map.status !== 200) fail(`GET https://${host}/sitemap.xml returned ${map.status}`);
  if (!map.body.includes('<urlset')) {
    devHost = host; // the platform's is an index of the docs' own
    continue;
  }
  for (const [, loc] of map.body.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const url = new URL(loc.replace(/&amp;/g, '&'));
    if (!trusted.includes(url.host)) fail(`${host}/sitemap.xml lists ${url.href}, on a host the build does not trust`);
    const page = await getWithHost(`${url.pathname}${url.search}`, url.host).catch((e) => fail(`GET ${url.href} never completed: ${e.message}`));
    if (page.status !== 200) fail(`GET ${url.href} returned ${page.status}; expected the page`);
    const share = shareTags(page.body);
    const image = share.image ? new URL(share.image) : null;
    if (!image || image.host !== url.host || !/^\/_astro\/[^/]+\.png$/.test(image.pathname)) {
      fail(`${url.href} names og:image ${share.image}; expected its own card under /_astro/ on ${url.host} (did npm run og:build run before astro build?)`);
    }
    if (share.twitter !== share.image || share.width !== '1200' || share.height !== '630' || share.type !== 'image/png' || !share.alt?.startsWith('Cosmos Pay') || share.twitterAlt !== share.alt) {
      fail(`${url.href}: share tags ${JSON.stringify(share)}; expected twitter:image = og:image, 1200x630 image/png, an alt`);
    }
    if ([...cards.values()].some((c) => c.page !== url.href && c.image === image.href)) fail(`${url.href} shares its card ${image.href} with another page`);
    cards.set(url.href, { page: url.href, image: image.href, host: url.host });
    if (url.pathname === '/stellar') paymentsHost = url.host;
    cardPages++;
    // Its Link header (src/lib/seo/link-headers.ts) names the discovery files and the same Markdown
    // version as its <link rel="alternate" type="text/markdown">.
    const alternate = [...page.body.matchAll(/<link\b[^>]*>/g)]
      .map(([tag]) => tag)
      .find((tag) => /rel="alternate"/.test(tag) && /type="text\/markdown"/.test(tag))
      ?.match(/href="([^"]+)"/)?.[1]
      ?.replace(/&amp;/g, '&');
    for (const rel of ['rel="describedby"', 'rel="api-catalog"', 'rel="service-desc"', 'rel="service-doc"', 'rel="sitemap"']) {
      if (!page.link?.includes(rel)) fail(`${url.href} answers Link ${page.link}; expected ${rel}`);
    }
    if (!alternate || !page.link.includes(`<${alternate}>; rel="alternate"; type="text/markdown"`)) {
      fail(`${url.href} answers Link ${page.link}; expected its Markdown version ${alternate}`);
    }
    const slashless = slashlessDocsLinks(page.body, url.href);
    if (slashless.length) fail(`${url.href} links ${slashless.length} docs page(s) without the trailing slash (a 301 each): ${slashless.slice(0, 5).join(', ')}`);
    const graph = jsonLdNodes(page.body);
    if (graph.some((node) => typesOf(node).includes('HowTo'))) fail(`${url.href} publishes a HowTo node`);
    const org = graph.filter((node) => typesOf(node).includes('Organization'));
    if (org.length !== 1) fail(`${url.href} defines ${org.length} Organization nodes; expected the shared one`);
    organization ??= JSON.stringify(org[0]);
    if (JSON.stringify(org[0]) !== organization) fail(`${url.href} defines another Organization than the other pages`);
    if (url.host === servedOn && url.pathname === '/' && !url.search) homeProducts = graph;
  }
}
if (cardPages === 0) fail('no sitemap listed a page to check the share cards of');
for (const { image, host } of cards.values()) {
  const res = await getBinaryWithHost(new URL(image).pathname, host).catch((e) => fail(`GET ${image} never completed: ${e.message}`));
  const size = pngSize(res.body);
  if (res.status !== 200 || res.type !== 'image/png' || !/immutable/.test(res.cache ?? '') || size?.width !== 1200 || size?.height !== 630) {
    fail(`GET ${image} returned ${res.status} (${res.type}, ${res.cache}, ${JSON.stringify(size)}); expected a 1200x630 PNG cached as immutable`);
  }
}
if (paymentsHost) {
  const link = await getWithHost('/cmh4x2k9a0001l70g8v5q3z2w', paymentsHost).catch((e) => fail(`GET a payment link never completed: ${e.message}`));
  if (!/\/og-image\.png$/.test(shareTags(link.body).image ?? '')) fail(`a payment link names og:image ${shareTags(link.body).image}; expected the brand card`);
  const swaps = await getWithHost('/swaps', servedOn).catch((e) => fail(`GET https://${servedOn}/swaps never completed: ${e.message}`));
  const swapsImage = shareTags(swaps.body).image ?? '';
  if (swaps.status === 200 && cards.get(`https://${paymentsHost}/swaps`)?.image !== swapsImage) {
    fail(`https://${servedOn}/swaps names og:image ${swapsImage}; expected the gateway's /swaps card`);
  }
}
detail += `; share cards: ${cardPages} pages, each its own 1200x630 PNG and discovery Link header; no slashless docs link, no HowTo, one Organization`;

// THE DOCS (the static export under /docs on the platform): each page carries the company's
// Organization, the same node as every company and gateway page; the API reference and the docs
// home publish the Payments API and the SDK as the company home does, identical (when this build's
// docs root is the docs' own, dev.cosmospay.lat); the home has its BreadcrumbList; no page links a
// slashless docs path; and each page's Markdown answers at its address with .md, the one its
// <link rel="alternate" type="text/markdown"> names.
if (devHost && existsSync(path.join(root, 'dist', 'client', 'docs', 'index.html'))) {
  if (!homeProducts) fail(`the company home (https://${servedOn}/) was not in its sitemap`);
  const homeNode = (id) => homeProducts.find((node) => node['@id'] === id);
  // The company home's Payments API names its docs root; when it is this platform's own, the docs'
  // copies of the API and SDK nodes must match it byte for byte.
  const sameRoot = homeProducts.find((node) => typesOf(node).includes('WebAPI'))?.documentation === `https://${devHost}/docs/`;
  for (const docsPath of ['/docs/', '/docs/getting-started/', '/docs/api/payment-intents/', '/docs/es/']) {
    const res = await getWithHost(docsPath, devHost).catch((e) => fail(`GET ${docsPath} never completed: ${e.message}`));
    if (res.status !== 200) fail(`GET https://${devHost}${docsPath} returned ${res.status}`);
    const pageUrl = `https://${devHost}${docsPath}`;
    const slashless = slashlessDocsLinks(res.body, pageUrl);
    if (slashless.length) fail(`${pageUrl} links ${slashless.length} docs page(s) without the trailing slash: ${slashless.slice(0, 5).join(', ')}`);
    const graph = jsonLdNodes(res.body);
    const org = graph.filter((node) => typesOf(node).includes('Organization'));
    if (org.length !== 1 || JSON.stringify(org[0]) !== organization) fail(`${pageUrl} does not define the shared Organization node the company and gateway pages define`);
    if (graph.some((node) => typesOf(node).includes('HowTo'))) fail(`${pageUrl} publishes a HowTo node`);
    for (const node of graph.filter((n) => typesOf(n).some((t) => t === 'WebAPI' || t === 'SoftwareSourceCode'))) {
      const home = homeNode(node['@id']);
      if (!home) fail(`${pageUrl} publishes ${node['@id']}, which the company home does not`);
      if (sameRoot && JSON.stringify(home) !== JSON.stringify(node)) fail(`${pageUrl} publishes ${node['@id']} with other values than the company home`);
    }
    if (docsPath.endsWith('/docs/') && !graph.some((node) => typesOf(node).includes('BreadcrumbList'))) fail(`${pageUrl} has no BreadcrumbList`);
    const alternate = [...res.body.matchAll(/<link\b[^>]*>/g)].map(([tag]) => tag).find((tag) => /type="text\/markdown"/.test(tag))?.match(/href="([^"]+)"/)?.[1];
    if (!alternate || !/\.md$/.test(alternate)) fail(`${pageUrl} names no .md Markdown alternate (got ${alternate})`);
    const md = await getWithHost(new URL(alternate).pathname, devHost).catch((e) => fail(`GET ${alternate} never completed: ${e.message}`));
    if (md.status !== 200 || !/^text\/markdown/.test(md.type ?? '') || !/^# /.test(md.body)) fail(`GET ${alternate} returned ${md.status} (${md.type}); expected the page as Markdown`);
  }
  detail += '; docs: shared Organization and product nodes, BreadcrumbList on the home, .md pages served';
} else {
  detail += '; docs not built (no dist/client/docs), docs checks skipped';
}

settled = true;
server.removeAllListeners('exit');
server.kill();
console.log(`[smoke] OK: compiled server booted and answered on ${HOST}:${PORT}; ${detail}`);
process.exit(0);

/** The links of an HTML page (href attributes) that lead to a docs page on a host this build serves
 *  without the page's trailing slash: what src/lib/urls.ts docsLink never writes. Files (a name
 *  with an extension: llms.txt, openapi.json, page.md) are exempt. */
function slashlessDocsLinks(html, base) {
  const found = [];
  for (const [, raw] of html.matchAll(/\shref="([^"]+)"/g)) {
    let url;
    try {
      url = new URL(raw.replace(/&amp;/g, '&'), base);
    } catch {
      continue;
    }
    if (!trusted.includes(url.host) || (url.pathname !== '/docs' && !url.pathname.startsWith('/docs/'))) continue;
    const last = url.pathname.split('/').pop();
    if (!url.pathname.endsWith('/') && !last.includes('.')) found.push(url.href);
  }
  return [...new Set(found)];
}

/** Every node of every JSON-LD script on the page (each script one graph, or one node). */
function jsonLdNodes(html) {
  const nodes = [];
  for (const [, text] of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      fail(`a JSON-LD script does not parse: ${text.slice(0, 120)}`);
    }
    nodes.push(...(Array.isArray(data['@graph']) ? data['@graph'] : [data]));
  }
  return nodes;
}

/** A node's schema.org types, as a list. */
function typesOf(node) {
  return [].concat(node['@type'] ?? []);
}

/** The hostnames the build lists in security.allowedDomains, read from the serialized manifest. */
function trustedHosts() {
  for (const file of serverModules(path.join(root, 'dist', 'server'))) {
    const match = /"allowedDomains":(\[[^\]]*\])/.exec(readFileSync(file, 'utf8'));
    if (match) return JSON.parse(match[1]).map((pattern) => pattern.hostname).filter(Boolean);
  }
  fail('could not find allowedDomains in the built server manifest (dist/server)');
}

/** Every .mjs under dir, the top level first (the manifest is in entry.mjs or beside it). */
function serverModules(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = entries.filter((e) => e.isFile() && e.name.endsWith('.mjs')).map((e) => path.join(dir, e.name));
  const dirs = entries.filter((e) => e.isDirectory()).map((e) => path.join(dir, e.name));
  return [...files, ...dirs.flatMap(serverModules)];
}

/** The share tags of an HTML page (og:image and its size, type and alt; twitter:image and its alt). */
function shareTags(html) {
  const meta = (attr, name) => new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`).exec(html)?.[1]?.replace(/&amp;/g, '&');
  return {
    image: meta('property', 'og:image'),
    width: meta('property', 'og:image:width'),
    height: meta('property', 'og:image:height'),
    type: meta('property', 'og:image:type'),
    alt: meta('property', 'og:image:alt'),
    twitter: meta('name', 'twitter:image'),
    twitterAlt: meta('name', 'twitter:image:alt'),
  };
}

/** A PNG's width and height from its IHDR chunk, or null when the bytes are not a PNG. */
function pngSize(bytes) {
  if (bytes.length < 24 || bytes.readUInt32BE(0) !== 0x89504e47 || bytes.subarray(12, 16).toString('latin1') !== 'IHDR') return null;
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

/** getWithHost for a binary body: resolves the status, Content-Type, Cache-Control and the bytes. */
function getBinaryWithHost(pathname, host) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: HOST, port: PORT, path: pathname, method: 'GET', headers: { host, 'x-forwarded-proto': 'https' }, timeout: 15_000 },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve({ status: res.statusCode, type: res.headers['content-type'] ?? null, cache: res.headers['cache-control'] ?? null, body: Buffer.concat(chunks) }));
      },
    );
    req.on('timeout', () => req.destroy(new Error('timed out')));
    req.on('error', reject);
    req.end();
  });
}

/**
 * A GET with the Host header nginx would send (fetch may not set Host), without following
 * redirects. Resolves the status, the Location, Content-Type and Link headers and the body.
 */
function getWithHost(pathname, host) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: HOST, port: PORT, path: pathname, method: 'GET', headers: { host, 'x-forwarded-proto': 'https' }, timeout: 15_000 },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () =>
          resolve({ status: res.statusCode, location: res.headers.location ?? null, type: res.headers['content-type'] ?? null, link: res.headers.link ?? null, body }),
        );
      },
    );
    req.on('timeout', () => req.destroy(new Error('timed out')));
    req.on('error', reject);
    req.end();
  });
}
