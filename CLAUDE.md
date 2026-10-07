# CLAUDE.md

Guidance for Claude Code when working in this repository (Cosmos Pay developer platform —
Astro SSR portal + its own REST API under `src/pages/api/`).

## Commands

```bash
npm run dev               # astro dev --host; predev runs `prisma migrate deploy` + scripts/ensure-docs.mjs
npm run build             # prisma generate -> docs:build (Fumadocs export into public/docs) -> astro build
npm start                 # node dist/server/entry.mjs; prestart runs ensure-docs. Production runs under PM2
npm test                  # = test:unit — node:test over tests/unit/**/*.test.ts (no DB, no astro:env)
npm run test:smoke        # boots dist/ and makes one real request — catches broken external imports
npm run check:openapi     # fails if any src/pages/api route is missing from this app's OpenAPI document
npm run check:api-spec    # fails if docs/openapi.json differs from the community server's spec
                          #   (OPENAPI_SRC, else the sibling checkout; exits 0 when neither exists)
npm run docs:api          # regenerates docs/openapi.json + the API pages inside docs/
npm run db:migrate        # prisma migrate dev (db:deploy = migrate deploy, db:generate, db:push)
npm run sync:route        # re-points every APISIX route's upstream at COSMOS_API_URL, no restart
npm run export:wallet-data # dumps the retired wallet tables to JSON for the community server
```

## Rule: every API endpoint MUST be documented in OpenAPI/Swagger

The portal serves its own Swagger UI at `/swagger`, backed by `/api/openapi.json`
(`src/pages/api/openapi.json.ts` -> `src/lib/openapi/document.ts`). That reference is only
worth anything if it is complete: **an endpoint that is not registered does not exist as far
as the SDK, the docs and the consumers are concerned.**

So: **adding or changing a route under `src/pages/api/` is not done until the OpenAPI
registration for it lands in the same change.** No "I'll document it later" — that is exactly
how the spec got to the state it is in (see *Current coverage* below). This applies to every
exported HTTP method of the file (`GET`, `POST`, `PATCH`, `DELETE`, `ALL`), each one its own
entry.

### Where the registration goes

Next to the Zod schemas of the module, in `src/schemas/<module>/openapi.ts`.
`src/lib/openapi/auto-load.ts` picks it up with a `/src/schemas/**/openapi.ts` glob — there is
**no central list to edit**, creating the file is enough. Follow the existing shape in
`src/schemas/api-keys/openapi.ts` (session auth + params + body) and
`src/schemas/swaps/openapi.ts` (query params, several response schemas).

```ts
import { errors, jsonOk, registerRoutes, sessionSecurity } from '@/lib/openapi/route-helpers';
import { z } from '@/lib/openapi/zod';

registerRoutes([
  {
    method: 'get',
    path: '/api/products',          // Astro route, with {param} instead of [param]
    tags: ['Products'],
    summary: 'List products',
    description: 'One sentence on what it does and who may call it.',
    security: sessionSecurity,      // or bearerSecurity for APISIX-proxied routes
    request: { query: z.object({ org: z.string().openapi({ param: { name: 'org', in: 'query' } }) }) },
    responses: {
      200: jsonOk(productListSchema, 'ListProductsResponse', 'Products fetched successfully'),
      401: errors.unauthorized,
      500: errors.internalError,
    },
  },
]);
```

### Non-negotiables

- **Import `z` from `@/lib/openapi/zod`**, never from `zod` — in the registration AND in any
  module whose schemas it documents (`src/schemas/*.ts`). `@/lib/openapi/zod` is what runs
  `extendZodWithOpenApi`, and **with zod v4 that extension is not retroactive**: a schema
  constructed before it runs has no `.openapi()` method at all, so the call throws
  `.openapi is not a function`. Under `astro dev` the import order usually hides this; the
  production bundle reorders modules and it fires there — on the one route that serves the
  spec. `registry.register()` is not a way around it (it calls `.openapi()` internally).
- **Wrap every JSON response in the envelope helper** — `jsonOk` / `jsonCreated`, never a bare
  data schema. The API always answers `{ data, code, status, message }`; a spec that documents
  the payload alone is a spec that lies, and "Try it out" in Swagger then shows a mismatch.
- **Errors come from `errors.*`** (`badRequest`, `unauthorized`, `forbidden`, `notFound`,
  `internalError`) — register the statuses the handler can actually return.
- **Path params**: `[id]` -> `{id}`, `[...path]` -> `{path}`, `/index.ts` -> the directory path.
  The string must match the real URL exactly or Swagger's "Try it out" hits a 404.
- **Query and path params need `.openapi({ param: { name, in } })`** or they are dropped from
  the generated document.
- **A new tag needs a line in the `tags` array of `src/lib/openapi/document.ts`.** An
  undeclared tag still renders, but ungrouped and undescribed at the bottom of the page.
- **Give realistic `example` values.** The examples are what people copy into their first call.
- **Intentionally undocumented routes are named, with their reason, in the `EXCLUDED` map of
  `scripts/check-openapi-coverage.mjs`** (today one entry: `/api/auth/{all}`, Better Auth's own
  handler). Silence reads as an oversight; a one-line reason reads as a decision.

### Verify before you call it done

`npm run check:openapi` first — it fails, by name, on any route operation that is not in the
document. Then `npm run dev` and open http://localhost:4321/swagger to confirm the operation
renders, expands, and that its schemas resolve. Both `/swagger` and `/api/openapi.json` are gated by
`apiDocsEnabled` (`src/lib/api-docs.ts`): on in dev, off in production unless `API_DOCS_ENABLED`
is set. That flag is an `astro:env` field with `access: 'public'`, so it is **inlined at build
time** — a production build serves 404 there and no runtime env var changes it; to expose the
reference on staging, build with the flag set.

### Current coverage

**Every route operation is documented**, plus the external `/cosmos-api/{path}` gateway route.
Don't quote a count from here — quote the line `npm run check:openapi` prints
(`OpenAPI coverage: N/N route operations documented (1 explicitly excluded), M paths in the
document.`); a number frozen in this file was wrong within weeks. The one exclusion is
`/api/auth/{all}`, Better Auth's own handler, named with its reason in the `EXCLUDED` map of
`scripts/check-openapi-coverage.mjs`. Keep it that way: an endpoint is either documented or
listed in that map with a reason — never just missing.

### Known-good shape of the generated document

The spec validates against the OpenAPI 3.0 schema (checked with `@apidevtools/swagger-parser`)
and renders in Swagger UI. Two habits keep it that way:

- **Catch-all proxies** (`/api/admin/{path}`, `/api/kyc/{path}`, `/api/onramp/{path}`,
  `/api/offramp/{path}`) are registered once per verb, with the upstream payload documented
  as an open object — restating the Payments API's entities here would be a second copy to
  be wrong about.
- **Upstream shapes come from `src/lib/cosmos.ts`** (the TypeScript interfaces the client
  already declares) or from the Payments API's own spec in `docs/openapi.json`. Don't invent
  field names; both sources are in the repo.


## Wallet sign-in and account recovery live on the community server

The wallet's own sign-in (`/v1/wallet/auth/*`, the backup box), SEP-10 web auth, SEP-30 account
recovery and `/.well-known/stellar.toml` are served by the community server, not by this app —
it is the piece that runs as load-balanced replicas behind APISIX, and each recovery server is a
separate deployment of it with its own database and keys. Do not add routes for them here.

What this app still does for them:

- **Nothing on the request path.** The community server emails the sign-in code and mints the
  wallet's keys in APISIX itself, so no wallet request passes through this platform. The console
  legs it used to call here (`/api/wallet/console/*`) are deleted, and so are their secrets —
  `WALLET_AUTH_CONSOLE_SECRET` and `WALLET_RECOVERY_CONSOLE_SECRETS` no longer exist in
  `astro.config.mjs`. Do not bring them back.
- **The keys it provisioned before that** (`src/lib/wallet-provisioning.ts`): accounts this
  platform provisioned for the wallet still hold dashboard keys, and `src/pages/api/api-keys`
  rotates them with `WALLET_KEY_SCOPES` instead of minting more.
- **The keyless APISIX routes** (`src/utils/apisix.ts`, synced at boot by
  `src/lib/apisix-route.ts`, upstreams re-pointed by `npm run sync:route`):
  - `<route>-oauth-callbacks` — the wallet sign-in's OAuth callback
    (`/v1/wallet/auth/oauth/callback/*`) plus the shared public-key read (`/v1/public-key`). The
    old `<route>-pollar-callback` route is only ever DELETED at boot, never created.
  - `<route>-sep` — `/.well-known/stellar.toml`, `/v1/sep10/*`, `/v1/sep30/*`. It carries NO
    `cors` plugin, because the community server answers CORS itself for those prefixes and two
    `Access-Control-Allow-Origin` headers make a browser refuse the response, and it forwards
    `Authorization`, because there it is the SEP-10 / identity JWT.
  - `<route>-sep-recovery-{a,b}` — optional host-bound copies of the SEP route, one per recovery
    server, from `COSMOS_RECOVERY_{A,B}_HOST` + `_UPSTREAM` (both halves or neither).
- **Its old tables.** `wallet_backup` (encrypted seeds people restore from),
  `wallet_auth_handshake`, `wallet_login_code`, `recovery_account` and `recovery_auth_method` are
  RETIRED but kept: nothing here reads or writes them. Never drop them before
  `npm run export:wallet-data` (`scripts/export-wallet-data.mjs`) has been run and its output
  imported on the community server. `wallet_registration` is retired too — nothing writes it —
  but it is NOT in the export and it is still READ: `isWalletProvisionedUser` uses it to keep
  legacy wallet accounts on the rotate-only key path. Dropping it changes that behaviour, so it
  needs its own decision, not a ride along with the others.

## Talking to the Payments API

This app reaches the Payments API (the community server) server-to-server, not through APISIX
(`src/lib/cosmos.ts`), so it presents what the gateway would have: `X-Gateway-Secret` and the
consumer headers.

- **`COSMOS_GATEWAY_SECRET` must equal the server's `APISIX_GATEWAY_SECRET`.** The server always
  enforces it; empty or mismatched, every Payments API call answers 403. APISIX sets the same
  value on proxied requests (`src/utils/apisix.ts`).
- **`X-Cosmos-Internal` is a MAC, not a flag.** `src/lib/console-marker.ts` mints
  `v1.<unix seconds>.<hex HMAC-SHA256(COSMOS_GATEWAY_SECRET, label + ts)>` per request; the
  server accepts it for five minutes either side of its clock. It used to be the literal `1`,
  trusted only because APISIX strips the header from clients — one forgotten strip from handing
  any API key the cross-tenant admin surface. APISIX still strips it, as defence in depth.
- **The format is one contract across two repositories.** `tests/unit/consoleMarker.test.ts`
  pins a test vector that the server's `src/admin/console-marker.spec.ts` pins too. Change the
  label, the format or the MAC on one side and both tests must change, or every admin screen
  answers 403.
- **`/api/admin/*` is decided HERE, by the signed-in account's role** (`adminProxy` in
  `src/lib/cosmos-proxy.ts`, the same check that gates assigning plans and roles). The server
  holds no admin credential of its own any more; it admits the call on the secret plus the
  marker and audits it under the role this app forwards. There is no admin secret to set.

## Build and deploy gotchas

- **Prisma 7.** The CLI's `DATABASE_URL` lives in `prisma.config.ts`, not in `schema.prisma`'s
  datasource. At runtime the client is built on `@prisma/adapter-pg` in `src/lib/prisma.ts`, fed
  from `astro:env`. The client is generated into `generated/prisma/` (git-ignored) — import
  from there, never from `@prisma/client`.
- **`access: 'public'` env vars are inlined at build.** That covers every `PUBLIC_*` client var
  and the public server flags (`API_DOCS_ENABLED`, `ONBOARDING_ENABLED`, `PLANS_ENABLED`, …):
  changing them in `.env` takes a rebuild, not a restart. `PUBLIC_BETTER_AUTH_URL` must equal
  `BETTER_AUTH_URL` and be in `.env` with its production value BEFORE `npm run build`.
- **Deploy with `npm ci && npm run build`, never `npm install`.** Dependencies are external to
  `dist/`, so a caret that resolves a new minor against an old build only fails when the server
  boots (`does not provide an export named …`, PM2 restart-looping). `npm run test:smoke` is
  the guard for that class. Rebuild after every install.
- **PM2: `devplat` (production, `scripts/start-prod.mjs`) and `devplat-dev` (`astro dev`) both
  bind port 4321** (`ecosystem.config.cjs`). Start one with `--only`, never both.
- **`docs/` is a separate Next.js + Fumadocs app** with its own `package.json` and lockfile. It
  is exported statically into `public/docs`, served at `/docs`. `scripts/ensure-docs.mjs`
  (predev, prestart, and `start-prod.mjs`) rebuilds it only when `public/docs` is missing or a
  docs source is newer than the last build.
- **Two OpenAPI documents, not one.** `docs/openapi.json` is the community server's Payments API
  spec, committed and checked by `npm run check:api-spec`. `/api/openapi.json` is THIS app's own
  API, generated from `src/schemas/**/openapi.ts` and checked by `npm run check:openapi`. The
  rule above about documenting endpoints is about the second.
