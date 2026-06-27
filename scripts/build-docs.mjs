// Build the Fumadocs (Next.js) docs subproject and copy its static export into the Astro
// portal's public/docs, so the portal serves the documentation at dev.cosmospay.lat/docs.
//
// The docs build (docs/package.json `prebuild`) regenerates the SDK + API content from the
// sibling repos and syncs the shared navbar before `next build`. Output lands in docs/out
// with every route/asset prefixed by /docs (next.config basePath), so we copy it verbatim.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const docsDir = path.join(root, 'docs');
const outDir = path.join(docsDir, 'out');
const destDir = path.join(root, 'public', 'docs');

if (!fs.existsSync(docsDir)) {
  console.error(`[build-docs] docs/ not found at ${docsDir}`);
  process.exit(1);
}

// Install docs deps on first run (fresh clone / CI) so the portal build is self-sufficient.
if (!fs.existsSync(path.join(docsDir, 'node_modules'))) {
  console.log('[build-docs] installing docs dependencies…');
  execSync('npm install', { cwd: docsDir, stdio: 'inherit' });
}

// Remove the previous export up-front: on Windows, Next's own cleanup of out/ can hit a
// transient lock (OneDrive/AV) mid-build. Clearing it first (with retries) avoids that.
fs.rmSync(outDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });

console.log('[build-docs] building docs…');
execSync('npm run build', { cwd: docsDir, stdio: 'inherit' });

if (!fs.existsSync(outDir)) {
  console.error(`[build-docs] expected static export at ${outDir} (did next build with output:export run?)`);
  process.exit(1);
}

fs.rmSync(destDir, { recursive: true, force: true });
fs.mkdirSync(path.dirname(destDir), { recursive: true });
fs.cpSync(outDir, destDir, { recursive: true });
console.log(`[build-docs] copied ${outDir} -> ${destDir}`);
