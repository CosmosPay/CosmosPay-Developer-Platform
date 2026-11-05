// `npm run dev:mock`: the portal on sample data, with no Postgres, no Authentik and no Payments
// API (src/lib/mock). Every visitor is signed in as the sample account, every /api/* request is
// answered from memory, and what you create or delete lasts until the server stops. The three
// domains run on *.localhost names: dev.cosmospay.localhost (dashboard), payments.cosmospay.localhost
// (payments site and the sample links' checkout) and cosmospay.localhost (company site).
//
//   npm run dev:mock                         owner account on Growth, port 4321
//   npm run dev:mock -- --role user          a regular account (no admin or support views)
//   npm run dev:mock -- --plan starter       the plan of the account and its organizations
//   npm run dev:mock -- --fresh              a new account with no organization (onboarding)
//   npm run dev:mock -- --latency 800        slow every API answer, to look at the skeletons
//   npm run dev:mock -- --port 4322          another port (the auth URLs follow it)
//   npm run dev:mock -- --auto               real backend when it answers, mock otherwise
//
// Dev server only: a production build ignores COSMOS_MOCK.
import { spawn, execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { parse as parseEnv } from 'dotenv';

const root = path.resolve(import.meta.dirname, '..');
const ROLES = ['user', 'support', 'admin', 'owner'];
const PLANS = ['community', 'starter', 'essentials', 'growth', 'enterprise'];

function usage(code = 0) {
  const text = readFileSync(new URL(import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.startsWith('//   '))
    .map((l) => l.slice(2))
    .join('\n');
  console.log(`Usage:\n${text}`);
  process.exit(code);
}

function parseArgs(argv) {
  const opts = { role: 'owner', plan: 'growth', fresh: false, latency: 0, port: null, auto: false };
  for (let i = 0; i < argv.length; i++) {
    const [flag, inline] = argv[i].split('=');
    const value = () => inline ?? argv[++i];
    switch (flag) {
      case '--role': opts.role = String(value()).toLowerCase(); break;
      case '--plan': opts.plan = String(value()).toLowerCase(); break;
      case '--fresh': opts.fresh = true; break;
      case '--latency': opts.latency = Number(value()); break;
      case '--port': opts.port = Number(value()); break;
      case '--auto': opts.auto = true; break;
      case '-h': case '--help': usage(); break;
      default: console.error(`[dev:mock] unknown option ${argv[i]}`); usage(1);
    }
  }
  if (!ROLES.includes(opts.role)) { console.error(`[dev:mock] --role must be one of ${ROLES.join(', ')}`); process.exit(1); }
  if (!PLANS.includes(opts.plan)) { console.error(`[dev:mock] --plan must be one of ${PLANS.join(', ')}`); process.exit(1); }
  if (!Number.isFinite(opts.latency) || opts.latency < 0) { console.error('[dev:mock] --latency takes milliseconds'); process.exit(1); }
  if (opts.port !== null && !(Number.isInteger(opts.port) && opts.port > 0 && opts.port < 65536)) { console.error('[dev:mock] --port takes a port number'); process.exit(1); }
  return opts;
}

/* The .env values (if any), under whatever the shell already set. */
function fileEnv() {
  const file = path.join(root, '.env');
  return existsSync(file) ? parseEnv(readFileSync(file)) : {};
}

/* The astro:env fields astro.config.mjs declares without `optional: true`: the server refuses to
   start without them, so the mock gives each a placeholder when neither the shell nor .env has it. */
function requiredEnvFields() {
  const config = readFileSync(path.join(root, 'astro.config.mjs'), 'utf8');
  const out = [];
  for (const m of config.matchAll(/(\w+):\s*envField\.\w+\(\{([^}]*)\}\)/g)) {
    if (!/optional:\s*true/.test(m[2])) out.push(m[1]);
  }
  return out;
}

function placeholder(name, origin) {
  if (name === 'DATABASE_URL') return 'postgresql://mock:mock@127.0.0.1:1/mock';
  if (name === 'BETTER_AUTH_URL' || name === 'PUBLIC_BETTER_AUTH_URL') return origin;
  if (name === 'COSMOS_API_ENTRY') return '/cosmos-api/*';
  if (name === 'COSMOS_API_REWRITE') return '["^/cosmos-api/(.*)","/$1"]';
  if (name.endsWith('_URL')) return 'http://127.0.0.1:1';
  return 'mock';
}

/* host:port of a URL-ish value ("postgresql://u:p@h:5432/db", "http://h:3000", "h:3000,h2:3001"). */
function endpointOf(raw, defaultPort) {
  const first = String(raw || '').split(',')[0].trim();
  if (!first) return null;
  try {
    const u = new URL(first.includes('://') ? first : `http://${first}`);
    return { host: u.hostname, port: Number(u.port) || defaultPort };
  } catch {
    return null;
  }
}

function reachable(endpoint, timeoutMs = 1500) {
  if (!endpoint) return Promise.resolve(false);
  return new Promise((resolve) => {
    const socket = net.connect(endpoint.port, endpoint.host);
    const done = (ok) => { socket.destroy(); resolve(ok); };
    socket.setTimeout(timeoutMs, () => done(false));
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
  });
}

/* Whether nothing listens on the port yet: on every interface (as `astro dev --host` binds) and on
   the IPv4 loopback alone, where another server bound only to it still takes `localhost` from us. */
function listens(port, host) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.listen(port, host, () => server.close(() => resolve(true)));
  });
}

async function portFree(port) {
  return (await listens(port)) && (await listens(port, '127.0.0.1'));
}

async function freePort(from) {
  for (let port = from; port < from + 50; port++) if (await portFree(port)) return port;
  return from;
}

function run(cmd, env = process.env) {
  execSync(cmd, { cwd: root, stdio: 'inherit', env });
}

function startAstro(env, port) {
  const bin = path.join(root, 'node_modules', 'astro', 'bin', 'astro.mjs');
  const args = [bin, 'dev', '--host', ...(port ? ['--port', String(port)] : [])];
  const child = spawn(process.execPath, args, { cwd: root, env, stdio: 'inherit' });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
  child.on('exit', (code) => process.exit(code ?? 0));
}

const opts = parseArgs(process.argv.slice(2));
const dotenv = fileEnv();
const read = (name) => process.env[name] ?? dotenv[name];

if (opts.auto) {
  const db = endpointOf(read('DATABASE_URL'), 5432);
  const api = endpointOf(read('COSMOS_API_URL'), 80);
  const [dbUp, apiUp] = await Promise.all([reachable(db), reachable(api)]);
  if (dbUp && apiUp) {
    console.log('[dev:mock] --auto: the database and the Payments API answer, starting the real dev server.');
    const child = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'dev', ...(opts.port ? ['--', '--port', String(opts.port)] : [])], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
    child.on('exit', (code) => process.exit(code ?? 0));
    await new Promise(() => {});
  }
  console.log(`[dev:mock] --auto: ${!dbUp ? 'the database' : 'the Payments API'} does not answer, starting in mock mode.`);
}

// Without --port: 4321, or the next free port when something else holds it (Vite would move on by
// itself, but the sign-in links must name the port the portal really answers on).
const port = opts.port ?? (await freePort(4321));
if (!opts.port && port !== 4321) console.log(`[dev:mock] port 4321 is taken, using ${port}.`);
// The three domains on their own *.localhost names (browsers resolve *.localhost to the loopback),
// one process for all of them as in production (src/lib/hosts.ts), so the company site, the
// payments site and the dashboard link to each other here instead of to production.
const local = (sub) => `http://${sub}cosmospay.localhost:${port}`;
const origins = { dev: local('dev.'), site: local(''), payments: local('payments.') };
const env = { ...process.env, COSMOS_MOCK: '1', COSMOS_MOCK_ROLE: opts.role, COSMOS_MOCK_PLAN: opts.plan, COSMOS_MOCK_FRESH: opts.fresh ? '1' : '', COSMOS_MOCK_LATENCY: String(opts.latency) };

for (const name of requiredEnvFields()) {
  if (read(name) === undefined || read(name) === '') env[name] = placeholder(name, origins.dev);
}
Object.assign(env, {
  BETTER_AUTH_URL: origins.dev,
  PUBLIC_BETTER_AUTH_URL: origins.dev,
  PUBLIC_SITE_URL: origins.site,
  PUBLIC_PAYMENTS_URL: origins.payments,
  // The checkout and the public swap pages call the gateway from the browser: the mock one
  // (src/lib/mock/gateway.ts) answers them with the dashboard's sample payments and swaps.
  PUBLIC_PAYMENTS_API_URL: `${origins.payments}/mock-gateway`,
  // No analytics hits from local sample pages.
  PUBLIC_GA_ID: '',
});

// What `predev` builds, minus the database migration and the docs: only when it is missing. The
// embed is rebuilt every time, since it inlines the payments origins (now the local ones).
if (!existsSync(path.join(root, 'generated', 'prisma', 'client.ts'))) run('npx prisma generate');
run('node scripts/build-embed.mjs --mode development', env);
if (!existsSync(path.join(root, 'src', 'assets', 'og', 'manifest.json'))) run('npm run og:build -- --mode development');

console.log(
  [
    '',
    '  Cosmos Pay developer portal, MOCK MODE (sample data, nothing is saved)',
    `  Dashboard:     ${origins.dev}/dashboard   (also http://localhost:${port}/dashboard)`,
    `  Payments site: ${origins.payments}/`,
    `  Company site:  ${origins.site}/`,
    `  Account:    ${opts.role} on ${opts.plan}${opts.fresh ? ', no organization yet (onboarding)' : ''}`,
    opts.latency ? `  Latency:    ${opts.latency} ms per API answer` : null,
    '  Sign out works; /login signs back in.',
    '  Better Auth logging "Discovery fetch failed" is expected: there is no Authentik here.',
    '',
  ].filter((l) => l !== null).join('\n'),
);

startAstro(env, port);
