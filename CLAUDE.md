# CLAUDE.md

Guidance for Claude Code when working in this repository (Cosmos Pay developer platform —
Astro SSR portal + its own REST API under `src/pages/api/`).

## Commands

```bash
npm run dev          # astro dev --host (predev runs prisma migrate deploy + ensure-docs)
npm run build        # prisma generate -> docs:build (Fumadocs export) -> astro build
npm test             # unit suite (node:test over src/lib, no DB, no astro:env)
npm run test:smoke   # boots dist/ and makes one real request — catches broken external imports
npm run check:openapi # fails if any src/pages/api route is missing from the OpenAPI document
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
- **Intentionally undocumented routes must say so in a comment** at the top of the route file
  (e.g. `src/pages/api/auth/[...all]/index.ts`, Better Auth's own handler). Silence reads as
  an oversight; a one-line reason reads as a decision.

### Verify before you call it done

`npm run check:openapi` first — it fails, by name, on any route operation that is not in the
document. Then `npm run dev` and open http://localhost:4321/swagger to confirm the operation
renders, expands, and that its schemas resolve. Both `/swagger` and `/api/openapi.json` are gated by
`apiDocsEnabled` (`src/lib/api-docs.ts`): on in dev, off in production unless `API_DOCS_ENABLED`
is set. That flag is an `astro:env` field with `access: 'public'`, so it is **inlined at build
time** — a production build serves 404 there and no runtime env var changes it; to expose the
reference on staging, build with the flag set.

### Current coverage

**114 of 114 route operations are documented**, plus the external `/cosmos-api/{path}` gateway
route — 88 paths in the document. One route is deliberately excluded and named with its
reason in `scripts/check-openapi-coverage.mjs`: `/api/auth/{all}`, which is Better Auth's own
handler. Keep it that way: `npm run check:openapi` is the check that says so, and an endpoint
is either documented or listed in that exclusion map with a reason — never just missing.

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


## A recovery deployment is this same app, configured to be one

SEP-10 web auth (`/api/sep10/auth`) and SEP-30 account recovery (`/api/recovery/*`) answer
only where `RECOVERY_ROLE` and the keys beside it are set; every other deployment returns
503 there, which is not an error so much as "this host is not that server".

**It takes TWO of them, and they must really be two.** Each holds one of the two signers an
account is recovered with, at half the account's threshold, so that neither can act alone —
`src/lib/recovery-setup.ts` has the arithmetic. Two deployments sharing `RECOVERY_SIGNER_MASTER`,
or sitting behind one host, are one server wearing two names, and a single compromise is then
a whole account. `RECOVERY_ROLE` is not cosmetic either: it goes into every key derived here,
so changing it on a live server orphans every account already registered against the old one.

Four rules the server side rests on:

- **The signing key is derived per account, and never leaves.** `signerFor` (HKDF from the
  master) means there is no key of ours anywhere but on the ledger, and `signRecovery` returns
  a raw SIGNATURE, never a signed envelope — the wallet is collecting two and assembles the
  transaction itself. A server that returned an envelope would be inviting the other one to be
  dropped.
- **`signRefusal` (`src/lib/recovery-core.ts`) is the whole of what a compromised identity can
  ask for.** SEP-30 leaves the policy to the server, and the generous reading — sign whatever an
  authenticated identity asks — makes each server a payment service for anyone who can receive
  the person's email. The narrow reading is: the source is the registered account, the operations
  are a signer/threshold change on it (with the sponsorship pair), the window is bounded, and the
  signer is an ordinary key. It is pure, and `tests/unit/recovery.test.ts` is where it is pinned.
- **Registering, and changing who may recover, need the ACCOUNT's own key** (a SEP-10 token).
  An identity that could add itself would be a way in rather than a way back. The identity token
  (`/api/recovery/identity`, minted from a wallet sign-in) can only read and ask for a signature,
  and is scoped to one server's audience so the sibling's is refused.
- **The standard endpoints answer in the standard's shape, not in this API's envelope.**
  `/api/sep10/auth` and `/api/recovery/accounts/**` return the bare body their spec describes and
  `{ "error": "..." }` on failure — `src/lib/sep-http.ts`, which also says where the line falls.
  These are endpoints somebody else's wallet calls: a client that reads `signers[0].key` off the
  body gets `undefined` when it is wrapped in `data`, and the failure surfaces as "this server
  returned no signer". Three routes in the same namespace keep the envelope because they are ours
  rather than a standard's: `/api/recovery/info`, `/api/recovery/identity` and the sponsored
  `/api/wallet/recovery/setup`. When adding a route here, the question is not which folder it is
  in — it is whether a spec describes its body.
- **`POST /accounts/{address}` is 409 on an account already registered**, and PUT is how identities
  change. A POST that quietly replaced them would let a client that believes it is creating an
  account change who may recover an existing one and never find out. `DELETE` answers with the
  account it deleted, per SEP-30 — the last moment a client can be told which signer it still has
  to take off the ledger.
- **`GET /accounts` is paged with SEP-30's `after` cursor**, keyset over the address and ordered by
  it. The order is the load-bearing half: this query used to take 100 rows in whatever order the
  database gave them, so there was no page two and no way to ask for one, and an identity with
  more accounts than that had some of them permanently invisible — which reads, to the person
  looking, exactly like an account that was never registered. `listWhere` (pure, in
  `recovery-core.ts`) ANDs the cursor with the caller's scope rather than merging it, so a cursor
  off the URL can narrow what is visible and never widen it.
- **`/.well-known/stellar.toml` is how anyone who is not our wallet discovers this server.**
  SEP-30 defines no discovery at all; SEP-10 does, and `SIGNING_KEY` is the field that makes the
  challenge exchange a proof rather than a ritual — a client that cannot check it knows the
  challenge is safe to sign but not who asked. It is derived from the signing secret, never
  configured beside it. `HOME_DOMAIN` is published because the two servers are different hosts
  that deliberately name the SAME wallet: a client is meant to require both to agree on it, and
  one that assumed the home domain was just the host it fetched the file from would see the pair
  disagree by construction and refuse every configuration.
- **Sponsoring is the operator's offer, not either server's.** `/api/wallet/recovery/setup` lives
  on the main platform, pays the two signer entries' reserve and signs as sponsor only. The
  account's own signature is deliberately missing: the wallet adds it after its guard has decoded
  every operation.

Separately, and regardless of whether a deployment is a recovery server: a wallet that HAS been
recovered signs with a key that replaced its account's master. `src/lib/account-signers.ts` is
what lets it still sign in — the address first, with no network call, and only on failure the
account's current signers from `STELLAR_HORIZON_URL`. Mainnet only, and the operator's URL rather
than the request's, because an address on mainnet can also be created on testnet by anyone who
could then put their own signer on it. Read that file's header before widening it.
