/* indexnow.mjs: tell the IndexNow engines (Bing, which also feeds ChatGPT search and Copilot,
   Yandex, Seznam, Naver, Yep) which URLs of the three domains exist or changed, right after a
   deploy, instead of waiting for their next crawl.

   WHAT IT DOES. For each domain (PUBLIC_SITE_URL, PUBLIC_PAYMENTS_URL and PUBLIC_BETTER_AUTH_URL
   from .env, as the app reads them, else the production origins) it reads the LIVE /sitemap.xml,
   following a sitemap index (the platform's points at /docs/sitemap.xml), and keeps the URLs on
   that domain's host; with --since, only those whose <lastmod> is on or after that date (an entry
   without lastmod is left out: nothing says it changed). It checks the domain serves the key file
   (/<INDEXNOW_KEY>.txt, src/pages/[key].txt.ts), the engines' proof that the submission is ours.
   With --submit it then POSTs each domain's URLs to api.indexnow.org, in requests of at most
   10,000 URLs, and prints every answer (200 and 202 are taken; 403 key not found, 422 URLs not
   on the host, 429 too many requests).

   FROM THE SERVER ITSELF. Behind Cloudflare, the VPS's own requests for the sitemaps answered 403
   (2026-11-05: the release's submit sent nothing, while the same requests from a workstation got
   200). `--sitemaps-from http://127.0.0.1:4321` (or INDEXNOW_SITEMAPS_FROM) reads every sitemap
   from the app on that origin instead, the same path with the sitemap's host as the Host header,
   as the deploy's health checks do. The key file is still checked at the public address, as the
   engines will read it.

   DRY RUN BY DEFAULT. Without --submit it only reads (sitemaps and key files) and prints what it
   would send. It refuses to run without a valid INDEXNOW_KEY, and --submit refuses a domain whose
   key file does not answer with the key (the engines would answer 403) or whose origin is not a
   public https one (a local setup).

   Run after a deploy that changes indexable pages (the deploy must already serve the key):
     npm run indexnow                         # dry run: counts per domain
     npm run indexnow -- --since 2026-10-31   # only URLs whose lastmod is on or after that date
     npm run indexnow -- --only payments,dev  # some domains only (site, payments, dev)
     npm run indexnow -- --list               # print every URL too
     npm run indexnow -- --submit             # send
     npm run indexnow -- --submit --sitemaps-from http://127.0.0.1:4321   # on the server

   The parsing, filtering and batching are pure, in src/lib/seo/indexnow.ts
   (tests/unit/seoIndexNow.test.ts). */
import http from 'node:http';
import https from 'node:https';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import dotenv from 'dotenv';
import {
  INDEXNOW_ENDPOINT,
  MAX_URLS_PER_REQUEST,
  changedSince,
  describeStatus,
  inBatches,
  isIndexNowKey,
  isSubmittableOrigin,
  keyFileMatches,
  keyFilePath,
  onHost,
  parseSitemap,
  parseW3cDate,
  submissionPayload,
} from '@/lib/seo/indexnow';
import { normalizeOrigin } from '@/lib/urls';

const ROOT = resolve(import.meta.dirname, '..');
dotenv.config({ path: resolve(ROOT, '.env'), quiet: true });

const USAGE = `Usage: npm run indexnow -- [--submit] [--since <date>] [--only site,payments,dev] [--list] [--sitemaps-from <origin>]

  --submit                  send the URLs to IndexNow (without it: a dry run that only reads)
  --since <date>            only URLs whose sitemap lastmod is on or after <date> (2026-10-31 or ISO 8601)
  --only <areas>            only these domains: site (company), payments (gateway), dev (platform docs)
  --list                    print every URL that would be sent
  --sitemaps-from <origin>  read the sitemaps from the app at this origin (http://127.0.0.1:4321 on the
                            server), each with its domain as the Host header; also INDEXNOW_SITEMAPS_FROM`;

const TIMEOUT_MS = 30_000;
const USER_AGENT = 'CosmosPay-IndexNow (+https://dev.cosmospay.lat)';

let args;
try {
  args = parseArgs({
    options: {
      submit: { type: 'boolean', default: false },
      since: { type: 'string' },
      only: { type: 'string' },
      list: { type: 'boolean', default: false },
      'sitemaps-from': { type: 'string' },
      help: { type: 'boolean', short: 'h', default: false },
    },
  }).values;
} catch (error) {
  console.error(`${error.message}\n\n${USAGE}`);
  process.exit(2);
}
if (args.help) {
  console.log(USAGE);
  process.exit(0);
}

/* Read as the server reads it, so a key this accepts is the one /<key>.txt serves. */
const key = process.env.INDEXNOW_KEY;
if (!isIndexNowKey(key)) {
  console.error(
    'INDEXNOW_KEY is not set, or is not 8 to 128 letters, digits and "-". Generate one once:\n' +
      `  node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"\n` +
      'set it in .env (the server serves it at /<key>.txt; restart it so it reloads .env), deploy, then run this again.',
  );
  process.exit(1);
}

let since = null;
if (args.since !== undefined) {
  since = parseW3cDate(args.since);
  if (since === null) {
    console.error(`--since takes a date (2026-10-31) or an ISO 8601 time with its zone, not "${args.since}".`);
    process.exit(2);
  }
}

const DOMAINS = [
  { area: 'site', origin: process.env.PUBLIC_SITE_URL || 'https://cosmospay.lat' },
  { area: 'payments', origin: process.env.PUBLIC_PAYMENTS_URL || 'https://payments.cosmospay.lat' },
  { area: 'dev', origin: process.env.PUBLIC_BETTER_AUTH_URL || 'https://dev.cosmospay.lat' },
].map((d) => ({ ...d, origin: normalizeOrigin(d.origin) }));

let only = null;
if (args.only !== undefined) {
  only = new Set(args.only.split(',').map((a) => a.trim()).filter(Boolean));
  const unknown = [...only].filter((a) => !DOMAINS.some((d) => d.area === a));
  if (unknown.length > 0 || only.size === 0) {
    console.error(`--only takes site, payments and dev, comma-separated (got "${args.only}").`);
    process.exit(2);
  }
}

/* Several areas share one origin only in a local single-host setup: each origin once. */
const chosen = DOMAINS.filter((d) => !only || only.has(d.area));
const domains = chosen.filter((d, i) => chosen.findIndex((o) => o.origin === d.origin) === i);

/* Where the sitemaps are read from: the public origins, or the app itself (`--sitemaps-from`). */
const sitemapsFromRaw = args['sitemaps-from'] ?? process.env.INDEXNOW_SITEMAPS_FROM ?? '';
let sitemapsFrom = null;
if (sitemapsFromRaw) {
  try {
    const u = new URL(sitemapsFromRaw);
    if (!/^https?:$/.test(u.protocol) || u.pathname !== '/' || u.search || u.hash) throw new Error('not an origin');
    sitemapsFrom = u;
  } catch {
    console.error(`--sitemaps-from takes an http(s) origin such as http://127.0.0.1:4321, not "${sitemapsFromRaw}".`);
    process.exit(2);
  }
}

/** `n` and the word, plural unless n is 1. */
const count = (n, word) => `${n} ${word}${n === 1 ? '' : word.endsWith('h') ? 'es' : 's'}`;

async function get(url, init = {}) {
  return fetch(url, { ...init, headers: { 'User-Agent': USER_AGENT, ...init.headers }, signal: AbortSignal.timeout(TIMEOUT_MS) });
}

/**
 * A sitemap read from the app at `sitemapsFrom`: the same path and query, the sitemap's host as
 * the Host header (fetch drops a Host header, so node:http). Answers what `get` does: status,
 * headers.get(), text().
 */
function getFromApp(url, headers) {
  const target = new URL(url);
  const lib = sitemapsFrom.protocol === 'https:' ? https : http;
  return new Promise((resolveRes, reject) => {
    const req = lib.request(
      {
        host: sitemapsFrom.hostname,
        port: sitemapsFrom.port || undefined,
        path: `${target.pathname}${target.search}`,
        method: 'GET',
        headers: { ...headers, 'User-Agent': USER_AGENT, Host: target.host, 'X-Forwarded-Proto': target.protocol.replace(':', '') },
        timeout: TIMEOUT_MS,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          resolveRes({ status: res.statusCode, headers: { get: (n) => res.headers[n.toLowerCase()] ?? null }, text: async () => body });
        });
      },
    );
    req.on('timeout', () => req.destroy(new Error(`no answer in ${TIMEOUT_MS / 1000} s`)));
    req.on('error', reject);
    req.end();
  });
}

/**
 * Every entry of the domain's sitemap, a sitemap index followed one level down (the protocol
 * allows no index of indexes). Each sitemap read is reported, and so is any that failed.
 */
async function readSitemaps(origin) {
  const read = [];
  const errors = [];
  const entries = [];
  const seen = new Set();
  const visit = async (url, depth) => {
    if (seen.has(url)) return;
    seen.add(url);
    let res;
    try {
      const accept = { Accept: 'application/xml, text/xml;q=0.9, */*;q=0.1' };
      res = sitemapsFrom ? await getFromApp(url, accept) : await get(url, { headers: accept });
    } catch (error) {
      errors.push(`${url}: ${error.message}`);
      return;
    }
    if (res.status !== 200) {
      errors.push(`${url}: HTTP ${res.status}`);
      return;
    }
    const sitemap = parseSitemap(await res.text());
    if (!sitemap) {
      errors.push(`${url}: not a sitemap (${res.headers.get('content-type') ?? 'no content type'})`);
      return;
    }
    if (sitemap.kind === 'urlset') {
      read.push(`${url}: ${count(sitemap.entries.length, 'URL')}`);
      entries.push(...sitemap.entries);
      return;
    }
    read.push(`${url}: index of ${count(sitemap.entries.length, 'sitemap')}`);
    if (depth > 0) {
      errors.push(`${url}: a sitemap index inside an index, not followed`);
      return;
    }
    for (const child of sitemap.entries) await visit(child.loc, depth + 1);
  };
  await visit(`${origin}/sitemap.xml`, 0);
  return { read, errors, entries };
}

/** Whether the domain serves the key file as the engines will ask for it (no redirect). */
async function checkKeyFile(origin) {
  const url = `${origin}${keyFilePath(key)}`;
  try {
    const res = await get(url, { redirect: 'manual' });
    const body = res.status === 200 ? await res.text() : '';
    const ok = res.status === 200 && keyFileMatches(body, key);
    const detail = res.status === 200 ? (ok ? 'holds the key' : 'does NOT hold the key') : res.status >= 300 && res.status < 400 ? `redirects to ${res.headers.get('location')}` : 'missing';
    return { url, ok, line: `${url}: HTTP ${res.status}, ${detail}` };
  } catch (error) {
    return { url, ok: false, line: `${url}: ${error.message}` };
  }
}

async function submit(origin, urls) {
  const lines = [];
  let ok = true;
  let accepted = 0;
  const batches = inBatches(urls, MAX_URLS_PER_REQUEST);
  for (const [i, batch] of batches.entries()) {
    const label = `batch ${i + 1}/${batches.length} (${count(batch.length, 'URL')})`;
    try {
      const res = await get(INDEXNOW_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(submissionPayload(origin, key, batch)),
      });
      const status = describeStatus(res.status);
      const body = (await res.text()).trim().slice(0, 300);
      lines.push(`${label}: HTTP ${res.status}, ${status.meaning}${body && !status.ok ? `: ${body}` : ''}`);
      ok &&= status.ok;
      if (status.ok) accepted += batch.length;
    } catch (error) {
      lines.push(`${label}: ${error.message}`);
      ok = false;
    }
  }
  return { ok, accepted, lines };
}

console.log(
  `IndexNow ${args.submit ? 'SUBMIT' : 'dry run (nothing is sent; add --submit to send)'}\n` +
    `key ${key}, ${since === null ? 'every URL in the sitemaps' : `URLs whose lastmod is on or after ${new Date(since).toISOString()}`}` +
      (sitemapsFrom ? `, sitemaps read from the app at ${sitemapsFrom.origin}` : ''),
);

let failed = false;
let total = 0;
let totalBatches = 0;
let accepted = 0;
for (const { area, origin } of domains) {
  console.log(`\n${origin} (${area})`);
  const [sitemaps, keyFile] = await Promise.all([readSitemaps(origin), checkKeyFile(origin)]);
  for (const line of sitemaps.read) console.log(`  sitemap   ${line}`);
  for (const line of sitemaps.errors) console.log(`  ERROR     ${line}`);
  if (sitemaps.errors.length > 0) failed = true;
  console.log(`  key file  ${keyFile.line}`);

  const { kept, foreign } = onHost(sitemaps.entries, origin);
  const split = since === null ? null : changedSince(kept, since);
  const urls = (split ? split.changed : kept).map((e) => e.loc);
  const dropped = [
    foreign.length > 0 && `${foreign.length} on another host`,
    split && `${split.older.length} older`,
    split && `${split.undated.length} without lastmod`,
  ].filter(Boolean);
  const batches = Math.ceil(urls.length / MAX_URLS_PER_REQUEST);
  console.log(`  URLs      ${urls.length} to send${dropped.length ? ` (left out: ${dropped.join(', ')})` : ''}${urls.length ? `, ${count(batches, 'batch')}` : ''}`);
  if (args.list) for (const url of urls) console.log(`            ${url}`);
  if (urls.length === 0) continue;
  total += urls.length;
  totalBatches += batches;

  if (!args.submit) {
    if (!keyFile.ok) console.log('  WARNING   --submit would skip this domain until it serves the key file');
    continue;
  }
  if (!isSubmittableOrigin(origin)) {
    console.log(`  SKIPPED   ${origin} is not a public https origin; nothing an engine could crawl`);
    failed = true;
    continue;
  }
  if (!keyFile.ok) {
    console.log('  SKIPPED   the key file does not answer with the key (IndexNow would answer 403): deploy with INDEXNOW_KEY set first');
    failed = true;
    continue;
  }
  const result = await submit(origin, urls);
  for (const line of result.lines) console.log(`  sent      ${line}`);
  accepted += result.accepted;
  if (!result.ok) failed = true;
}

const across = `${count(totalBatches, 'batch')} across ${count(domains.length, 'domain')}`;
console.log(args.submit ? `\nIndexNow accepted ${accepted} of ${count(total, 'URL')} (${across}).` : `\nWould submit ${count(total, 'URL')} in ${across}.`);
process.exit(failed ? 1 : 0);
