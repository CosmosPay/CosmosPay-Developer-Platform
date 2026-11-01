# Cosmos Pay Developer Platform

The developer dashboard for **Cosmos Pay**: a self-service console where developers sign in,
manage their organization, mint API keys, and operate against the Cosmos Pay Payments API
(multi-chain payment intents on Stellar, Solana and Monad, swaps, webhooks, products, customers
and analytics).

It is an **Astro** SSR app (Node adapter) that authenticates users through **Authentik**
(OAuth2 via Better Auth), provisions per-user credentials in the **APISIX** gateway, and
proxies the Cosmos Pay Payments API on the developer's behalf.

### Three domains, one app

This one Astro app (one build, one PM2 process, one `.env`, one Better Auth) answers three
domains. `src/middleware.ts` routes every request by host with the table in
`src/lib/hosts.ts`:

| Domain | Renders | Pages |
| :--- | :--- | :--- |
| `cosmospay.lat` | The company site: landing, `/pricing`, `/tos` | `src/pages/site/` |
| `dev.cosmospay.lat` | Sign-in (`/login`), dashboard, onboarding, invitations, `/docs`, `/swagger`, `/api/*` | the rest of `src/pages/` |
| `payments.cosmospay.lat` | The payments landing (`/`), the hosted checkout of every payment link (`/{id}`) in the design its merchant picked, design previews (`/preview/{design}`) and the `web+stellar:` handler (`/pay`) | `src/pages/payments/` |

- **A route renders only on the domain that owns it.** Asked on another domain it is a
  **301** to its owner, query kept (308 for non-GET): `cosmospay.lat/dashboard` →
  `dev.cosmospay.lat/dashboard`, `dev.cosmospay.lat/pricing` → `cosmospay.lat/pricing`,
  `dev.cosmospay.lat/pay?uri=…` → `payments.cosmospay.lat/pay?uri=…` (browsers registered the old
  address as their `web+stellar:` handler). A path no domain owns is a 404 on the company and
  payments domains. `www.cosmospay.lat` goes to the apex.
- **The site and payments pages render through an internal rewrite** from `/site/*` and
  `/payments/*`, so their public URLs have no prefix; asked directly, those mounts redirect to
  the public address.
- **One sign-in for everything, one cookie on one host.** Better Auth runs on
  `dev.cosmospay.lat` and its session cookie stays host-only there, never scoped to
  `.cosmospay.lat`, where it would reach the gateway, Authentik and the wallet landing too.
  The company site reads the session with a credentialed call to `/api/auth/get-session`
  (same site, allowed by the CORS layer) and signs out the same way. Signing in always happens
  on `dev.cosmospay.lat/login` (the Authentik callback lives there).
- **`robots.txt` and `sitemap.xml` answer per domain** (`src/pages/robots.txt.ts`,
  `sitemap.xml.ts`), and so does the IndexNow key file `/<INDEXNOW_KEY>.txt`
  (`src/pages/[key].txt.ts`), which `npm run indexnow` relies on to tell Bing, Yandex and the
  other IndexNow engines about new and changed pages (see the deploy steps).

> Looking for the JS/TS client that calls the public API? See the **[CosmosJS SDK](https://github.com/CosmosPay/CosmosJS_SDK)**.
> Hitting deploy/runtime issues? See **[COMMON_ISSUES.md](./COMMON_ISSUES.md)**.

---

## ✨ Features

- **Auth**: OAuth2 login through Authentik (Better Auth `genericOAuth`), sessions in Postgres.
- **Organizations & teams**: orgs, members, role/permission scoping, email invitations
  (magic links) with per-plan seat limits.
- **API keys**: create/rotate/revoke keys backed by APISIX consumers & credentials, with
  per-key scopes (read/write), role and environment (testnet/mainnet) forwarded downstream.
- **Payments**: create and manage payment intents (`pay`/`tx`), validate transactions; every
  link has a hosted checkout page on payments.cosmospay.lat (amount, QR, open-in-wallet, live
  status, countdown) in one of four designs (Classic, Split, Receipt, Card), chosen when the
  link is created and changeable from its detail modal.
- **Embed**: one script for merchants' own sites (`/embed/cosmos-pay.js`, built from
  `src/embed/`): `<cosmos-pay-button>` opens the hosted checkout in a popup and relays its status,
  `<cosmos-pay-checkout>` draws a compact checkout inline.
- **Payments site**: payments.cosmospay.lat's own landing (products, flow, security, developers,
  pricing, FAQ) with the coin-ramp video as its hero.
- **Company site**: the landing, pricing and terms on cosmospay.lat, from the same app.
- **Webhooks**: register endpoints, inspect deliveries, redeliver, rotate signing secrets.
- **Products & customers**: catalog items / price links and merchant-managed customers.
- **Analytics**: summary, balances, API & webhook logs.
- **Client activity**: what the dashboard and the Cosmos Pay Wallet report about
  themselves (errors, timings, transactions), including everything that never became an
  API call; browsable under **Build → Activity log**.
- **Plans & onboarding**: feature-flagged onboarding wizard and plan selection.
- **Support**: in-dashboard tickets.
- **i18n**: multi-language UI (en, es, pt, fr, de).

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
  presenting the gateway secret + the signed-in user's consumer identity, exactly as a
  real API key would after passing through APISIX.
- It (re)syncs the APISIX routes to the current `COSMOS_API_URL` on startup
  (`src/lib/apisix-route.ts`): the key-auth route external API-key traffic is proxied through,
  plus keyless routes for the OAuth callbacks and the shared public key, for the public read of
  one payment link (`/v1/payment-links/*`, its own route with CORS for any origin: the hosted
  checkout and the embedded checkout on merchants' sites call it from the payer's browser)
  and for SEP-1/10/30 (stellar.toml, web auth and account recovery, all served by the
  community server). `COSMOS_API_URL` may list several
  `host:port` replicas, balanced round-robin.

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
│   ├── login.astro       # sign-in entry: 302 straight to Authentik, no view of its own
│   ├── index.astro       # → /dashboard or /login
│   ├── invite/[token].astro · kyc/ · swagger.astro
│   ├── site/             # cosmospay.lat: index (landing), pricing, tos
│   ├── payments/         # payments.cosmospay.lat: index (landing), [id] (hosted checkout),
│   │                     # pay (SEP-7 handler), preview/[design] (checkout design samples)
│   └── robots.txt.ts · sitemap.xml.ts   # per domain
├── components/           # UI (cosmos/dashboard views, widgets, modals) + React islands
├── layouts/              # CosmosLayout etc.
├── lib/                  # auth, cosmos (Payments API client), activity (telemetry
│                         # buffer), rate-limit, invitations, mailer, plans, profile,
│                         # prisma, apisix-route, notifications, i18n…
├── utils/                # apisix.ts (admin API: routes/consumers/credentials)
├── schemas/              # Zod schemas (OpenAPI source of truth)
├── emails/               # transactional email templates
├── embed/                # merchant embed (<cosmos-pay-button>, <cosmos-pay-checkout>),
│                         # bundled by scripts/build-embed.mjs into public/embed/cosmos-pay.js
├── middleware.ts         # session resolution, CORS, one-time APISIX route sync, and
│                         # the activity record of this app's own /api/* traffic
└── styles/
prisma/schema.prisma      # User, Session, Account, Profile, Organization(+Member,
                          # Invitation), Notification, SupportTicket/Message …
ecosystem.config.cjs      # PM2 process config (prod build + dev), loads .env for Prisma
COMMON_ISSUES.md          # production troubleshooting runbook
```

---

## 🔧 Prerequisites

- **Node.js ≥ 22.23.4**
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

# 2. Configure: copy the example and fill it in
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
| `PUBLIC_SITE_URL` / `PUBLIC_PAYMENTS_URL` | The two other domains this app answers (host routing, absolute links, each link's checkout URL). Default to the production domains |
| `PUBLIC_PAYMENTS_API_URL` / `PUBLIC_WALLET_WEB_URL` | The gateway the checkout and the embed read links from (with its entry prefix) and the web wallet the checkout hands Stellar links to. With `PUBLIC_PAYMENTS_URL`, inlined into the embed bundle too |
| `AUTHENTIK_CLIENT_ID` / `_SECRET` / `_DISCOVERY_URL` | Authentik OAuth2 provider |
| `APISIX_URL` / `APISIX_ADMIN_KEY` / `APISSIX_ROUTE_ID` | APISIX admin API + the synced route id |
| `COSMOS_API_URL` | Upstream Payments API the routes proxy to (comma-separated replicas allowed) |
| `COSMOS_RECOVERY_{A,B}_HOST` / `_UPSTREAM` | Optional: a host-bound SEP route per recovery server deployment |
| `COSMOS_API_ENTRY` / `COSMOS_API_REWRITE` | Public route path + rewrite (`/cosmos-api/* → /$1`) |
| `COSMOS_API_CORS_ORIGINS` | Browser origins the gateway's key-auth and callback routes allow (the wallet's origins). Not used by the public payment-link read, whose route answers any origin; applied when the app syncs the routes at boot |
| `COSMOS_GATEWAY_SECRET` | `X-Gateway-Secret` for direct server-to-server calls, and the key of the `X-Cosmos-Internal` marker. **Must equal the community server's `APISIX_GATEWAY_SECRET`** |
| `RESEND_API_KEY` | Resend HTTP email (preferred). Falls back to `SMTP_*` if unset |
| `SMTP_HOST/PORT/USER/PASS/SECURE` / `SMTP_FROM` | SMTP transport + verified sender |
| `ONBOARDING_ENABLED` / `PLANS_ENABLED` / `ALLOW_USER_PLAN_CHANGES` / `ENABLED_PLANS` | Feature flags |
| `INDEXNOW_KEY` | Optional: the IndexNow key every domain serves at `/<key>.txt` (public by design, read at runtime). Unset: that file is a 404 and `npm run indexnow` refuses to run |

> ⚠️ `PUBLIC_BETTER_AUTH_URL` is **inlined at build time**: change it before `npm run build`,
> not just before restarting. See [COMMON_ISSUES.md](./COMMON_ISSUES.md) for the why.

### External setup checklist

- **Authentik:** register a Redirect URI of `https://<your-domain>/api/auth/callback/ak`.
  (better-auth 1.7 rebuilt generic OAuth as a social provider and moved the callback off
  `/api/auth/oauth2/callback/:id`; an instance upgraded from 1.6 must register the new URI
  before the deploy. Authentik accepts both, so keep the old one until the cutover lands.)
- **Email:** verify your `SMTP_FROM` domain in Resend (SPF/DKIM).
- **APISIX:** point `APISIX_URL` at the **local/internal** admin API (never expose it publicly).

---

## 🧞 Commands

| Command | Action |
| :--- | :--- |
| `npm run dev` | Dev server with HMR at `localhost:4321` (`--host`) |
| `npm run build` | `prisma generate` + docs + embed bundle + production build → `dist/` |
| `npm run embed:build` | Bundle `src/embed/` into `public/embed/cosmos-pay.js` with the env's origins inlined (`build` and `predev` run it; `-- --mode development` reads `.env.development`) |
| `npm run start` | Run the built server (`node ./dist/server/entry.mjs`) |
| `npm run preview` | Preview the build locally |
| `npm run db:generate` | Regenerate the Prisma client |
| `npm run db:push` | Push the Prisma schema to the database |
| `npm run sync:route` | Manually re-point the APISIX routes' upstreams |
| `npm run export:wallet-data` | Export the retired wallet backup / recovery tables to JSON for the community server |
| `npm run indexnow` | Dry run: read each domain's live sitemap and print the URLs IndexNow would get (`--since <date>`, `--only site,payments,dev`, `--list`); `-- --submit` sends them |

---

## 🌐 nginx: three domains, one upstream

All three domains proxy to the same process (`127.0.0.1:4321`) and **must pass the original
`Host`**, because that is what the app routes on. Two things stay outside the app:

```nginx
# cosmospay.lat: the web wallet and the passkey files stay on disk (the passkey RP ID is
# cosmospay.lat); everything else is the app.
location /wallet/      { alias /var/www/cosmos-wallet-releases/current/; }   # as today
location /.well-known/ { root  /var/www/...; }                               # as today
location /docs         { return 301 https://dev.cosmospay.lat$request_uri; }

# payments.cosmospay.lat
location /docs         { return 301 https://dev.cosmospay.lat$request_uri; }

# all three
location / {
  proxy_pass http://127.0.0.1:4321;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

The `/docs` rules are there because the docs are a static export the Node server hands out
before the middleware runs, on every host. Everything else is routed by the app. Point
`www.cosmospay.lat` at the same upstream too (the app redirects it to the apex).

## 🏗️ Production deployment (PM2)

The repo ships an [`ecosystem.config.cjs`](./ecosystem.config.cjs) that loads `.env` into the
process (so Prisma sees `DATABASE_URL`) and defines two apps that share it:

```bash
# Install from the lockfile, build, then run the compiled server.
# `npm ci` and not `npm install`: install re-resolves the ranges in package.json, which can
# put a newer minor in node_modules while dist/ is still the build made against the old one.
# Dependencies are external in that bundle, so the mismatch only shows when the server boots
# ("does not provide an export named ...") and PM2 restart-loops. Rebuild after every install.
npm ci
npm run build
pm2 start ecosystem.config.cjs --only devplat       # production
pm2 save

# (dev variant with astro dev; do NOT run it alongside devplat, they share port 4321)
pm2 start ecosystem.config.cjs --only devplat-dev
```

**IndexNow** tells Bing (which also feeds ChatGPT search and Copilot), Yandex and the other
IndexNow engines about new and changed pages right away, instead of on their next crawl:

```bash
# Once: generate a key, put it in the production .env and restart so the process reloads it.
# INDEXNOW_KEY is read at runtime, so no rebuild is needed (ecosystem.config.cjs reads .env
# when the app is started, hence delete + start rather than restart).
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
#   then set INDEXNOW_KEY=<that key> in .env
pm2 delete devplat; pm2 start ecosystem.config.cjs --only devplat; pm2 save
curl https://payments.cosmospay.lat/<that key>.txt     # answers the key on every domain

# After every deploy that changes indexable pages (the company site, the gateway's pages, the docs):
npm run indexnow                      # dry run: the URLs per domain and whether each serves the key
npm run indexnow -- --submit          # send them (200 or 202 per batch; 403 means the key file is missing)
npm run indexnow -- --submit --since 2026-10-31   # only pages whose sitemap lastmod is that recent
```

nginx terminates TLS and proxies the domain to `127.0.0.1:4321`. For the full production
runbook (Cloudflare and OAuth gotchas, the APISIX/Docker upstream, email/SMTP, database init),
read **[COMMON_ISSUES.md](./COMMON_ISSUES.md)**.

---

## 🔌 API

Every route under `src/pages/api/**` is a typed SSR endpoint. A generated OpenAPI document is
served at **`/api/openapi.json`** (schemas live in `src/schemas/`). Highlights:

- `POST /api/auth/[...all]`: Better Auth (OAuth2 sign-in/callback, session, sign-out)
- `GET|POST /api/api-keys` · `…/[id]`: manage APISIX-backed API keys
- `…/api/payment-intents` (+ `/[id]`, `/[id]/validate`): SEP-7 intents
- `…/api/webhooks` (+ deliveries, ping, rotate-secret): webhook endpoints
- `…/api/products` · `…/api/customers`: catalog & customers
- `…/api/organizations/[id]/…`: orgs, members, invitations
- `GET /api/cosmos/[metric]`: analytics proxy
- `GET|POST /api/activity` · `GET /api/activity/summary`: the client-activity feed
  (POST is the dashboard reporting its own page views, actions and errors)
- `POST /api/telemetry` (**public**): activity from a wallet that has no Cosmos Pay
  account yet, forwarded upstream under one shared consumer so it stays anonymous
  rather than being attributed to a guess. Rate-limited per address *and* globally
- `…/api/support/…` · `…/api/notifications/…`: tickets & notifications

---

## 🔗 Related projects

Part of the Cosmos Pay ecosystem:

- **[CosmosPay Community Server](https://github.com/CosmosPay/CosmosPay-Community-Server)**:
  the NestJS Payments API (payment intents and swaps on Stellar, Solana and Monad, webhooks,
  products, customers, analytics).
  This is the **upstream** that the dashboard proxies through APISIX.
- **[CosmosJS SDK](https://github.com/CosmosPay/CosmosJS_SDK)**: the object-oriented JS/TS
  client developers use to call the public API with their API keys.
- **[cosmos-wallet-landing](https://github.com/CosmosPay/cosmos-wallet-landing)**:
  the wallet's own marketing site at wallet.cosmospay.lat.

Built on top of:

- **[Authentik](https://goauthentik.io)** ([source](https://github.com/goauthentik/authentik)):
  the OAuth2 / OpenID Connect identity provider that handles user login.
- **[Apache APISIX](https://apisix.apache.org)** ([source](https://github.com/apache/apisix)):
  the API gateway where per-user consumers/credentials (API keys) live and through which
  external API traffic is authenticated and proxied to the Payments API.

---

## 📄 License

Proprietary. © Cosmos Pay. All rights reserved.
