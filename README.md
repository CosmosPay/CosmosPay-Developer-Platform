# Cosmos Pay — Developer Platform

The developer dashboard for **Cosmos Pay**: a self-service console where developers sign in,
manage their organization, mint API keys, and operate against the Cosmos Pay Payments API
(Stellar SEP-7 payment intents, webhooks, products, customers and analytics).

It is an **Astro** SSR app (Node adapter) that authenticates users through **Authentik**
(OAuth2 via Better Auth), provisions per-user credentials in the **APISIX** gateway, and
proxies the Cosmos Pay Payments API on the developer's behalf.

> Looking for the JS/TS client that calls the public API? See the **[CosmosJS SDK](https://github.com/CosmosPay/CosmosJS_SDK)**.
> Hitting deploy/runtime issues? See **[COMMON_ISSUES.md](./COMMON_ISSUES.md)**.

---

## ✨ Features

- **Auth** — OAuth2 login through Authentik (Better Auth `genericOAuth`), sessions in Postgres.
- **Organizations & teams** — orgs, members, role/permission scoping, email invitations
  (magic links) with per-plan seat limits.
- **API keys** — create/rotate/revoke keys backed by APISIX consumers & credentials, with
  per-key scopes (read/write), role and environment (testnet/mainnet) forwarded downstream.
- **Payments** — create and manage SEP-7 payment intents (`pay`/`tx`), validate transactions.
- **Webhooks** — register endpoints, inspect deliveries, redeliver, rotate signing secrets.
- **Products & customers** — catalog items / price links and merchant-managed customers.
- **Analytics** — summary, balances, API & webhook logs.
- **Plans & onboarding** — feature-flagged onboarding wizard and plan selection.
- **Support** — in-dashboard tickets.
- **i18n** — multi-language UI (en, es, pt, fr, de).

---

## 🧱 Architecture

```
Browser ──▶ Cloudflare ──▶ nginx ──▶ Astro SSR app (this repo, :4321)
                                         │
                  ┌──────────────────────┼───────────────────────────┐
                  ▼                      ▼                            ▼
            Authentik (OAuth2)     Postgres (Prisma)          APISIX gateway
            user login             accounts, orgs,            ├─ admin API: keys/consumers
                                   invitations, tickets       └─ data plane: proxies the
                                                                 Cosmos Pay Payments API
                                                                          │
                                                                          ▼
                                                            Cosmos Pay Payments API
                                                            (NestJS community server, :3000)
```

- The dashboard talks to the **Payments API server-to-server** (`src/lib/cosmos.ts`),
  presenting the gateway secret + the signed-in user's consumer identity — exactly as a
  real API key would after passing through APISIX.
- It (re)syncs an APISIX route to the current `COSMOS_API_URL` on startup
  (`src/lib/apisix-route.ts`) so external API-key traffic is proxied to the Payments API.

**Stack:** Astro 6 (SSR, `@astrojs/node` standalone) · React 19 islands · Better Auth ·
Prisma + PostgreSQL · APISIX · Resend/SMTP (email) · Zod + zod-to-openapi · GSAP.

---

## 📁 Project structure

```text
src/
├── pages/
│   ├── api/              # SSR API routes (account, api-keys, payment-intents,
│   │                     # webhooks, products, customers, organizations, support,
│   │                     # notifications, cosmos proxy, auth catch-all, openapi.json)
│   ├── dashboard.astro   # main app shell
│   ├── onboarding.astro  # onboarding wizard
│   ├── pricing.astro · docs/ · invite/[token].astro · index.astro
├── components/           # UI (cosmos/dashboard views, widgets, modals) + React islands
├── layouts/              # CosmosLayout etc.
├── lib/                  # auth, cosmos (Payments API client), invitations, mailer,
│                         # plans, profile, prisma, apisix-route, notifications, i18n…
├── utils/                # apisix.ts (admin API: routes/consumers/credentials)
├── schemas/              # Zod schemas (OpenAPI source of truth)
├── emails/               # transactional email templates
├── middleware.ts         # session resolution + one-time APISIX route sync
└── styles/
prisma/schema.prisma      # User, Session, Account, Profile, Organization(+Member,
                          # Invitation), Notification, SupportTicket/Message …
ecosystem.config.cjs      # PM2 process config (prod build + dev), loads .env for Prisma
COMMON_ISSUES.md          # production troubleshooting runbook
```

---

## 🔧 Prerequisites

- **Node.js ≥ 22.12**
- **PostgreSQL** (for the dashboard's own accounts/profile data)
- **Authentik** OAuth2 application (the login provider)
- **APISIX** gateway with admin API access
- The **Cosmos Pay Payments API** (NestJS community server) reachable from this app
- An email sender: **Resend** API key (preferred) or any SMTP server

---

## 🚀 Getting started

```bash
# 1. Install
npm install

# 2. Configure — copy the example and fill it in
cp .env.example .env

# 3. Create the schema in your database
npm run db:push

# 4. Run
npm run dev          # http://localhost:4321
```

### Environment variables

All variables are validated via Astro's typed env (`astro.config.mjs`). See
[`.env.example`](./.env.example) for the full, commented list. The essentials:

| Variable | Purpose |
| :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection (Prisma) |
| `BETTER_AUTH_SECRET` | Session signing secret |
| `BETTER_AUTH_URL` / `PUBLIC_BETTER_AUTH_URL` | Public app URL (server + browser). **Must match the deployed domain** |
| `AUTHENTIK_CLIENT_ID` / `_SECRET` / `_DISCOVERY_URL` | Authentik OAuth2 provider |
| `APISIX_URL` / `APISIX_ADMIN_KEY` / `APISSIX_ROUTE_ID` | APISIX admin API + the synced route id |
| `COSMOS_API_URL` | Upstream Payments API the route proxies to |
| `COSMOS_API_ENTRY` / `COSMOS_API_REWRITE` | Public route path + rewrite (`/cosmos-api/* → /$1`) |
| `COSMOS_GATEWAY_SECRET` | `X-Gateway-Secret` for direct server-to-server calls |
| `RESEND_API_KEY` | Resend HTTP email (preferred). Falls back to `SMTP_*` if unset |
| `SMTP_HOST/PORT/USER/PASS/SECURE` / `SMTP_FROM` | SMTP transport + verified sender |
| `ONBOARDING_ENABLED` / `PLANS_ENABLED` / `ALLOW_USER_PLAN_CHANGES` / `ENABLED_PLANS` | Feature flags |

> ⚠️ `PUBLIC_BETTER_AUTH_URL` is **inlined at build time** — change it before `npm run build`,
> not just before restarting. See [COMMON_ISSUES.md](./COMMON_ISSUES.md) for the why.

### External setup checklist

- **Authentik:** register a Redirect URI of `https://<your-domain>/api/auth/oauth2/callback/ak`.
- **Email:** verify your `SMTP_FROM` domain in Resend (SPF/DKIM).
- **APISIX:** point `APISIX_URL` at the **local/internal** admin API (never expose it publicly).

---

## 🧞 Commands

| Command | Action |
| :--- | :--- |
| `npm run dev` | Dev server with HMR at `localhost:4321` (`--host`) |
| `npm run build` | `prisma generate` + production build → `dist/` |
| `npm run start` | Run the built server (`node ./dist/server/entry.mjs`) |
| `npm run preview` | Preview the build locally |
| `npm run db:generate` | Regenerate the Prisma client |
| `npm run db:push` | Push the Prisma schema to the database |
| `npm run sync:route` | Manually (re)sync the APISIX route |

---

## 🏗️ Production deployment (PM2)

The repo ships an [`ecosystem.config.cjs`](./ecosystem.config.cjs) that loads `.env` into the
process (so Prisma sees `DATABASE_URL`) and defines two apps that share it:

```bash
# Build, then run the compiled server
npm run build
pm2 start ecosystem.config.cjs --only devplat       # production
pm2 save

# (dev variant — astro dev, do NOT run alongside devplat: same port 4321)
pm2 start ecosystem.config.cjs --only devplat-dev
```

nginx terminates TLS and proxies the domain to `127.0.0.1:4321`. For the full production
runbook — Cloudflare and OAuth gotchas, the APISIX/Docker upstream, email/SMTP, database init —
read **[COMMON_ISSUES.md](./COMMON_ISSUES.md)**.

---

## 🔌 API

Every route under `src/pages/api/**` is a typed SSR endpoint. A generated OpenAPI document is
served at **`/api/openapi.json`** (schemas live in `src/schemas/`). Highlights:

- `POST /api/auth/[...all]` — Better Auth (OAuth2 sign-in/callback, session, sign-out)
- `GET|POST /api/api-keys` · `…/[id]` — manage APISIX-backed API keys
- `…/api/payment-intents` (+ `/[id]`, `/[id]/validate`) — SEP-7 intents
- `…/api/webhooks` (+ deliveries, ping, rotate-secret) — webhook endpoints
- `…/api/products` · `…/api/customers` — catalog & customers
- `…/api/organizations/[id]/…` — orgs, members, invitations
- `GET /api/cosmos/[metric]` — analytics proxy
- `…/api/support/…` · `…/api/notifications/…` — tickets & notifications

---

## 🔗 Related projects

Part of the Cosmos Pay ecosystem:

- **[CosmosPay Community Server](https://github.com/CosmosPay/CosmosPay-Community-Server)** —
  the NestJS Payments API (Stellar SEP-7 intents, webhooks, products, customers, analytics).
  This is the **upstream** that the dashboard proxies through APISIX.
- **[CosmosJS SDK](https://github.com/CosmosPay/CosmosJS_SDK)** — the object-oriented JS/TS
  client developers use to call the public API with their API keys.

Built on top of:

- **[Authentik](https://goauthentik.io)** ([source](https://github.com/goauthentik/authentik)) —
  the OAuth2 / OpenID Connect identity provider that handles user login.
- **[Apache APISIX](https://apisix.apache.org)** ([source](https://github.com/apache/apisix)) —
  the API gateway where per-user consumers/credentials (API keys) live and through which
  external API traffic is authenticated and proxied to the Payments API.

---

## 📄 License

Proprietary — © Cosmos Pay. All rights reserved.
