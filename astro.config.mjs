// @ts-check
import { defineConfig, envField } from 'astro/config';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';


import node from '@astrojs/node';

import react from '@astrojs/react';
import { loadEnv } from 'vite';

// Dev-only: `astro dev` (Vite) serves exact files from public/ but doesn't resolve directory
// requests (/docs/, /docs/sdk/overview/) to their index.html, so the statically-exported
// Fumadocs site 404s in dev even though the production node adapter serves it fine. This
// middleware serves public/docs at /docs during dev so the route behaves the same as in prod.
function cosmosDocsDevStatic() {
  const root = fileURLToPath(new URL('./public/docs', import.meta.url));
  const TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.map': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
  };
  return {
    name: 'cosmos-docs-dev-static',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url) return next();
        const url = req.url.split('?')[0].split('#')[0];
        if (url !== '/docs' && !url.startsWith('/docs/')) return next();

        // Normalize /docs (no slash) -> /docs/ so relative links resolve.
        if (url === '/docs') {
          res.statusCode = 302;
          res.setHeader('Location', '/docs/');
          return res.end();
        }

        let rel;
        try {
          rel = decodeURIComponent(url.slice('/docs'.length));
        } catch {
          return next();
        }
        // Directory or extensionless path -> its index.html (matches next export trailingSlash).
        let candidate;
        if (rel.endsWith('/')) candidate = path.join(root, rel, 'index.html');
        else if (path.extname(rel)) candidate = path.join(root, rel);
        else candidate = path.join(root, rel, 'index.html');

        const resolved = path.resolve(candidate);
        if (resolved !== root && !resolved.startsWith(root + path.sep)) return next();

        fs.stat(resolved, (err, st) => {
          if (err || !st.isFile()) {
            // Next 16 client-prefetch segment files (`__next.*`) don't exist in a static
            // export, so answer 204 instead of a noisy 404 (navigation still works on click).
            if (url.includes('__next')) {
              res.statusCode = 204;
              return res.end();
            }
            return next();
          }
          res.setHeader('Content-Type', TYPES[path.extname(resolved).toLowerCase()] || 'application/octet-stream');
          fs.createReadStream(resolved).pipe(res);
        });
      });
    },
  };
}

// `virtual:page-dates`: when each source file last changed, from git, read once per build (or
// dev server start). src/lib/seo/page-dates.ts turns it into each indexable page's dateModified
// (JSON-LD) and sitemap lastmod. Without git history (no repository, or a shallow clone such as
// CI's, where every file would date to the one commit) the map is empty and every page dates to
// the build (BUILT_AT).
function cosmosPageDates() {
  const id = 'virtual:page-dates';
  const resolved = `\0${id}`;
  let code;
  const read = () => {
    const cwd = fileURLToPath(new URL('.', import.meta.url));
    const git = (args) => execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
    const dates = {};
    try {
      if (git(['rev-parse', '--is-shallow-repository']).trim() === 'false') {
        // Newest commit first, so the first date seen for a file is its last change. %x00 marks
        // each commit's date line; the file names follow it (repository-relative, as given).
        let current;
        for (const line of git(['log', '--format=%x00%cI', '--name-only', '--', 'src']).split('\n')) {
          if (line.startsWith('\0')) current = line.slice(1).trim();
          else if (line.trim() && current && !(line.trim() in dates)) dates[line.trim()] = current;
        }
      }
    } catch {
      // No git: every page dates to the build.
    }
    return `export const GIT_DATES = ${JSON.stringify(dates)};\nexport const BUILT_AT = ${JSON.stringify(new Date().toISOString())};\n`;
  };
  return {
    name: 'cosmos-page-dates',
    resolveId(source) {
      return source === id ? resolved : undefined;
    },
    load(source) {
      if (source !== resolved) return undefined;
      code ??= read();
      return code;
    },
  };
}

// The three public origins (src/components/cosmos/lib/constants.ts reads the same variables,
// with the same defaults), as hostnames for security.allowedDomains below, plus the company
// site's www host: src/lib/hosts.ts answers it with a 301 to the apex, which it can only do when
// Astro trusts that Host header (otherwise the request is read as the platform's).
const buildEnv = { ...loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), ''), ...process.env };
const SITE_HOST = new URL(buildEnv.PUBLIC_SITE_URL || 'https://cosmospay.lat').hostname;
const PUBLIC_DOMAINS = [
  ...new Set(
    [
      buildEnv.PUBLIC_SITE_URL || 'https://cosmospay.lat',
      buildEnv.PUBLIC_BETTER_AUTH_URL || 'https://dev.cosmospay.lat',
      buildEnv.PUBLIC_PAYMENTS_URL || 'https://payments.cosmospay.lat',
    ].map((origin) => new URL(origin).hostname),
  ),
  ...(SITE_HOST === 'localhost' || /^[\d.]+$/.test(SITE_HOST) ? [] : [`www.${SITE_HOST}`]),
];

// https://astro.build/config
export default defineConfig({
  // The platform's origin. This one app also answers cosmospay.lat and payments.cosmospay.lat
  // (src/lib/hosts.ts); canonical URLs follow the domain a page is served as (CosmosLayout).
  site: 'https://dev.cosmospay.lat',
  env: {
    schema: {
      DATABASE_URL: envField.string({ context: 'server', access: 'secret' }),
      BETTER_AUTH_SECRET: envField.string({ context: 'server', access: 'secret' }),
      BETTER_AUTH_URL: envField.string({ context: 'server', access: 'secret' }),
      // Same URL as BETTER_AUTH_URL, but exposed to the browser bundle so the
      // auth client (src/lib/auth-client.ts) points at the deployed domain in
      // production instead of a hardcoded localhost. Client env vars must be
      // PUBLIC_-prefixed; keep this in sync with BETTER_AUTH_URL. It is also the platform's
      // domain in the host routing (src/lib/hosts.ts).
      PUBLIC_BETTER_AUTH_URL: envField.string({ context: 'client', access: 'public' }),
      // The two other domains this app answers (src/lib/hosts.ts): the company site (landing,
      // /pricing, /tos) and the payments site (hosted checkout per payment link, the SEP-7
      // handler). Each route renders only on its own domain and redirects there from the
      // others. Inlined at build.
      PUBLIC_SITE_URL: envField.string({ context: 'client', access: 'public', optional: true, default: 'https://cosmospay.lat' }),
      PUBLIC_PAYMENTS_URL: envField.string({ context: 'client', access: 'public', optional: true, default: 'https://payments.cosmospay.lat' }),
      // The APISIX gateway INCLUDING its entry prefix. The checkout reads
      // `${PUBLIC_PAYMENTS_API_URL}/v1/payment-links/{id}` from the payer's browser: the server
      // budgets that public read per client address, so it must not be proxied through here.
      PUBLIC_PAYMENTS_API_URL: envField.string({ context: 'client', access: 'public', optional: true, default: 'https://api.cosmospay.lat/cosmos-api' }),
      // The web wallet; it reads `?uri=web+stellar:…` and prefills the payment.
      PUBLIC_WALLET_WEB_URL: envField.string({ context: 'client', access: 'public', optional: true, default: 'https://cosmospay.lat/wallet/' }),
      AUTHENTIK_CLIENT_ID: envField.string({ context: 'server', access: 'secret' }),
      AUTHENTIK_CLIENT_SECRET: envField.string({ context: 'server', access: 'secret' }),
      AUTHENTIK_DISCOVERY_URL: envField.string({ context: 'server', access: 'secret' }),
      APISIX_URL: envField.string({ context: 'server', access: 'secret' }),
      APISIX_ADMIN_KEY: envField.string({ context: 'server', access: 'secret' }),
      APISSIX_ROUTE_ID: envField.string({ context: 'server', access: 'secret' }),
      COSMOS_API_URL: envField.string({ context: 'server', access: 'secret' }),
      COSMOS_API_ENTRY: envField.string({ context: 'server', access: 'secret' }),
      COSMOS_API_REWRITE: envField.string({ context: 'server', access: 'secret' }),
      // Optional recovery hosts. Each SEP-30 recovery server is its OWN community-server
      // deployment (own database, own keys), reached on its own host. With both halves of
      // a pair set, the route sync adds a keyless SEP route (stellar.toml, /v1/sep10/*,
      // /v1/sep30/*) bound to that HOST and pointed at that UPSTREAM; an upstream may be a
      // comma-separated list of host:port replicas. Unset: no such route (src/lib/apisix-route.ts).
      COSMOS_RECOVERY_A_HOST: envField.string({ context: 'server', access: 'secret', optional: true, default: '' }),
      COSMOS_RECOVERY_A_UPSTREAM: envField.string({ context: 'server', access: 'secret', optional: true, default: '' }),
      COSMOS_RECOVERY_B_HOST: envField.string({ context: 'server', access: 'secret', optional: true, default: '' }),
      COSMOS_RECOVERY_B_UPSTREAM: envField.string({ context: 'server', access: 'secret', optional: true, default: '' }),
      // Shared secret APISIX injects on every proxied request (X-Gateway-Secret).
      // The dashboard reaches the Cosmos Payments API server-to-server, so it presents
      // this secret + the consumer identity itself, exactly as the gateway would.
      // Must equal the community server's APISIX_GATEWAY_SECRET; that service always
      // enforces it, so an empty value makes every Payments API call fail with 403.
      COSMOS_GATEWAY_SECRET: envField.string({ context: 'server', access: 'secret', optional: true, default: '' }),
      // Extra browser origins allowed to call this API cross-origin (comma-separated),
      // on top of the built-in defaults (cosmospay.lat, www.cosmospay.lat, dev.cosmospay.lat,
      // localhost, and Capacitor/Ionic webview origins for the CosmosPay Wallet). Handled by
      // src/middleware.ts. Leave empty to use only the defaults.
      CORS_ALLOWED_ORIGINS: envField.string({ context: 'server', access: 'public', optional: true, default: '' }),
      // Origins the APISIX routes allow cross-origin (comma-separated), so the wallet's
      // in-browser calls aren't blocked. Used by createRoute and createCallbackRoute. The public
      // payment-link read (hosted and embedded checkouts) has its own route answering any
      // origin without credentials (src/lib/apisix-keyless.ts), so it does not depend on this.
      COSMOS_API_CORS_ORIGINS: envField.string({ context: 'server', access: 'secret', optional: true, default: 'https://cosmospay.lat,https://dev.cosmospay.lat,https://payments.cosmospay.lat' }),
      // NOTE: the dashboard's /api/admin/* proxy needs NO admin secret of its own. The
      // Payments service used to demand one (COSMOS_ADMIN_API_SECRET, matched against its
      // ADMIN_API_CREDENTIALS) and failed closed without it, so every admin screen answered
      // 401 while the signed-in account's platform rights were perfectly fine. Who may use
      // that surface is decided HERE, against the account role (the same check that gates
      // assigning plans and roles), and the call is admitted there because it carries
      // COSMOS_GATEWAY_SECRET plus X-Cosmos-Internal, which APISIX strips from client
      // requests. Delete both variables from your environment if you still carry them.
      // --- Email (organization invitations / magic links) ---
      // Two transports, in priority order:
      //   1. Resend HTTP API (preferred): set RESEND_API_KEY. Sends over HTTPS (443),
      //      so it works even on hosts that block outbound SMTP ports (OVH, etc.).
      //   2. SMTP fallback: set SMTP_HOST/PORT/USER/PASS/SECURE (e.g. Resend SMTP).
      // In both cases the "from" address is SMTP_FROM and must be a verified sender.
      // When neither is configured, invites can't be sent and the API returns a clear
      // "email not configured" error.
      RESEND_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      SMTP_HOST: envField.string({ context: 'server', access: 'secret', optional: true }),
      SMTP_PORT: envField.number({ context: 'server', access: 'secret', optional: true, default: 587 }),
      SMTP_USER: envField.string({ context: 'server', access: 'secret', optional: true }),
      SMTP_PASS: envField.string({ context: 'server', access: 'secret', optional: true }),
      SMTP_SECURE: envField.boolean({ context: 'server', access: 'secret', optional: true, default: false }),
      SMTP_FROM: envField.string({ context: 'server', access: 'secret', optional: true }),
      // Where the payments gateway's contact form (POST /contact) sends what visitors write; the
      // visitor's address is the reply-to. Unset, it goes to the gateway's public contact address.
      CONTACT_EMAIL: envField.string({ context: 'server', access: 'secret', optional: true }),
      // --- Feature flags (plans & onboarding) ---
      // Whether the multi-step onboarding wizard runs. When false, a default
      // organization is auto-provisioned and the user lands straight on the dashboard.
      ONBOARDING_ENABLED: envField.boolean({ context: 'server', access: 'public', optional: true, default: true }),
      // Master switch for plan features (selection + changing). When false, all plan
      // UI is hidden and everyone stays on the default plan.
      PLANS_ENABLED: envField.boolean({ context: 'server', access: 'public', optional: true, default: true }),
      // Whether regular users may change their own plan. When false, only owner/admin
      // accounts can (e.g. via admin tools): "we manage plans for now".
      ALLOW_USER_PLAN_CHANGES: envField.boolean({ context: 'server', access: 'public', optional: true, default: true }),
      // Comma-separated plan ids offered for self-selection (onboarding + plan modal),
      // e.g. "starter,growth". Empty = every offered plan. The first entry is the plan
      // onboarding preselects. A plan no longer offered (the legacy "community") is ignored.
      ENABLED_PLANS: envField.string({ context: 'server', access: 'public', optional: true, default: '' }),
      // --- API reference (Swagger) ---
      // Exposes the portal's own API reference UI at /swagger (+ the /api/openapi.json spec). It's
      // a developer/internal tool, so it's ON in development and OFF in production by default; set
      // this true to also expose it in a given (e.g. staging) environment.
      API_DOCS_ENABLED: envField.boolean({ context: 'server', access: 'public', optional: true, default: false }),
      // --- Analytics ---
      // Google Analytics 4 Measurement ID (e.g. "G-XXXXXXXXXX"). Exposed to the browser.
      // When empty, the analytics snippet is not injected (no tracking in local dev).
      PUBLIC_GA_ID: envField.string({ context: 'client', access: 'public', optional: true, default: '' }),
      // --- SEO / Google Search Console ---
      // Site-ownership verification token for Google Search Console. Paste only the
      // `content` value from the "HTML tag" verification method (the part inside
      // content="..."), e.g. "abc123…". When set, a
      // <meta name="google-site-verification"> tag is injected on every public page, which is
      // all Search Console needs to verify ownership. Empty = no tag (local dev).
      // (Search Console can also verify via the existing Google Analytics property.)
      PUBLIC_GOOGLE_SITE_VERIFICATION: envField.string({ context: 'client', access: 'public', optional: true, default: '' }),
      // --- SEO / IndexNow (Bing, which feeds ChatGPT search and Copilot, Yandex and the rest) ---
      // The key every domain serves at /<key>.txt (src/pages/[key].txt.ts) and the payments
      // robots.txt allows; `npm run indexnow` (scripts/indexnow.mjs) submits the sitemaps' URLs
      // with it. 8 to 128 characters: letters, digits and "-". The key is public by design;
      // `access: 'secret'` only makes it a runtime read (a restart that reloads .env, no rebuild).
      // Unset: /<key>.txt answers 404 and the script refuses to run.
      INDEXNOW_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },

  vite: {
    // Serve the statically-exported docs at /docs during `astro dev` (see comment above).
    plugins: [cosmosDocsDevStatic(), cosmosPageDates()],
    server: {
      // Hosts allowed to reach the dev server. Without this, Vite rejects
      // requests whose Host header isn't localhost (e.g. when the dev server is
      // proxied behind the dev.cosmospay.lat domain) with a "host not allowed" error.
      allowedHosts: ['dev.cosmospay.lat', 'cosmospay.lat', 'www.cosmospay.lat', 'payments.cosmospay.lat'],
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        // bb.js must never be bundled: it starts its wasm worker relative to its own URL. The ZK
        // pages load it as native ESM from /zk/bb (src/pages/payments/zk/bb) (src/lib/zk/bb-loader.ts), so the
        // SDK's default `import("@aztec/bb.js")` resolves to a stub that says so.
        '@aztec/bb.js': fileURLToPath(new URL('./src/lib/zk/bb-stub.ts', import.meta.url)),
      },
    },
    // noir_js loads its wasm through `new URL(..., import.meta.url)`, which dependency
    // pre-bundling breaks in dev; the production build handles it as an asset.
    optimizeDeps: {
      exclude: ['@noir-lang/noir_js', '@noir-lang/acvm_js', '@noir-lang/noirc_abi'],
    },
    // nodemailer is a server-only, runtime dependency (used by src/lib/mailer.ts for
    // invitation emails). Keep it external so the SSR build doesn't try to bundle it and
    // it's `require`d at runtime instead; install it with `npm install` for email to work.
    ssr: {
      external: ['nodemailer'],
    },
  },

  adapter: node({
    mode: 'standalone',
  }),
  output: 'server',

  security: {
    checkOrigin: false,
    // Astro takes Request.url's host from the Host header only for these domains; for any other
    // it falls back to the server's own address. The middleware routes by hostname
    // (src/lib/hosts.ts), so without them every request behind nginx looks like localhost and
    // lands on the platform, and the site and payments pages redirect to themselves.
    allowedDomains: PUBLIC_DOMAINS.map((hostname) => ({ hostname })),
  },

  integrations: [react()],
});