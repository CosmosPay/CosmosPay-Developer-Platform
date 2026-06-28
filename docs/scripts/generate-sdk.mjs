// Generate the SDK docs hierarchy from the Cosmos Pay SDK repo:
//
//   SDK                         (root separator)
//   └─ @cosmosapp/pay_sdk       (the sdk/ folder)
//      ├─ Server                (server entry — prose from llms/*.md)
//      ├─ Web                   (browser entry — prose from llms/*.md)
//      └─ Definitions           (Types & enums + ONE atomic page per class, discord.js-style)
//
// Prose pages come from the SDK's llms/NN-*.md; class references are parsed (with JSDoc,
// per-member params/returns) from the published .d.ts. All generated, never edited here.
import fs from 'node:fs';
import path from 'node:path';
import { sanitizeInternal } from './sanitize-internal.mjs';

const SDK_LLMS =
  process.env.SDK_LLMS_DIR || path.resolve(import.meta.dirname, '../../..', 'cosmosjs_sdk/llms');
const SDK_ROOT = path.resolve(SDK_LLMS, '..');
const OUT = path.resolve(import.meta.dirname, '..', 'content/docs/sdk');
const REPO = 'https://github.com/CosmosPay/CosmosJS_SDK';

const CATEGORY = {
  overview: 'server', installation: 'server', authentication: 'server', quickstart: 'server',
  client: 'server', 'payment-intents': 'server', webhooks: 'server', 'products-customers': 'server',
  'analytics-health': 'server', 'errors-observability': 'server', configuration: 'server', recipes: 'server',
  'web-client': 'web', 'assets-wallets-addresses': 'web',
  'types-reference': 'definitions',
};

const SECTION_META = {
  server: { title: 'Server', description: '@cosmosapp/pay_sdk — the server-side client.' },
  web: { title: 'Web', description: '@cosmosapp/pay_sdk/web — the browser wallet client.' },
  definitions: { title: 'Definitions', description: 'Types, enums and every exported class — atomic reference.' },
};

// Short descriptions for classes whose .d.ts has no JSDoc, so their definition page and every
// "References"/"Related" link that points at them still carries an explanation.
const CURATED_DOC = {
  WebClient: "The browser wallet client — detects the user's Stellar wallet, then builds, signs and submits the transaction. It never touches your secret key.",
  WebREST: 'The browser-side HTTP layer the web client uses to talk to the Cosmos Pay gateway.',
  WalletRegistry: 'Registry of the supported browser wallet adapters — detects which wallets are installed and resolves the right adapter.',
  FreighterAdapter: 'Wallet adapter for the Freighter browser extension.',
  XBullAdapter: 'Wallet adapter for the xBull wallet.',
  RabetAdapter: 'Wallet adapter for the Rabet wallet.',
  LobstrAdapter: 'Wallet adapter for the LOBSTR wallet.',
  AlbedoAdapter: 'Wallet adapter for Albedo (web-based signing).',
};

const META = {
  overview: { description: 'What the SDK is, its server and browser entry points, the three-step payment flow, and the key facts you must know.', intro: 'This is the mental model for the whole SDK — read it first. It explains why there are two entry points (server and browser) and how a single payment moves through three steps.' },
  installation: { description: 'Install @cosmosapp/pay_sdk, the optional Stellar peer dependency, and the ESM / CommonJS import styles.', intro: 'Add the package to any Node.js project. Browser wallet support is an optional extra you only install when you actually need it.' },
  authentication: { description: 'Authenticate with a single API key; the network (testnet vs mainnet) is chosen automatically by the key prefix.', intro: 'Authentication is deliberately minimal: one secret API key, kept on your server. The key prefix also selects the Stellar network for you, so there is nothing else to configure. New here? See [how to get your API key](/api-keys).' },
  quickstart: { description: 'The smallest end-to-end flow: create a payment intent, complete it in the wallet, and validate the transaction.', intro: 'If you just want to see a payment work end to end, start here. The first example is the shortest possible integration; the second shows the realistic server-creates / browser-completes split.' },
  client: { description: 'The Client object: the managers it exposes, its constructor options, and the self-acting structures it returns.', intro: 'Almost everything you do goes through a single `Client` instance. It groups the API into one manager per resource and returns objects that can act on themselves.' },
  'payment-intents': { description: 'Create, fetch, list, edit, cancel, delete and validate Stellar SEP-7 payment intents.', intro: 'A payment intent represents one payment you want a user to make. It is the core resource of the API and the manager you will reach for most often.' },
  'web-client': { description: "The browser WebClient: detect the user's Stellar wallet, then build, sign and submit the transaction.", intro: "The web client runs in the browser and is the only part that touches the user's wallet. It is provider-agnostic and never needs your secret key." },
  webhooks: { description: 'Register webhook endpoints, receive events over HTTP / Express, and verify their signatures.', intro: "Webhooks tell your server when a payment's status changes, so you don't have to poll. This page covers registering endpoints and verifying that incoming events are genuine." },
  'products-customers': { description: 'Manage your product catalog and customers, including their payment statistics.', intro: 'Products and customers are optional catalogs you can attach to payments to organise and report on them.' },
  'analytics-health': { description: "Read your account summary, balances and logs, and check the service's liveness and readiness.", intro: "These read-only endpoints give you operational visibility: how much you've collected, recent activity, and whether the service is up." },
  'assets-wallets-addresses': { description: 'Typed catalogs of assets and wallets, plus address validators, for both testnet and mainnet.', intro: 'The SDK ships typed, network-aware catalogs so you never hand-type an asset issuer or wallet id, plus validators for Stellar addresses.' },
  'errors-observability': { description: 'The error classes the SDK throws, its retry behaviour, and the telemetry events you can hook into.', intro: 'Everything the SDK can throw is a typed error you can catch, and every network call emits telemetry you can observe.' },
  configuration: { description: 'The full option reference and the advanced overrides for self-hosting the gateway.', intro: 'Most integrations need none of this. It documents every option and the advanced overrides for self-hosting or local development.' },
  'types-reference': { description: 'The enums, input option types and entity payload shapes exported by the SDK.', intro: 'A quick lookup for the enums, input option types and response payload shapes, so you can wire up TypeScript with confidence.' },
  recipes: { description: 'Practical end-to-end recipes: checkout, donations, idempotent webhooks, reconciliation and testnet/mainnet.', intro: 'Copy-paste solutions for common scenarios, assembled from the pieces documented across the rest of these docs.' },
};

const yaml = (s) => JSON.stringify(String(s ?? ''));
const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/_/g, '-').toLowerCase();
const PROSE_PATH = (slug) => `/sdk/${CATEGORY[slug] || 'server'}/${slug}`;
// Definitions are grouped into `server/` and `web/` subfolders (collapsible in the sidebar),
// so a class page lives under its entry point's folder.
const DEF_CAT = (entry) => (entry === '@cosmosapp/pay_sdk/web' ? 'web' : 'server');
const CLASS_PATH = (c) => `/sdk/definitions/${DEF_CAT(c.entry)}/${kebab(c.name)}`;

/** Escape MDX-hostile chars in prose, leaving inline-code spans untouched. */
function escapeMdxText(s) {
  return String(s || '')
    .split(/(`[^`]*`)/)
    .map((part, i) => (i % 2 === 1 ? part : part.replace(/[<{}]/g, (c) => ({ '<': '&lt;', '{': '&#123;', '}': '&#125;' })[c])))
    .join('');
}

function rewriteLinks(md) {
  return md
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<((?:https?:)\/\/[^>\s]+)>/g, '$1')
    .replace(/\]\((?:\.\/)?\d\d-([a-z0-9-]+)\.md(#[^)]*)?\)/g, (_, slug, frag) => `](${PROSE_PATH(slug)}${frag || ''})`)
    .replace(/\]\(\.\.\/examples\/([^)]+)\)/g, (_, p) => `](${REPO}/tree/main/examples/${p})`)
    .replace(/\]\(\.\.\/README\.md\)/g, `](${REPO}#readme)`)
    .replace(/\]\((?:\.\/)?llms(?:-full)?\.txt\)/g, `](${REPO}/tree/main/llms)`);
}

function extractTitleAndBody(md) {
  const lines = md.split(/\r?\n/);
  let i = 0;
  while (i < lines.length && lines[i].trim() === '') i++;
  let title = null;
  const m = lines[i] && lines[i].match(/^#\s+(.+?)\s*$/);
  if (m) {
    title = m[1].trim();
    i++;
  }
  return { title, body: lines.slice(i).join('\n').replace(/^\n+/, '') };
}

function firstParagraph(body) {
  const lines = body.split(/\r?\n/);
  let j = 0;
  while (j < lines.length && lines[j].trim() === '') j++;
  const buf = [];
  while (j < lines.length && lines[j].trim() !== '') {
    if (/^(#|`{3}|\||[-*]\s|\d+\.\s|>)/.test(lines[j].trim())) break;
    buf.push(lines[j]);
    j++;
  }
  let p = buf.join(' ').replace(/`([^`]*)`/g, '$1').replace(/\*\*([^*]*)\*\*/g, '$1').replace(/\*([^*]*)\*/g, '$1').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\s+/g, ' ').trim();
  if (p.length > 180) p = p.slice(0, 177).trimEnd() + '…';
  return p;
}

// --- .d.ts parsing into structured classes -----------------------------------------------
/** Split a parameter/argument list on top-level commas (respecting <> () [] {}). */
function splitTopLevel(s) {
  const out = [];
  let depth = 0,
    cur = '';
  for (const ch of s) {
    if ('<([{'.includes(ch)) depth++;
    else if ('>)]}'.includes(ch)) depth--;
    if (ch === ',' && depth === 0) {
      out.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function jsdocText(docLines) {
  const lines = docLines
    .join('\n')
    .replace(/^\s*\/\*\*/, '')
    .replace(/\*\/\s*$/, '')
    .split('\n')
    .map((l) => l.replace(/^\s*\*\s?/, ''));
  // Keep only the leading description — stop at the first @tag (drops @example code, @param…).
  const desc = [];
  for (const l of lines) {
    if (l.trim().startsWith('@')) break;
    desc.push(l);
  }
  return desc.join(' ').replace(/\s+/g, ' ').trim();
}

function parseMember(sig, doc) {
  // method:  name<Generics?>(args): ret    |   property:  [mods] name: type   |   name = value
  const mMethod = sig.match(/^([A-Za-z0-9_]+)(?:<[^>]*>)?\s*\(([\s\S]*)\)\s*(?::\s*([\s\S]+))?$/);
  if (mMethod) {
    const name = mMethod[1];
    const params = splitTopLevel(mMethod[2]).map((p) => {
      const mm = p.match(/^([A-Za-z0-9_.]+)(\?)?\s*:\s*([\s\S]+)$/);
      return mm ? { name: mm[1], optional: !!mm[2], type: mm[3].trim() } : { name: p, optional: false, type: '' };
    });
    return { kind: name === 'constructor' ? 'constructor' : 'method', name, signature: sig, params, returns: (mMethod[3] || '').trim(), doc };
  }
  const mProp = sig.match(/^((?:static\s+|readonly\s+|abstract\s+|get\s+|set\s+)*)([A-Za-z0-9_]+)\??\s*(?::\s*([\s\S]+)|=\s*([\s\S]+))?$/);
  if (mProp) return { kind: 'property', name: mProp[2], signature: sig, type: (mProp[3] || mProp[4] || '').trim(), doc };
  // Fallback: take the leading identifier only (strip generics/params) so the heading is clean.
  return { kind: 'property', name: (sig.match(/^[A-Za-z0-9_]+/) || ['member'])[0], signature: sig, type: '', doc };
}

function extractClasses(dtsPath, entry) {
  if (!fs.existsSync(dtsPath)) return [];
  const lines = fs.readFileSync(dtsPath, 'utf8').split(/\r?\n/);
  const classes = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\s*(?:export\s+)?(?:declare\s+)?(?:abstract\s+)?class\s+([A-Za-z0-9_]+)([^{]*)\{/);
    if (!m) continue;
    const name = m[1];
    const heritage = m[2].trim();
    // preceding jsdoc
    let docLines = [];
    if (lines[i - 1] && lines[i - 1].trim().endsWith('*/')) {
      let d = i - 1;
      const tmp = [];
      while (d >= 0) {
        tmp.unshift(lines[d]);
        if (lines[d].trim().startsWith('/**')) break;
        d--;
      }
      docLines = tmp;
    }
    // body
    let depth = 0,
      started = false,
      j = i;
    const body = [];
    for (; j < lines.length; j++) {
      if (j > i || lines[j].includes('{')) body.push(lines[j]);
      for (const ch of lines[j]) {
        if (ch === '{') {
          depth++;
          started = true;
        } else if (ch === '}') depth--;
      }
      if (started && depth === 0) break;
    }
    // parse members from body (drop the decl line + closing brace)
    const inner = body.slice(1, -1);
    const members = [];
    let mdoc = [],
      inDoc = false,
      buf = [];
    for (const raw of inner) {
      const t = raw.trim();
      if (!t) continue;
      if (t.startsWith('/**') && t.endsWith('*/')) {
        mdoc = [t];
        continue;
      }
      if (t.startsWith('/**')) {
        inDoc = true;
        mdoc = [t];
        continue;
      }
      if (inDoc) {
        mdoc.push(t);
        if (t.endsWith('*/')) inDoc = false;
        continue;
      }
      if (t.startsWith('private ') || t.startsWith('#')) {
        mdoc = [];
        continue;
      }
      buf.push(t);
      if (t.endsWith(';') || (t.endsWith('}') && !t.includes('=>'))) {
        const sig = buf.join(' ').replace(/;$/, '').trim();
        const memberDoc = jsdocText(mdoc);
        // Skip internal/local-dev members — external API users only ever use their
        // `Authorization` API key, never the gateway handshake. Caught either by the SDK's
        // "internal / local dev" doc marker or by an internal credential in the signature
        // (e.g. setGatewayCredentials(secret, consumerUsername), on any class).
        const isInternal =
          /internal\s*\/\s*local dev/i.test(memberDoc) || /\b(gatewaySecret|consumerUsername)\b/.test(sig);
        if (sig && !isInternal) members.push(parseMember(sig, memberDoc));
        buf = [];
        mdoc = [];
      }
    }
    classes.push({ name, heritage, entry, doc: jsdocText(docLines), members });
    i = j;
  }
  return classes;
}

/** Render a TS type string as inline code, hyperlinking identifiers that have their own
 *  definition page (discord.js-style). The common case — a single referenced class, e.g.
 *  `PaymentIntentManager` or `Promise<PaymentIntent>` — links the whole expression as one
 *  clean monospace pill. Types referencing several classes link each one individually so
 *  every target stays reachable. Nothing linkable → a plain code span. */
function linkType(type, selfName) {
  if (!type) return '';
  const re = /[A-Za-z_$][A-Za-z0-9_$]*/g;
  const hits = [];
  let m;
  while ((m = re.exec(type))) if (m[0] !== selfName && CLASS_INDEX.has(m[0])) hits.push(m[0]);
  if (hits.length === 0) return '`' + type + '`';
  if (hits.length === 1) return `[\`${type}\`](${CLASS_INDEX.get(hits[0]).path})`;
  let out = '', last = 0;
  re.lastIndex = 0;
  while ((m = re.exec(type))) {
    const name = m[0];
    if (name !== selfName && CLASS_INDEX.has(name)) {
      const gap = type.slice(last, m.index);
      if (gap) out += '`' + gap + '`';
      out += `[\`${name}\`](${CLASS_INDEX.get(name).path})`;
      last = m.index + name.length;
    }
  }
  const tail = type.slice(last);
  if (tail) out += '`' + tail + '`';
  return out;
}

/** Distinct definition-linked class names a class references (members + heritage), minus self. */
function relatedClasses(c) {
  const names = new Set();
  const scan = (s) => {
    if (!s) return;
    const re = /[A-Za-z_$][A-Za-z0-9_$]*/g;
    let m;
    while ((m = re.exec(s))) if (m[0] !== c.name && CLASS_INDEX.has(m[0])) names.add(m[0]);
  };
  for (const mem of c.members) {
    scan(mem.type);
    scan(mem.returns);
    if (mem.params) for (const p of mem.params) scan(p.type);
  }
  scan(c.heritage);
  return [...names];
}

function renderClassPage(c) {
  const summary = c.doc || `The ${c.name} class.`;
  const parts = [`---\ntitle: ${yaml(c.name)}\ndescription: ${yaml((summary.slice(0, 175)).trim())}\n---\n`];
  // Lead with the class explanation only — the entry-point ("Exported from @cosmosapp/pay_sdk")
  // and "Declared as class …" boilerplate is redundant with the sidebar grouping + signatures.
  if (c.doc) parts.push(`${escapeMdxText(c.doc)}\n`);

  const props = c.members.filter((m) => m.kind === 'property');
  const ctors = c.members.filter((m) => m.kind === 'constructor');
  const methods = c.members.filter((m) => m.kind === 'method');

  if (ctors.length) {
    parts.push('## Constructor\n');
    for (const m of ctors) parts.push(renderCallable(m, c.name, c.name));
  }
  if (props.length) {
    parts.push('## Properties\n');
    for (const p of props) {
      parts.push(`### ${p.name}\n`);
      if (p.doc) parts.push(`${escapeMdxText(p.doc)}\n`);
      parts.push('```ts\n' + p.signature + '\n```\n');
      // When a property points at another class, surface its type as a clickable line.
      const linked = linkType(p.type, c.name);
      if (linked.includes('](')) parts.push(`**Type** ${linked}\n`);
    }
  }
  if (methods.length) {
    parts.push('## Methods\n');
    for (const m of methods) parts.push(renderCallable(m, m.name, c.name));
  }
  const related = relatedClasses(c);
  if (related.length) {
    parts.push('## Related\n');
    parts.push(related.map((n) => `- [${n}](${CLASS_INDEX.get(n).path})`).join('\n') + '\n');
  }
  return parts.join('\n');
}

function renderCallable(m, heading, selfName) {
  const parts = [`### ${heading}${m.kind === 'method' ? '()' : ''}\n`];
  if (m.doc) parts.push(`${escapeMdxText(m.doc)}\n`);
  parts.push('```ts\n' + m.signature + '\n```\n');
  if (m.params && m.params.length) {
    parts.push('**Parameters**\n');
    for (const p of m.params) parts.push(`- \`${p.name}\`${p.optional ? ' _(optional)_' : ''} — ${p.type ? linkType(p.type, selfName) : '`unknown`'}`);
    parts.push('');
  }
  if (m.returns) parts.push(`**Returns** ${linkType(m.returns, selfName)}\n`);
  return parts.join('\n');
}

// --- Generate -----------------------------------------------------------------------------
// The SDK docs are GENERATED from the external SDK repo (its llms/ + built dist/*.d.ts). That repo
// only exists on dev/build machines — on a production box it's absent, and we DON'T want the docs
// to depend on it. The generated content is committed, so here we just skip (leaving it in place).
if (!fs.existsSync(SDK_LLMS)) {
  console.warn(`[generate-sdk] SDK source not found at ${SDK_LLMS} — keeping the committed content/docs/sdk as-is.`);
  process.exit(0);
}
const files = fs.readdirSync(SDK_LLMS).filter((f) => /^\d\d-.+\.md$/.test(f)).sort();
if (!files.length) {
  console.error(`[generate-sdk] No NN-*.md files found in ${SDK_LLMS}`);
  process.exit(1);
}

const serverClasses = extractClasses(path.join(SDK_ROOT, 'dist/index.d.ts'), '@cosmosapp/pay_sdk');
const webClasses = extractClasses(path.join(SDK_ROOT, 'dist/web/index.d.ts'), '@cosmosapp/pay_sdk/web');
const allClasses = [...serverClasses, ...webClasses];
// Fill in a description for classes the .d.ts left undocumented, so neither the page nor the
// cross-reference links render bare.
for (const c of allClasses) if (!c.doc && CURATED_DOC[c.name]) c.doc = CURATED_DOC[c.name];
// name -> { path, summary } for cross-referencing from prose
const CLASS_INDEX = new Map(allClasses.map((c) => [c.name, { path: CLASS_PATH(c), summary: c.doc }]));

/** Names imported from the SDK in a page's code examples (`import { A, B as C } from '@cosmosapp/pay_sdk…'`). */
function extractImportedSymbols(md) {
  const names = new Set();
  const re = /import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*['"]@cosmosapp\/pay_sdk[^'"]*['"]/g;
  let m;
  while ((m = re.exec(md))) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/)[0].trim();
      if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)) names.add(name);
    }
  }
  return names;
}

fs.rmSync(OUT, { recursive: true, force: true });
const sections = { server: [], web: [], definitions: [] };

// Pass A — render every page body (so we can index what each one documents before wiring refs).
const pages = files.map((f) => {
  const slug = f.replace(/^\d\d-/, '').replace(/\.md$/, '');
  const raw = fs.readFileSync(path.join(SDK_LLMS, f), 'utf8');
  const { title, body } = extractTitleAndBody(raw);
  const out = sanitizeInternal(rewriteLinks(body));
  const meta = META[slug] || {};
  return {
    slug,
    cat: CATEGORY[slug] || 'server',
    title,
    out,
    description: meta.description || firstParagraph(out) || `${title || slug} — Cosmos Pay SDK.`,
    intro: meta.intro ? `${meta.intro}\n\n` : '',
  };
});

// The assets/wallets/addresses page documents a set of NON-class exports (Assets, Wallets,
// resolveAddress, …). Map each symbol it imports to that page, so examples elsewhere that import
// them get a reference too — not just the exported classes.
const CATALOG_INDEX = new Map();
const catalogPage = pages.find((p) => p.slug === 'assets-wallets-addresses');
if (catalogPage) {
  for (const name of extractImportedSymbols(catalogPage.out)) {
    if (!CLASS_INDEX.has(name)) {
      CATALOG_INDEX.set(name, {
        path: PROSE_PATH('assets-wallets-addresses'),
        summary: 'Typed asset / wallet catalog or address helper.',
      });
    }
  }
}
const SYMBOL_INDEX = new Map([...CLASS_INDEX, ...CATALOG_INDEX]);

// Pass B — append a "References" section (every SDK symbol imported in the page's examples, plus
// any class named in its prose) and write each page.
for (const p of pages) {
  const selfPath = PROSE_PATH(p.slug);
  const refNames = new Set();
  for (const name of extractImportedSymbols(p.out)) if (SYMBOL_INDEX.has(name)) refNames.add(name);
  for (const name of CLASS_INDEX.keys()) if (new RegExp(`\\b${name}\\b`).test(p.out)) refNames.add(name);
  const refs = [...refNames]
    .map((name) => ({ name, ...SYMBOL_INDEX.get(name) }))
    .filter((r) => r.path !== selfPath) // don't link a page to itself
    .sort((a, b) => a.name.localeCompare(b.name));

  let refsBlock = '';
  if (refs.length) {
    refsBlock =
      '\n\n## References\n\n' +
      refs
        .map((r) => `- [${r.name}](${r.path})${r.summary ? ` — ${escapeMdxText(r.summary.split('. ')[0])}` : ''}`)
        .join('\n') +
      '\n';
  }

  const dir = path.join(OUT, p.cat);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, `${p.slug}.mdx`),
    `---\ntitle: ${yaml(p.title || p.slug)}\ndescription: ${yaml(p.description)}\n---\n\n${p.intro}${p.out.trimEnd()}${refsBlock}\n`,
    'utf8',
  );
  sections[p.cat].push(p.slug);
}

// Definitions: one atomic page per class, nested under `server/` and `web/` subfolders so the
// two entry points are collapsible parents in the sidebar (not flat separators).
const defDir = path.join(OUT, 'definitions');
const defServerDir = path.join(defDir, 'server');
const defWebDir = path.join(defDir, 'web');
fs.mkdirSync(defServerDir, { recursive: true });
fs.mkdirSync(defWebDir, { recursive: true });
for (const c of serverClasses) fs.writeFileSync(path.join(defServerDir, `${kebab(c.name)}.mdx`), renderClassPage(c), 'utf8');
for (const c of webClasses) fs.writeFileSync(path.join(defWebDir, `${kebab(c.name)}.mdx`), renderClassPage(c), 'utf8');

// Localized folder titles/descriptions for the sidebar (the page lists stay shared so they
// can't drift from what's generated). The default-language meta is `meta.json`; each locale
// is a `meta.<lang>.json` sibling that the loader's i18n parser picks up. Definitions and the
// API reference content remain English, but their nav labels are still localized.
const SECTION_META_I18N = {
  es: {
    root: 'SDK de JavaScript / TypeScript para Cosmos Pay.',
    server: { title: 'Servidor', description: '@cosmosapp/pay_sdk — el cliente del lado del servidor.' },
    web: { title: 'Web', description: '@cosmosapp/pay_sdk/web — el cliente de billeteras del navegador.' },
    definitions: { title: 'Definiciones', description: 'Tipos, enums y cada clase exportada — referencia atómica.' },
  },
  fr: {
    root: 'SDK JavaScript / TypeScript pour Cosmos Pay.',
    server: { title: 'Serveur', description: '@cosmosapp/pay_sdk — le client côté serveur.' },
    web: { title: 'Web', description: '@cosmosapp/pay_sdk/web — le client de portefeuilles du navigateur.' },
    definitions: { title: 'Définitions', description: 'Types, enums et chaque classe exportée — référence atomique.' },
  },
  de: {
    root: 'JavaScript-/TypeScript-SDK für Cosmos Pay.',
    server: { title: 'Server', description: '@cosmosapp/pay_sdk — der serverseitige Client.' },
    web: { title: 'Web', description: '@cosmosapp/pay_sdk/web — der Browser-Wallet-Client.' },
    definitions: { title: 'Definitionen', description: 'Typen, Enums und jede exportierte Klasse — atomare Referenz.' },
  },
  pt: {
    root: 'SDK JavaScript / TypeScript para o Cosmos Pay.',
    server: { title: 'Servidor', description: '@cosmosapp/pay_sdk — o cliente do lado do servidor.' },
    web: { title: 'Web', description: '@cosmosapp/pay_sdk/web — o cliente de carteiras do navegador.' },
    definitions: { title: 'Definições', description: 'Tipos, enums e cada classe exportada — referência atômica.' },
  },
};
const serverDefSlugs = serverClasses.map((c) => kebab(c.name));
const webDefSlugs = webClasses.map((c) => kebab(c.name));

// meta.json for every level (default language), then a localized sibling per locale.
const writeMeta = (dir, obj, name = 'meta.json') => fs.writeFileSync(path.join(dir, name), JSON.stringify(obj, null, 2) + '\n', 'utf8');
writeMeta(OUT, { title: '@cosmosapp/pay_sdk', description: 'JavaScript / TypeScript SDK for Cosmos Pay.', pages: ['server', 'web', 'definitions'] });
writeMeta(path.join(OUT, 'server'), { ...SECTION_META.server, pages: sections.server });
writeMeta(path.join(OUT, 'web'), { ...SECTION_META.web, pages: sections.web });
// Definitions: types reference at the top, then the Server / Web class folders.
writeMeta(defDir, { ...SECTION_META.definitions, pages: ['types-reference', 'server', 'web'] });
writeMeta(defServerDir, { title: SECTION_META.server.title, description: 'Server-side classes.', pages: serverDefSlugs });
writeMeta(defWebDir, { title: SECTION_META.web.title, description: 'Browser-side classes.', pages: webDefSlugs });
for (const [lang, m] of Object.entries(SECTION_META_I18N)) {
  writeMeta(OUT, { title: '@cosmosapp/pay_sdk', description: m.root, pages: ['server', 'web', 'definitions'] }, `meta.${lang}.json`);
  writeMeta(path.join(OUT, 'server'), { ...m.server, pages: sections.server }, `meta.${lang}.json`);
  writeMeta(path.join(OUT, 'web'), { ...m.web, pages: sections.web }, `meta.${lang}.json`);
  writeMeta(defDir, { ...m.definitions, pages: ['types-reference', 'server', 'web'] }, `meta.${lang}.json`);
  writeMeta(defServerDir, { title: m.server.title, pages: serverDefSlugs }, `meta.${lang}.json`);
  writeMeta(defWebDir, { title: m.web.title, pages: webDefSlugs }, `meta.${lang}.json`);
}

console.log(`[generate-sdk] server:${sections.server.length} web:${sections.web.length} definitions: types-reference + ${serverClasses.length} server + ${webClasses.length} web classes`);
