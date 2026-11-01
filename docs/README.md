# Cosmos Pay Docs (`/docs`)

A [Fumadocs](https://fumadocs.dev) (Next.js, static export) subproject that documents both
the **Cosmos Pay SDK** and the **Payments REST API**. It is built as a static site and
mounted at **`dev.cosmospay.lat/docs`** by the Astro portal: one repo, one deploy.

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

## Search engines and AI agents

Each page's metadata comes from `src/lib/seo.ts` (through `generateMetadata` in
`src/app/(docs)/[[...slug]]/page.tsx`): a title unique within its language ("Webhooks | SDK",
then the " | Cosmos Pay Docs" template), the description, an absolute trailing-slash canonical,
hreflang between the page and its real translations (+ `x-default`), Open Graph / Twitter with
the portal's `/og-image.png`, a `text/markdown` alternate pointing at its `content.md`, and a
JSON-LD graph (TechArticle + BreadcrumbList; the docs home is a WebPage with the API and SDK).

- **Translations.** A locale only has the pages in `content-i18n/<lang>/`. Every other page is
  still exported under the locale prefix (so the localized sidebar is complete), as an English
  copy that is `noindex`, canonical to the English URL and left out of hreflang, the sitemap and
  the llms files (`isTranslation` in `src/lib/source.ts`). The root layout renders `lang="en"`;
  `scripts/set-html-lang.mjs` (`postbuild`) sets each locale's pages to their language and the
  Provider keeps it in step on client navigation. The sidebar footer links the page's other
  languages as plain `<a>`s, so crawlers find them.
- **Files next to the pages** (`src/app/*`, exported to `/docs/<file>`): `sitemap.xml` (every real
  page in every language, with alternates and `lastmod` from git, or the file's modification
  time in a shallow clone), `llms.txt`, `llms-full.txt` (English only, the API reference rendered
  from `openapi.json` by `src/lib/openapi-markdown.ts`), `llms.mdx/[<lang>/]<slug>/content.md`
  and `openapi.json` (this folder's spec, as the API reference renders it).
  `scripts/build-docs.mjs` fails the portal build if one of them is missing.

## Develop

```bash
npm run dev      # generates + syncs, then next dev on http://localhost:3000/docs
npm run build    # static export to ./out (run from the portal: npm run docs:build)
```

Building requires the two sibling repos (`cosmosjs_sdk`, `comos-pay-community-server`) to be
present next to this repo on disk.
