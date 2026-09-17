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

**94 of 94 route operations are documented**, plus the external `/cosmos-api/{path}` gateway
route — 72 paths, 108 operations. One route is deliberately excluded and named with its
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
