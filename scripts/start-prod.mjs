// PM2 production entry (see ecosystem.config.cjs → app `devplat`).
//
// PM2 runs the compiled Astro server directly, which bypasses the `prestart` npm hook — so the
// /docs site would never be built/refreshed when you bring the ecosystem up. This wrapper runs
// ensure-docs first (builds /docs only when missing or stale, then mirrors it into
// dist/client/docs that `start` serves), then boots the server in THIS same process so PM2 keeps
// managing a single node process.
import { execSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

try {
  execSync('node scripts/ensure-docs.mjs', { cwd: root, stdio: 'inherit' });
} catch (err) {
  // Non-fatal: don't let a docs build failure stop the server from coming up.
  console.warn('[start-prod] ensure-docs failed; starting server with existing /docs.', err?.message);
}

// The Astro node standalone entry self-starts the HTTP server on import.
await import('../dist/server/entry.mjs');
