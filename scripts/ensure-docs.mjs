// Guarantee the /docs site is present (and current) before `dev` and `start`.
//
// A full docs build (Next static export) is slow, so we only rebuild when public/docs is
// missing or when any docs source is newer than the last build — otherwise it's a fast
// no-op. After ensuring public/docs, if a server build exists we mirror it into
// dist/client/docs so `npm start` serves the latest docs too.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
// Load .env so SDK_LLMS_DIR / OPENAPI_SRC overrides are available even when this runs standalone
// (predev/prestart). Won't override vars PM2 already injected. Optional dependency.
try {
  await import('dotenv/config');
} catch {
  /* dotenv not installed — rely on the ambient process.env */
}

const root = path.resolve(import.meta.dirname, '..');
const publicDocs = path.join(root, 'public', 'docs');
const marker = path.join(publicDocs, 'index.html');
const distClient = path.join(root, 'dist', 'client');
const distDocs = path.join(distClient, 'docs');

const SKIP = new Set(['node_modules', '.next', 'out', '.source', '.git']);

/** Newest mtime under a file/dir (0 if missing), skipping build artifacts. */
function maxMtime(p) {
  let st;
  try {
    st = fs.statSync(p);
  } catch {
    return 0;
  }
  if (st.isDirectory()) {
    if (SKIP.has(path.basename(p))) return 0;
    let max = 0;
    for (const e of fs.readdirSync(p)) max = Math.max(max, maxMtime(path.join(p, e)));
    return max;
  }
  return st.mtimeMs;
}

// Inputs that affect the docs output: the docs app source + config, ALL docs content (the
// committed generated content/docs/{sdk,api} + hand-written pages), the translations, the spec,
// and the portal UI the navbar reuses. The external source repos are listed too so a local change
// to them triggers a rebuild — but they're optional (absent on prod; generate-sdk/api just skip).
const SOURCES = [
  path.join(root, 'docs', 'src'),
  path.join(root, 'docs', 'scripts'),
  path.join(root, 'docs', 'content', 'docs'),
  path.join(root, 'docs', 'content-i18n'),
  path.join(root, 'docs', 'openapi.json'),
  path.join(root, 'docs', 'next.config.mjs'),
  path.join(root, 'docs', 'source.config.ts'),
  path.join(root, 'docs', 'package.json'),
  path.resolve(root, '..', 'cosmosjs_sdk', 'llms'),
  path.resolve(root, '..', 'comos-pay-community-server', 'openapi', 'openapi.json'),
  path.join(root, 'src', 'components', 'cosmos'),
  path.join(root, 'src', 'lib', 'i18n'),
  path.join(root, 'src', 'lib', 'auth-client.ts'),
  path.join(root, 'src', 'styles', 'cosmos.css'),
];

function needsBuild() {
  if (!fs.existsSync(marker)) return true;
  const built = fs.statSync(marker).mtimeMs;
  const newest = Math.max(0, ...SOURCES.map(maxMtime));
  return newest > built;
}

// The docs always build from the committed content (generate-sdk/api skip when the external repos
// are absent — see those scripts), so there's no repo dependency. Just (re)build when out of date.
if (needsBuild()) {
  console.log('[ensure-docs] /docs missing or out of date — building…');
  try {
    execSync('node scripts/build-docs.mjs', { cwd: root, stdio: 'inherit' });
  } catch {
    // Non-fatal: don't block `dev`/`start` — serve whatever docs were already built (if any).
    console.warn('[ensure-docs] docs build failed; continuing with existing /docs (if present).');
  }
} else {
  console.log('[ensure-docs] /docs is up to date — skipping build.');
}

// Keep a built server in sync (start serves dist/client, not public/).
if (fs.existsSync(distClient) && fs.existsSync(marker)) {
  fs.rmSync(distDocs, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  fs.cpSync(publicDocs, distDocs, { recursive: true });
  console.log('[ensure-docs] mirrored public/docs -> dist/client/docs');
}
