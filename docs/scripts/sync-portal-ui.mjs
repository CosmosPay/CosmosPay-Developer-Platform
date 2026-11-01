// Copy the shared Cosmos Pay UI (navbar + its deps + theme CSS) from the Astro portal into
// this docs tree, so `@/...` imports resolve locally and Next/Turbopack never has to reach
// across the project boundary (which would drag in the portal's Astro middleware).
//
// The portal stays the single source of truth: these copies are generated, like the
// SDK/API content, and are git-ignored. The only edit applied is rewriting the
// `astro:env/client` imports (Astro virtual module) to a Next-compatible shim.
import fs from 'node:fs';
import path from 'node:path';

const PORTAL_SRC = process.env.PORTAL_SRC || path.resolve(import.meta.dirname, '..', '..', 'src');
const DOCS_SRC = path.resolve(import.meta.dirname, '..', 'src');

// portal path (relative to portal src) -> docs path (relative to docs src)
const COPIES = [
  ['components/cosmos', 'components/cosmos'],
  ['lib/i18n', 'lib/i18n'],
  ['lib/auth-client.ts', 'lib/auth-client.ts'],
  // The route constants build absolute links with these (pure, no Astro imports).
  ['lib/urls.ts', 'lib/urls.ts'],
  ['lib/safe-next.ts', 'lib/safe-next.ts'],
  // SiteNav keeps the page's ?lang= in step with the picker through it (pure, no imports).
  ['lib/seo/lang-urls.ts', 'lib/seo/lang-urls.ts'],
  ['styles/cosmos.css', 'styles/cosmos.css'],
];

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) copyRecursive(path.join(src, entry), path.join(dest, entry));
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

if (!fs.existsSync(PORTAL_SRC)) {
  console.error(`[sync-portal-ui] portal src not found at ${PORTAL_SRC}`);
  process.exit(1);
}

/** Prepend `// @ts-nocheck` to a single copied .ts/.tsx so the docs' strict tsc pass skips
 *  the portal code (it's already validated upstream; Turbopack still compiles it via swc). */
function noCheckFile(p) {
  if (!/\.(ts|tsx)$/.test(p)) return;
  const c = fs.readFileSync(p, 'utf8');
  if (!c.startsWith('// @ts-nocheck')) fs.writeFileSync(p, `// @ts-nocheck\n${c}`, 'utf8');
}

/** Recurse a copied directory, no-checking only the files inside it. */
function noCheckTree(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) noCheckTree(p);
    else noCheckFile(p);
  }
}

let count = 0;
for (const [from, to] of COPIES) {
  const src = path.join(PORTAL_SRC, from);
  const dest = path.join(DOCS_SRC, to);
  fs.rmSync(dest, { recursive: true, force: true });
  copyRecursive(src, dest);
  // Only no-check the exact copied target (never sibling docs-owned files in the same dir).
  if (fs.statSync(dest).isDirectory()) noCheckTree(dest);
  else noCheckFile(dest);
  count++;
}

// Rewrite every Astro virtual-module import in the copies so they resolve in the Next build:
// the auth client, and the route constants that read the company/payments site URLs.
function shimAstroEnv(p) {
  if (fs.statSync(p).isDirectory()) return fs.readdirSync(p).reduce((n, e) => n + shimAstroEnv(path.join(p, e)), 0);
  if (!/\.(ts|tsx)$/.test(p)) return 0;
  const before = fs.readFileSync(p, 'utf8');
  const after = before.replace(/from\s+["']astro:env\/client["']/g, 'from "@/shims/astro-env-client"');
  if (after === before) return 0;
  fs.writeFileSync(p, after, 'utf8');
  return 1;
}
const shimmed = COPIES.reduce((n, [, to]) => n + shimAstroEnv(path.join(DOCS_SRC, to)), 0);

// The docs (Next) and portal (Astro) are separate bundles, so the i18n store may not be a
// shared singleton, and a nav language switch wouldn't reach the Fumadocs Provider. Patch the
// copied setLang to also broadcast a window event the docs Provider can listen for (it then
// re-reads the cookie). This makes the docs chrome follow the language switch reliably.
const i18nIndex = path.join(DOCS_SRC, 'lib/i18n/index.tsx');
if (fs.existsSync(i18nIndex)) {
  const src = fs.readFileSync(i18nIndex, 'utf8');
  const patched = src.replace(
    /listeners\.forEach\(\(fn\) => fn\(\)\);/,
    "listeners.forEach((fn) => fn());\n  try { window.dispatchEvent(new CustomEvent('cosmospay:lang', { detail: code })); } catch (e) {}",
  );
  if (patched !== src) fs.writeFileSync(i18nIndex, patched, 'utf8');
  console.log(`[sync-portal-ui] patched i18n setLang to broadcast 'cosmospay:lang': ${patched !== src}`);
}

console.log(`[sync-portal-ui] copied ${count} portal targets -> ${DOCS_SRC} (from ${PORTAL_SRC})`);
console.log(`[sync-portal-ui] rewrote astro:env/client imports in ${shimmed} copied file(s)`);
