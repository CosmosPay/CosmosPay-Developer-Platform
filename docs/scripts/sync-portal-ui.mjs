// Copy the shared Cosmos Pay UI (navbar + its deps + theme CSS) from the Astro portal into
// this docs tree, so `@/...` imports resolve locally and Next/Turbopack never has to reach
// across the project boundary (which would drag in the portal's Astro middleware).
//
// The portal stays the single source of truth — these copies are generated, like the
// SDK/API content, and are git-ignored. The only edit applied is rewriting the lone
// `astro:env/client` import (Astro virtual module) to a Next-compatible shim.
import fs from 'node:fs';
import path from 'node:path';

const PORTAL_SRC = process.env.PORTAL_SRC || path.resolve(import.meta.dirname, '..', '..', 'src');
const DOCS_SRC = path.resolve(import.meta.dirname, '..', 'src');

// portal path (relative to portal src) -> docs path (relative to docs src)
const COPIES = [
  ['components/cosmos', 'components/cosmos'],
  ['lib/i18n', 'lib/i18n'],
  ['lib/auth-client.ts', 'lib/auth-client.ts'],
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

// Rewrite the one Astro virtual-module import so it resolves in the Next build.
const authClient = path.join(DOCS_SRC, 'lib/auth-client.ts');
const before = fs.readFileSync(authClient, 'utf8');
const after = before.replace(/from\s+["']astro:env\/client["']/g, 'from "@/shims/astro-env-client"');
if (after !== before) fs.writeFileSync(authClient, after, 'utf8');

console.log(`[sync-portal-ui] copied ${count} portal targets -> ${DOCS_SRC} (from ${PORTAL_SRC})`);
console.log(`[sync-portal-ui] rewrote astro:env/client import in lib/auth-client.ts: ${after !== before}`);
