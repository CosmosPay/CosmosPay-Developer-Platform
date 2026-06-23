// @ts-check
import { defineConfig, envField } from 'astro/config';
import { fileURLToPath } from 'node:url';


import node from '@astrojs/node';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  env: {
    schema: {
      DATABASE_URL: envField.string({ context: 'server', access: 'secret' }),
      BETTER_AUTH_SECRET: envField.string({ context: 'server', access: 'secret' }),
      BETTER_AUTH_URL: envField.string({ context: 'server', access: 'secret' }),
      AUTHENTIK_CLIENT_ID: envField.string({ context: 'server', access: 'secret' }),
      AUTHENTIK_CLIENT_SECRET: envField.string({ context: 'server', access: 'secret' }),
      AUTHENTIK_DISCOVERY_URL: envField.string({ context: 'server', access: 'secret' }),
      APISIX_URL: envField.string({ context: 'server', access: 'secret' }),
      APISIX_ADMIN_KEY: envField.string({ context: 'server', access: 'secret' }),
      APISSIX_ROUTE_ID: envField.string({ context: 'server', access: 'secret' }),
      COSMOS_API_URL: envField.string({ context: 'server', access: 'secret' }),
      COSMOS_API_ENTRY: envField.string({ context: 'server', access: 'secret' }),
      COSMOS_API_REWRITE: envField.string({ context: 'server', access: 'secret' }),
      // Shared secret APISIX injects on every proxied request (X-Gateway-Secret).
      // The dashboard reaches the Cosmos Payments API server-to-server, so it presents
      // this secret + the consumer identity itself, exactly as the gateway would.
      // Optional: leave empty when the upstream runs with ENFORCE_GATEWAY=false (local dev).
      COSMOS_GATEWAY_SECRET: envField.string({ context: 'server', access: 'secret', optional: true, default: '' }),
      // SMTP — used to email organization invitations (magic links). Optional: when
      // unset, invites can't be sent and the API returns a clear "email not configured" error.
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
    },
  },

  vite: {
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