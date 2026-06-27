# Cosmos Pay Docs (`/docs`)

A [Fumadocs](https://fumadocs.dev) (Next.js, static export) subproject that documents both
the **Cosmos Pay SDK** and the **Payments REST API**. It is built as a static site and
mounted at **`dev.cosmospay.lat/docs`** by the Astro portal — one repo, one deploy.

## How it fits together

- `next.config.mjs` → `output: 'export'`, `basePath: '/docs'`, `trailingSlash: true`. The
  whole site lives at the Next app root and every route/asset is prefixed with `/docs`, so
  the export is self-contained.
- The portal's `scripts/build-docs.mjs` runs this build and copies `docs/out` →
  `public/docs`, which Astro then serves. The portal `npm run build` does this automatically;
  `npm run dev` and `npm run start` run `scripts/ensure-docs.mjs` first, which rebuilds the
  docs only when missing or when a source changed (otherwise it's a fast no-op), so `/docs`
  is always present.
- Same origin ⇒ the **better-auth session cookie is shared**, so the navbar shows the
  signed-in user. The navbar itself is the portal's `<Nav>`, reused (see below).

## Generated content (do not hand-edit)

Everything under these paths is generated from the sibling repos and is git-ignored:

| Command | Output | Source |
| --- | --- | --- |
| `npm run generate:sdk` | `content/docs/sdk/**` | `../../cosmosjs_sdk/llms/*.md` |
| `npm run generate:api` | `content/docs/api/**` + `openapi.json` | `../../comos-pay-community-server/openapi/openapi.json` |
| `npm run sync:ui` | `src/components/cosmos`, `src/lib/i18n`, `src/lib/auth-client.ts`, `src/styles/cosmos.css` | the portal's `../src` |

`npm run generate` runs all three. `prebuild`/`predev` run it for you.

The shared navbar is **copied** from the portal (not imported across the project boundary,
which would drag in the portal's Astro middleware). The portal `../src` stays the single
source of truth; the copy script rewrites the one `astro:env/client` import to a Next shim
(`src/shims/astro-env-client.ts`) and marks the copies `// @ts-nocheck`.

Override source locations with `SDK_LLMS_DIR`, `OPENAPI_SRC`, `PORTAL_SRC`,
`COSMOS_API_BASE`, `NEXT_PUBLIC_BETTER_AUTH_URL`.

## Develop

```bash
npm run dev      # generates + syncs, then next dev on http://localhost:3000/docs
npm run build    # static export to ./out (run from the portal: npm run docs:build)
```

Building requires the two sibling repos (`cosmosjs_sdk`, `comos-pay-community-server`) to be
present next to this repo on disk.
