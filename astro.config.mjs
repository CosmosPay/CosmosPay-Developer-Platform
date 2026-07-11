// @ts-check
import { defineConfig, envField } from 'astro/config';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';


import node from '@astrojs/node';

import react from '@astrojs/react';

// Dev-only: `astro dev` (Vite) serves exact files from public/ but doesn't resolve directory
// requests (/docs/, /docs/sdk/overview/) to their index.html — so the statically-exported
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
            // export — answer 204 instead of a noisy 404 (navigation still works on click).
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

// https://astro.build/config
export default defineConfig({
  // Canonical public origin — used for SEO canonical/OG URLs and the sitemap. Change this
  // if the public site moves to another domain.
  site: 'https://dev.cosmospay.lat',
  env: {
    schema: {
      DATABASE_URL: envField.string({ context: 'server', access: 'secret' }),
      BETTER_AUTH_SECRET: envField.string({ context: 'server', access: 'secret' }),
      BETTER_AUTH_URL: envField.string({ context: 'server', access: 'secret' }),
      // Same URL as BETTER_AUTH_URL, but exposed to the browser bundle so the
      // auth client (src/lib/auth-client.ts) points at the deployed domain in
      // production instead of a hardcoded localhost. Client env vars must be
      // PUBLIC_-prefixed; keep this in sync with BETTER_AUTH_URL.
      PUBLIC_BETTER_AUTH_URL: envField.string({ context: 'client', access: 'public' }),
      AUTHENTIK_CLIENT_ID: envField.string({ context: 'server', access: 'secret' }),
      AUTHENTIK_CLIENT_SECRET: envField.string({ context: 'server', access: 'secret' }),
      AUTHENTIK_DISCOVERY_URL: envField.string({ context: 'server', access: 'secret' }),
      // Authentik admin API (e.g. https://auth.cosmospay.lat) + a token, used to create an
      // Authentik identity when a wallet user provisions an account, so they can later log
      // in at auth.cosmospay.lat. Optional: when unset, the dev-platform account is still
      // created and will link to Authentik on first OAuth sign-in (account linking is on).
      AUTHENTIK_API_URL: envField.string({ context: 'server', access: 'secret', optional: true, default: '' }),
      AUTHENTIK_API_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true, default: '' }),
      APISIX_URL: envField.string({ context: 'server', access: 'secret' }),
      APISIX_ADMIN_KEY: envField.string({ context: 'server', access: 'secret' }),
      APISSIX_ROUTE_ID: envField.string({ context: 'server', access: 'secret' }),
      COSMOS_API_URL: envField.string({ context: 'server', access: 'secret' }),
      COSMOS_API_ENTRY: envField.string({ context: 'server', access: 'secret' }),
      COSMOS_API_REWRITE: envField.string({ context: 'server', access: 'secret' }),
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
      // Origins the APISIX swap/data-plane route allows cross-origin (comma-separated), so
      // the wallet's in-browser swap calls to the gateway aren't blocked. Used by createRoute.
      COSMOS_API_CORS_ORIGINS: envField.string({ context: 'server', access: 'secret', optional: true, default: 'https://cosmospay.lat,https://dev.cosmospay.lat' }),
      // --- Email (organization invitations / magic links) ---
      // Two transports, in priority order:
      //   1. Resend HTTP API (preferred) — set RESEND_API_KEY. Sends over HTTPS (443),
      //      so it works even on hosts that block outbound SMTP ports (OVH, etc.).
      //   2. SMTP fallback — set SMTP_HOST/PORT/USER/PASS/SECURE (e.g. Resend SMTP).
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
      // --- Feature flags (plans & onboarding) ---
      // Whether the multi-step onboarding wizard runs. When false, a default
      // organization is auto-provisioned and the user lands straight on the dashboard.
      ONBOARDING_ENABLED: envField.boolean({ context: 'server', access: 'public', optional: true, default: true }),
      // Master switch for plan features (selection + changing). When false, all plan
      // UI is hidden and everyone stays on the default plan.
      PLANS_ENABLED: envField.boolean({ context: 'server', access: 'public', optional: true, default: true }),
      // Whether regular users may change their own plan. When false, only owner/admin
      // accounts can (e.g. via admin tools) — "we manage plans for now".
      ALLOW_USER_PLAN_CHANGES: envField.boolean({ context: 'server', access: 'public', optional: true, default: true }),
      // Comma-separated plan ids offered for self-selection (onboarding + plan modal),
      // e.g. "community". Empty = all plans. The first entry is the default plan.
      ENABLED_PLANS: envField.string({ context: 'server', access: 'public', optional: true, default: '' }),
      // --- API reference (Swagger) ---
      // Exposes the portal's own API reference UI at /swagger (+ the /api/openapi.json spec). It's
      // a developer/internal tool, so it's ON in development and OFF in production by default — set
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
      // <meta name="google-site-verification"> tag is injected on every public page —
      // all Search Console needs to verify ownership. Empty = no tag (local dev).
      // (Search Console can also verify via the existing Google Analytics property.)
      PUBLIC_GOOGLE_SITE_VERIFICATION: envField.string({ context: 'client', access: 'public', optional: true, default: '' }),
    },
  },

  vite: {
    // Serve the statically-exported docs at /docs during `astro dev` (see comment above).
    plugins: [cosmosDocsDevStatic()],
    server: {
      // Hosts allowed to reach the dev server. Without this, Vite rejects
      // requests whose Host header isn't localhost (e.g. when the dev server is
      // proxied behind the dev.cosmospay.lat domain) with a "host not allowed" error.
      allowedHosts: ['dev.cosmospay.lat'],
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    // nodemailer is a server-only, runtime dependency (used by src/lib/mailer.ts for
    // invitation emails). Keep it external so the SSR build doesn't try to bundle it and
    // it's `require`d at runtime instead — install it with `npm install` for email to work.
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
  },

  integrations: [react()],
});