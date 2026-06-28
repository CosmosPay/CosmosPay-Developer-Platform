/**
 * PM2 process config — defines TWO apps that share the same `.env`:
 *
 *   devplat       → PRODUCTION. Runs scripts/start-prod.mjs, which ensures the /docs site is
 *                   built/mirrored (ensure-docs) and then boots the compiled Astro server
 *                   (@astrojs/node standalone) in the same process. Build first with
 *                   `npm run build` (emits dist/server/entry.mjs).
 *   devplat-dev   → DEVELOPMENT. Runs `astro dev` with Vite/hot-reload (predev ensures /docs).
 *
 * Start ONE of them (they both bind port 4321, so don't run both at once):
 *   pm2 start ecosystem.config.cjs --only devplat        # production
 *   pm2 start ecosystem.config.cjs --only devplat-dev    # development
 *
 * Why the dotenv load: the app reads env vars two ways and in production (no Vite at
 * runtime) BOTH need them in the real `process.env`:
 *   - `astro:env/server` secrets (BETTER_AUTH_SECRET, AUTHENTIK_*, DATABASE_URL, ...)
 *   - Prisma's query engine (reads DATABASE_URL from process.env)
 * Without this, PM2 starts the process without `.env` loaded and Prisma throws
 * "Environment variable not found: DATABASE_URL" → DB requests 500.
 *
 * NOTE: PUBLIC_* client vars (e.g. PUBLIC_BETTER_AUTH_URL) are inlined at BUILD time,
 * so `.env` must hold the production values BEFORE running `npm run build`.
 *
 * Deploy (production):
 *   git pull && npm install && npm run build
 *   pm2 delete devplat; pm2 start ecosystem.config.cjs --only devplat; pm2 save
 */
const { parsed } = require('dotenv').config({ path: __dirname + '/.env' });

// nginx proxies to this host:port; keep it on localhost + the default Astro port.
const env = {
  ...process.env,
  ...parsed,
  HOST: '127.0.0.1',
  PORT: '4321',
  // Server-to-server OAuth (discovery/token/userinfo) reaches Authentik through the
  // local nginx, which serves a Cloudflare Origin Certificate that Node doesn't trust
  // by default → "unable to verify the first certificate". Point Node at the Cloudflare
  // Origin CA root so it trusts that cert WITHOUT disabling TLS verification globally.
  // Download the root on the server (see deploy notes); override the path via .env if needed.
  NODE_EXTRA_CA_CERTS:
    parsed?.NODE_EXTRA_CA_CERTS || '/etc/ssl/certs/cloudflare_origin_root.pem',
};

module.exports = {
  apps: [
    {
      name: 'devplat',
      // Ensures /docs is built (ensure-docs) before booting the compiled server — so bringing
      // the ecosystem up always serves an up-to-date /docs, even without a fresh `npm run build`.
      script: './scripts/start-prod.mjs',
      cwd: __dirname,
      env,
    },
    {
      name: 'devplat-dev',
      script: 'npm',
      args: 'run dev',
      cwd: __dirname,
      env,
    },
  ],
};
