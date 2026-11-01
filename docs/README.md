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
the portal's `/og-image.png`, a `text/markdown` alternate pointing at its Markdown address
(`/docs/<page>.md`), and a JSON-LD graph (the company's Organization, TechArticle +
BreadcrumbList; the docs home is a WebPage with its BreadcrumbList, the API and the SDK).

- **JSON-LD.** The company's nodes are the portal's own: `scripts/sync-portal-ui.mjs` copies
  `src/lib/seo/schema.ts` (and the `plans.ts`, `payments/contact.ts` and `payments/urls.ts` it
  reads), so every page with a graph defines the Organization (`https://cosmospay.lat/#organization`)
  exactly as cosmospay.lat does (`organizationNode` over the same `SOCIAL` profiles), and the docs
  home and the API reference publish the Payments API (`apiNode`, `#api`) and the SDK
  (`sdkNode`, `#sdk`) as the company home does; the portal's `npm run test:smoke` compares them
  byte for byte. The WebSite is `https://dev.cosmospay.lat/docs/#website`. `datePublished` is the
  commit that added the page's source files (the later one, when there are two) and `dateModified` their last
  change (`src/lib/last-modified.ts`, one `git log` pass; a translation dates from its
  `content-i18n/<lang>/` file, an API page also from `openapi.json`). Without git history (shallow
  clone, untracked file) `datePublished` falls back to `dateModified`, and when that is not a git
  date either both are left out.
- **Headings.** `src/components/heading.tsx` replaces Fumadocs' heading in the MDX pages and the
  API reference: the copy-link button is icon-only with a localized `aria-label` (Fumadocs' keys
  in `src/lib/docs-i18n.ts`), so a heading's text is its title alone, without "Copy Anchor Link".

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
  (what the "Copy Markdown" button fetches; `scripts/write-markdown-pages.mjs`, run as
  `postbuild`, copies each to the page's own Markdown address, `/docs/[<lang>/]<slug>.md` and
  `/docs/[<lang>/]index.md` for a home, the one the page's alternate link and every `llms.txt`
  entry name) and `openapi.json` (this folder's spec, as the API reference renders it).
  `scripts/build-docs.mjs` fails the portal build if one of them is missing.
- **No `Accept` negotiation.** The company site and the gateway answer a page's own address with
  Markdown when `Accept` prefers `text/markdown`; the docs cannot: the portal's Node server hands
  out this static export before its middleware runs, so a docs page always answers HTML. Agents
  read the `.md` address the page and `llms.txt` name (an nginx rule could add negotiation later).
- **Export check.** `scripts/build-docs.mjs` then reads `out/sitemap.xml` (every `<loc>` and
  `xhtml:link`) and every exported page's `<link rel="alternate" hreflang>`, and fails the build,
  naming the URLs, if one of them has no exported page, is `noindex` or is canonical to another
  URL (a fallback copy listed by mistake); and it fails when a page links a docs page without its
  trailing slash (nginx answers that form with a 301) or names a Markdown alternate the export
  lacks, or when a page's HTML is over 500 KB (below). `node scripts/build-docs.mjs --check` runs
  only the checks against an existing `docs/out`.

## API reference page size

An API reference page (one per OpenAPI tag) is the client component `<OpenAPIPage>`, so its
props are serialized into the HTML (and into the page's `index.txt`), and everything it renders
on the server is written into the export. They weighed 0.8 to 1.9 MB of HTML each (an SEO audit,
2026-11: close to Googlebot's 2 MB fetch limit), mostly the whole spec in every page, one schema
card per operation, every code sample written twice and a copy-link button per property.
`scripts/build-docs.mjs` now fails the build when any exported page is over **500 KB** (the
largest, `api/kyc/`, was 469 KB when the budget was set). What keeps them there:

- **Each page gets its own part of the spec.** `pagePreload` in
  `src/app/(docs)/[[...slug]]/page.tsx` hands `<OpenAPIPage>` the document reduced to the page's
  operations and the components they reach (`src/lib/openapi-prune.ts`, tested in
  `tests/unit/docsOpenapiPrune.test.ts`), not the whole API.
- **`src/components/api-page.tsx` swaps parts of fumadocs-openapi's UI** through its own extension
  points (`components`, `content.render*`), each in `src/components/api/`:
  - `schema-ui.tsx` is fumadocs-openapi 12.5.6's schema UI with the property's copy-link button
    and the breadcrumbs' hidden measuring copy rendered after hydration, and short classes for the
    property rows (`.api-prop`... in `src/app/global.css`). Compare it with upstream's
    `packages/shared-api` schema client when upgrading fumadocs-openapi.
  - `code-block.tsx` writes a code block once, as plain code, and highlights it after hydration
    (the default suspended on Shiki and wrote each block twice).
  - `responses.tsx` lists every status with its description and mounts a status's schema when its
    code is pressed (or when the URL links into it). The page's Markdown lists each response's
    top-level fields (`src/lib/openapi-markdown.ts`), so they stay readable without JavaScript.
  - `operation-layout.tsx` renders the playground bar and the example cards without their
    controls (selects, switch, copy, "send") until hydration, then upstream's.
  - `src/components/heading.tsx` renders its copy-link button after hydration too.
- **What every operation keeps in the server HTML**: its title, method and path, description
  (`showDescription`, which the generated pages left off), authorization, parameters, the request
  body's fields, every response code with its description, and its example request and response.

When the spec outgrows the budget, measure first (what a page's bytes are: the inline
`self.__next_f.push` payload against the markup, and by operation section), then look at the
largest repeated element; a tag with many large operations can also be split in the server's spec.

## Develop

```bash
npm run dev      # generates + syncs, then next dev on http://localhost:3000/docs
npm run build    # static export to ./out (run from the portal: npm run docs:build)
```

Building requires the two sibling repos (`cosmosjs_sdk`, `comos-pay-community-server`) to be
present next to this repo on disk.
