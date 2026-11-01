// Build the Fumadocs (Next.js) docs subproject and copy its static export into the Astro
// portal's public/docs, so the portal serves the documentation at dev.cosmospay.lat/docs.
//
// The docs build (docs/package.json `prebuild`) regenerates the SDK + API content from the
// external repos WHEN THEY'RE PRESENT (otherwise it keeps the committed content/docs/{sdk,api} +
// openapi.json as-is; see generate-sdk/generate-api), syncs the shared navbar, then `next build`.
// So this always builds: on a production box (no external repos) it builds from the committed
// content. Output lands in docs/out (every route/asset prefixed by /docs via basePath), copied verbatim.
//
// `--check` skips the build and the copy: it only checks the export already in docs/out.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const docsDir = path.join(root, 'docs');
const outDir = path.join(docsDir, 'out');
const destDir = path.join(root, 'public', 'docs');
const checkOnly = process.argv.includes('--check');

if (!fs.existsSync(docsDir)) {
  console.error(`[build-docs] docs/ not found at ${docsDir}`);
  process.exit(1);
}

if (!checkOnly) {
  // Install docs deps on first run (fresh clone / CI) so the portal build is self-sufficient.
  // `npm ci` when the lockfile is there, so the versions CI BUILDS are the versions CI
  // AUDITED (`npm audit --prefix docs` reads docs/package-lock.json). `npm install` may
  // resolve past the lockfile and rewrite it mid-build, which would leave the audit a
  // statement about a tree that no longer exists. Fall back only when there is no lockfile.
  if (!fs.existsSync(path.join(docsDir, 'node_modules'))) {
    const locked = fs.existsSync(path.join(docsDir, 'package-lock.json'));
    console.log(`[build-docs] installing docs dependencies (${locked ? 'npm ci' : 'npm install'})…`);
    execSync(locked ? 'npm ci' : 'npm install', { cwd: docsDir, stdio: 'inherit' });
  }

  // Remove the previous export up-front: on Windows, Next's own cleanup of out/ can hit a
  // transient lock (OneDrive/AV) mid-build. Clearing it first (with retries) avoids that.
  fs.rmSync(outDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });

  console.log('[build-docs] building docs…');
  execSync('npm run build', { cwd: docsDir, stdio: 'inherit' });
}

if (!fs.existsSync(outDir)) {
  console.error(`[build-docs] expected static export at ${outDir} (did next build with output:export run?)`);
  process.exit(1);
}

// The files search engines and agents read besides the pages: served at /docs/<file>, linked
// from the pages, llms.txt and the AI page (index.md is the home's Markdown, written after the
// build by docs/scripts/write-markdown-pages.mjs). A route that silently stopped exporting would
// only show up as a 404 in production.
const PUBLISHED = ['sitemap.xml', 'llms.txt', 'llms-full.txt', 'openapi.json', 'index.md'];
const missing = PUBLISHED.filter((file) => !fs.existsSync(path.join(outDir, file)));
if (missing.length) {
  console.error(`[build-docs] the export is missing ${missing.join(', ')} (docs/src/app routes)`);
  process.exit(1);
}

checkIndexableUrls(outDir);
checkLinksAndMarkdown(outDir);
checkPageSizes(outDir);

if (checkOnly) process.exit(0);

fs.rmSync(destDir, { recursive: true, force: true });
fs.mkdirSync(path.dirname(destDir), { recursive: true });
fs.cpSync(outDir, destDir, { recursive: true });
console.log(`[build-docs] copied ${outDir} -> ${destDir}`);

/**
 * Every exported page's HTML stays under HTML_BUDGET. The API reference pages once weighed 0.8
 * to 1.9 MB each (the whole OpenAPI document serialized into every page, every schema rendered),
 * near Googlebot's 2 MB fetch limit and slow to parse; docs/README.md ("API reference page size")
 * says what keeps them small and what to do when the spec outgrows the budget. Exits 1 naming
 * each page over it.
 */
function checkPageSizes(out) {
  const HTML_BUDGET = 500 * 1000;
  const pages = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      if (entry.isDirectory()) return entry.name === '_next' ? [] : pages(path.join(dir, entry.name));
      return entry.name.endsWith('.html') ? [path.join(dir, entry.name)] : [];
    });
  const sizes = pages(out)
    .map((file) => ({ where: path.relative(out, file).split(path.sep).join('/'), bytes: fs.statSync(file).size }))
    .sort((a, b) => b.bytes - a.bytes);
  const kb = (bytes) => `${Math.round(bytes / 1000)} KB`;
  const over = sizes.filter(({ bytes }) => bytes > HTML_BUDGET);
  if (over.length) {
    console.error(
      `[build-docs] ${over.length} page(s) over the ${kb(HTML_BUDGET)} HTML budget (docs/README.md, "API reference page size"):\n` +
        over.map(({ where, bytes }) => `  ${where}: ${kb(bytes)}`).join('\n'),
    );
    process.exit(1);
  }
  console.log(`[build-docs] size check: ${sizes.length} pages under ${kb(HTML_BUDGET)} of HTML, the largest ${sizes[0]?.where} at ${kb(sizes[0]?.bytes ?? 0)}`);
}

/**
 * Every exported page links the docs at their canonical, trailing-slash addresses (nginx answers a
 * slashless docs path with a 301, a hop per link), and the Markdown its
 * <link rel="alternate" type="text/markdown"> names is a file of the export (/docs/<page>.md).
 * Exits 1 naming each offending page.
 */
function checkLinksAndMarkdown(out) {
  const files = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      if (entry.isDirectory()) return entry.name === '_next' ? [] : files(path.join(dir, entry.name));
      return entry.name === 'index.html' ? [path.join(dir, entry.name)] : [];
    });
  const home = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
  const root = /<link rel="canonical" href="([^"]+)"/.exec(home)?.[1];
  if (!root) {
    console.error('[build-docs] out/index.html has no canonical URL to resolve the docs links against');
    process.exit(1);
  }
  const rootUrl = new URL(root);
  const problems = [];
  let links = 0;
  let alternates = 0;
  for (const file of files(out)) {
    const where = path.relative(out, file).split(path.sep).join('/');
    const html = fs.readFileSync(file, 'utf8');
    const slashless = new Set();
    for (const [, raw] of html.matchAll(/\shref="([^"]+)"/g)) {
      let url;
      try {
        url = new URL(raw.replace(/&amp;/g, '&'), rootUrl);
      } catch {
        continue;
      }
      if (url.host !== rootUrl.host || (url.pathname !== rootUrl.pathname.replace(/\/$/, '') && !url.pathname.startsWith(rootUrl.pathname))) continue;
      links++;
      const last = url.pathname.split('/').pop();
      if (!url.pathname.endsWith('/') && !last.includes('.')) slashless.add(raw);
    }
    if (slashless.size) problems.push(`  ${where}: links ${[...slashless].slice(0, 5).join(', ')} without the trailing slash`);
    const head = html.slice(0, Math.max(0, html.indexOf('</head>')) || html.length);
    const markdown = [...head.matchAll(/<link\b[^>]*>/g)].map(([tag]) => tag).find((tag) => /type="text\/markdown"/.test(tag))?.match(/href="([^"]+)"/)?.[1];
    if (!markdown) continue;
    alternates++;
    const target = new URL(markdown);
    const rest = target.pathname.startsWith(rootUrl.pathname) ? target.pathname.slice(rootUrl.pathname.length) : null;
    if (target.host !== rootUrl.host || !rest || !rest.endsWith('.md') || !fs.existsSync(path.join(out, ...rest.split('/').map(decodeURIComponent)))) {
      problems.push(`  ${where}: its Markdown alternate ${markdown} is not a .md file of the export`);
    }
  }
  if (problems.length) {
    console.error(`[build-docs] ${problems.length} page(s) with a slashless docs link or a missing Markdown file:\n${problems.join('\n')}`);
    process.exit(1);
  }
  console.log(`[build-docs] links check: ${links} docs links, all at their trailing-slash address; ${alternates} Markdown alternates, all exported`);
}

/**
 * Every URL the sitemap names (as a <loc> or an xhtml:link alternate) and every page's
 * <link rel="alternate" hreflang> must be a page search engines may index: an exported HTML
 * file, without a robots noindex, whose canonical is that same URL. A locale lists only its real
 * translations; the English copies exported under its prefix are noindex and canonical to the
 * English page (isTranslation in docs/src/lib/source.ts), so one of them listed here would ask
 * crawlers to index a page that refuses it. Exits 1 naming each offending URL.
 */
function checkIndexableUrls(out) {
  const decode = (value) =>
    value
      .replace(/&quot;/g, '"')
      .replace(/&#x27;|&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
  const attributes = (tag) =>
    Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)].map(([, name, value]) => [name.toLowerCase(), decode(value)]));
  const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map(([tag]) => attributes(tag));

  // Only the <head> is read: the metadata is there, and a canonical missing from it (say,
  // metadata streamed into the body) fails the check instead of passing it unread.
  const heads = new Map();
  const headOf = (file) => {
    if (!heads.has(file)) {
      const html = fs.readFileSync(file, 'utf8');
      const end = html.indexOf('</head>');
      heads.set(file, end < 0 ? html : html.slice(0, end));
    }
    return heads.get(file);
  };
  const pages = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      if (entry.isDirectory()) return entry.name === '_next' ? [] : pages(path.join(dir, entry.name));
      return entry.name === 'index.html' ? [path.join(dir, entry.name)] : [];
    });
  const canonicalOf = (head) => tags(head, 'link').find((link) => link.rel === 'canonical')?.href;

  // The docs root URL is the home page's own canonical (https://dev.cosmospay.lat/docs/).
  const rootUrl = canonicalOf(headOf(path.join(out, 'index.html')));
  if (!rootUrl?.endsWith('/')) {
    console.error('[build-docs] out/index.html has no canonical URL ending in "/" to resolve the docs URLs against');
    process.exit(1);
  }

  /** @type {Map<string, Set<string>>} each listed URL and where it is listed */
  const listed = new Map();
  const list = (url, where) => {
    if (!listed.has(url)) listed.set(url, new Set());
    listed.get(url).add(where);
  };

  const sitemap = fs.readFileSync(path.join(out, 'sitemap.xml'), 'utf8');
  const locs = [...sitemap.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map(([, url]) => decode(url));
  if (!locs.length) {
    console.error('[build-docs] sitemap.xml lists no <loc>');
    process.exit(1);
  }
  for (const url of locs) list(url, 'sitemap.xml');
  for (const link of tags(sitemap, 'xhtml:link')) if (link.href) list(link.href, 'sitemap.xml (alternate)');

  const pageFiles = pages(out);
  let hreflangLinks = 0;
  for (const file of pageFiles) {
    const where = path.relative(out, file).split(path.sep).join('/');
    for (const link of tags(headOf(file), 'link')) {
      if (link.rel !== 'alternate' || !link.hreflang || !link.href) continue;
      hreflangLinks++;
      list(link.href, `${where} (hreflang ${link.hreflang})`);
    }
  }

  const problems = [];
  for (const [url, where] of listed) {
    const fail = (reason) => problems.push(`  ${url}: ${reason} (listed in ${[...where].slice(0, 3).join(', ')}${where.size > 3 ? `, +${where.size - 3} more` : ''})`);
    if (!url.startsWith(rootUrl)) {
      fail(`not under ${rootUrl}`);
      continue;
    }
    const rest = url.slice(rootUrl.length);
    if (/[?#]/.test(rest) || (rest && !rest.endsWith('/'))) {
      fail('not a page URL (a trailing-slash path with no query or fragment)');
      continue;
    }
    const file = path.join(out, ...rest.split('/').filter(Boolean).map(decodeURIComponent), 'index.html');
    if (!fs.existsSync(file)) {
      fail('no exported page');
      continue;
    }
    const head = headOf(file);
    const robots = tags(head, 'meta').find((meta) => /^(robots|googlebot)$/i.test(meta.name ?? '') && /noindex/i.test(meta.content ?? ''));
    if (robots) fail(`robots "${robots.content}"`);
    const canonical = canonicalOf(head);
    if (canonical !== url) fail(canonical ? `canonical is ${canonical}` : 'no canonical');
  }

  if (problems.length) {
    console.error(
      `[build-docs] ${problems.length} URL problem(s) in the sitemap or the hreflang links; every URL listed must be an exported, indexable page canonical to itself:\n${problems.join('\n')}`,
    );
    process.exit(1);
  }
  console.log(
    `[build-docs] sitemap + hreflang check: ${locs.length} sitemap URLs and ${hreflangLinks} hreflang links on ${pageFiles.length} pages, all indexable and self-canonical`,
  );
}
