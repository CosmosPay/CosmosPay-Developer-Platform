// Boot the compiled server and make one real request against it.
//
// WHY THIS EXISTS. `astro build` can emit a dist/ that cannot be imported. The build
// bundles src/ but leaves dependencies EXTERNAL, so nothing resolves `import … from
// 'cookie'` until node loads the entry — and a dependency that renamed an export
// between two versions produces a green build and a server that dies on its first boot
// with `does not provide an export named 'parse'`. That is exactly what shipped: astro
// 7.3 moved to cookie@2, which renamed `parse`/`serialize` to
// `parseCookie`/`stringifyCookie`. A build-only CI cannot see it. This can.
//
// WHAT IT ASSERTS. A bad external import kills the process during startup, before it
// ever listens — so "boots, stays up, and answers an HTTP request" is a complete guard
// for that class. The probe is `/api/openapi.json`: no database, no upstream.
//
// It accepts 200 OR 404, and that is deliberate. `apiDocsEnabled` is
// `import.meta.env.DEV || API_DOCS_ENABLED`, and API_DOCS_ENABLED is an astro:env field
// with `access: 'public'` — INLINED AT BUILD, not read at runtime (the comment in
// src/lib/api-docs.ts saying a built server can opt in via env is wrong about this). So
// a production build serves 404 here and no runtime env can change it. Both statuses
// prove the same thing: the entry and its chunks resolved and the router ran. Gating on
// 200 would only mean CI had to build with a flag production does not use, making the
// artifact under test differ from the artifact that ships. When the spec IS served, the
// document is validated too — generating it eagerly imports every
// `src/schemas/**/openapi.ts` (see lib/openapi/auto-load.ts).
//
// READINESS IS TIED TO OUR CHILD, NOT TO THE PORT. The first version of this script
// polled the port until something answered, and a stale server left listening by an
// earlier run answered for it — so it reported a green boot for a dist/ that could not
// be imported at all. A smoke test that can pass while the thing it tests is dead is
// worse than no smoke test. Now the port is checked to be free BEFORE spawning (an
// occupied port is a hard error, never a silent pass) and readiness comes from the
// child's own stdout.
//
// The env below is DUMMY. astro:env validates that the vars are present and typed at
// startup, not that they point anywhere real — nothing here connects to a database or
// to APISIX, so the values only have to satisfy the schema in astro.config.mjs.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const entry = path.join(root, 'dist', 'server', 'entry.mjs');
const HOST = '127.0.0.1';
const PORT = Number(process.env.SMOKE_PORT || 4399);
const BOOT_TIMEOUT_MS = 60_000;

if (!existsSync(entry)) {
  console.error(`[smoke] ${entry} not found — run \`npm run build\` first.`);
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
};

const server = spawn(process.execPath, [entry], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });

let output = '';
let settled = false;
let resolveReady;
const ready = new Promise((r) => (resolveReady = r));

/** Print whatever the server said before dying — the import error lives in there. */
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
  // @astrojs/node standalone announces itself once the HTTP server is up. This — not a
  // successful connection to the port — is what proves OUR process is the one serving.
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

let detail = 'spec disabled by API_DOCS_ENABLED (404) — boot and routing verified';
if (res.status === 200) {
  const body = await res.json().catch(() => null);
  if (!body || typeof body.openapi !== 'string') {
    fail(`GET /api/openapi.json did not return an OpenAPI document (got: ${JSON.stringify(body)?.slice(0, 200)})`);
  }
  const paths = Object.keys(body.paths || {}).length;
  if (paths === 0) fail('the OpenAPI document has no paths — the schema auto-load found nothing');
  detail = `served ${paths} documented paths`;
}

settled = true;
server.removeAllListeners('exit');
server.kill();
console.log(`[smoke] OK — compiled server booted and answered on ${HOST}:${PORT}: ${detail}`);
process.exit(0);
