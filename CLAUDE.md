# CLAUDE.md

Guidance for Claude Code when working in this repository (Cosmos Pay developer platform:
Astro SSR portal + its own REST API under `src/pages/api/`).

## Commands

```bash
npm run dev               # astro dev --host; predev runs `prisma migrate deploy` + scripts/ensure-docs.mjs
npm run build             # prisma generate -> docs:build (Fumadocs export into public/docs) -> astro build
npm start                 # node dist/server/entry.mjs; prestart runs ensure-docs. Production runs under PM2
npm test                  # = test:unit (node:test over tests/unit/**/*.test.ts; no DB, no astro:env)
npm run test:smoke        # boots dist/ and makes one real request; catches broken external imports
npm run check:openapi     # fails if any src/pages/api route is missing from this app's OpenAPI document
npm run check:api-spec    # fails if docs/openapi.json differs from the community server's spec
                          #   (OPENAPI_SRC, else the sibling checkout; exits 0 when neither exists)
npm run docs:api          # regenerates docs/openapi.json + the API pages inside docs/
npm run embed:build       # bundles src/embed into public/embed/cosmos-pay.js (run by build and predev)
npm run db:migrate        # prisma migrate dev (db:deploy = migrate deploy, db:generate, db:push)
npm run sync:route        # re-points every APISIX route's upstream at COSMOS_API_URL, no restart
npm run export:wallet-data # dumps the retired wallet tables to JSON for the community server
```

## Writing rule: no em dashes

The product owner forbids the em dash (U+2014) in every context: UI copy in every language,
code comments, docs, commit messages and pull requests. Use a full stop, comma, colon,
parentheses or a conjunction; never an en dash or a spaced hyphen in its place (en dashes stay
only in numeric ranges). An empty table cell shows "-" or a word. Page titles separate with
" | ". The only em dashes left in the repo come from generated files (`docs/openapi.json`,
`docs/content/docs/api/`, `docs/content/docs/sdk/`): fix them in the community server and the
SDK, then regenerate.

## Three domains, one app

| Domain | Area | Pages |
| :--- | :--- | :--- |
| `cosmospay.lat` | `site` | `src/pages/site/`: landing, `/pricing`, `/tos` |
| `dev.cosmospay.lat` | `dev` | everything else in `src/pages/`: `/login`, dashboard, onboarding, invite, kyc, `/docs`, `/swagger`, `/api/*` |
| `payments.cosmospay.lat` | `payments` | `src/pages/payments/`: `/` landing, `/{id}` hosted checkout, `/pay` SEP-7 handler, `/preview/{design}` |

One build, one process, one Better Auth. `src/middleware.ts` applies `routeRequest` from
`src/lib/hosts.ts` (fully covered by `tests/unit/hosts.test.ts`) before any database work:

- **A route renders only on its own domain.** Elsewhere it is a 301 to its owner with the query
  (308 for non-GET); a path nobody owns is a 404 on `site` and `payments` and passes through
  on `dev`. **A new top-level platform route belongs in `DEV_PREFIXES`**, or the other
  domains answer 404 for it instead of redirecting. A new site or payments route needs its
  entry in `ownerOf` and a page under its mount.
- **`/site` and `/payments` are internal mounts**, reached by a rewrite (`next(url)`), never
  by address: asked directly they redirect to the public URL. Inside those pages
  `Astro.url` is the internal path; use `Astro.locals.publicPath` (and `Astro.locals.area`)
  for anything public, as `CosmosLayout` does for canonical URLs.
- **The origins are `PUBLIC_SITE_URL`, `PUBLIC_BETTER_AUTH_URL` (the platform) and
  `PUBLIC_PAYMENTS_URL`**, inlined at build. An unknown host (IP, health check, smoke test) is
  the platform. Links that may render on another domain than their target are absolute, from
  `src/components/cosmos/lib/constants.ts`.
- **Static files skip the middleware** (the Node adapter serves `dist/client` first), so they
  answer on every domain. Fine for assets; the docs export under `/docs` is kept to the
  platform domain by nginx (README → nginx).
- **`robots.txt` and `sitemap.xml` are per-domain endpoints**; never add them to `public/`.

### One auth for all three domains

- Better Auth runs here and its session cookie stays **host-only on the platform domain**.
  Do not scope it to the parent domain (`crossSubDomainCookies`): it would travel to every
  `*.cosmospay.lat` host (the gateway, Authentik, the wallet landing). Pages on the company
  site get `Astro.locals.user` only when served from the platform's own host (local single-host
  setups); otherwise `useDevSession` reads `/api/auth/get-session` cross-origin and the nav
  holds its skeleton (`sessionReady`) until it answers.
- **Sign-in happens on the platform domain only, and there is no sign-in view:** `startLogin()`
  navigates to `/login` there, which starts the Authentik flow on the server
  (`auth.api.signInSocial`) and answers 302 straight to Authentik, forwarding the state cookie.
  It renders something only when the provider cannot be reached (503). `next` must be a
  same-origin path (`src/lib/safe-next.ts`).
- **Authentik must list the callback of the host that serves `/login`:**
  `<PUBLIC_BETTER_AUTH_URL>/api/auth/callback/ak`: `https://dev.cosmospay.lat/api/auth/callback/ak`
  in production, `http://localhost:4321/api/auth/callback/ak` for the default local setup. A local
  multi-domain run on other hosts needs its own callback registered there, or Authentik answers
  "Redirect URI Error".
- Sign-out from the company site is a credentialed cross-origin call
  to `/api/auth/sign-out`: keep `https://cosmospay.lat` in `src/lib/allowed-origins.ts`.

### The payments domain

- **The checkout reads its link from the payer's browser**:
  `GET ${PUBLIC_PAYMENTS_API_URL}/v1/payment-links/{id}` through the gateway's keyless route
  `<route>-payment-links` (GET/OPTIONS, CORS `*` without credentials, priority 15: any
  merchant's site reads it for the embedded checkout; `src/lib/apisix-keyless.ts`). The
  community server writes no CORS there; if it ever does, drop the plugin on that route, as on
  the SEP route, or browsers get two `Access-Control-Allow-Origin` headers and refuse it.
  Never proxy or server-render it: the community server budgets that `@Public()` read per
  client address, and this server would put every payer behind one.
- **`parsePaymentLink` (`src/lib/payments/payment-link.ts`) is the trust boundary**: every
  field is checked, the URI scheme must match the chain, the QR must be a PNG data URL; DOM
  writes are `textContent` or validated attributes, never HTML. A deadline (`expiresAt`) must
  be a readable date or null. Change `PaymentLink`, the
  parser and `tests/unit/paymentLink.test.ts` together with the server's entity.
- **`/pay` never hands a URI to the wallet on arrival.** The URI comes from the query string,
  which any site can choose; the page shows the whole request (issuer, network, `origin_domain`,
  callback host) and calls `requestPayment` only on the payer's click. `parseSep7Pay` refuses what
  it cannot describe AND what a wallet could read differently (a key given twice, a case variant,
  a key SEP-7 does not define), because the wallet gets the URI as received (its `signature`
  covers that exact string).
- **`EXPIRED` is not final** on the server; the page keeps reading expired links slowly and
  stops on paid, failed and cancelled (`nextPollDelay`).
- **Never framable**: the middleware adds `X-Frame-Options: DENY` and `frame-ancestors 'none'`
  to every payments response. Payment pages (checkout, `/pay`, previews) are `noindex` (the
  landing is the one indexed page), and the domain has its own five-language
  catalog (`src/lib/payments/i18n.ts`, parity checked by `tests/unit/paymentsI18n.test.ts`)
  and resolves the language as ?lang → cookie → Accept-Language → en.

### One nav on every view

- **The general nav (`src/components/cosmos/layout/Nav.tsx`) is on every page of the three
  domains.** `CosmosLayout` renders it through the `SiteNav` island unless the page's own React
  tree does (`nav={false}`: Landing, Pricing, Dashboard). `PaymentsLayout` always renders it,
  never reading the session (`session={false}`: the payments domain is not an allowed origin) and
  reloading on a language change, because payments copy is server-rendered.
- Its styles, burger and mobile menu included, live in `cosmos.css`, so any page that loads it
  draws the bar the same way. **At the very top of a page the bar has no surface** (no fill,
  border or blur: `.nav:not(.scrolled):not(.menu-open)`); it takes one back once the page moves
  or the mobile menu opens.
- **Every page also has the footer's social profiles and a back-to-top button.** The profiles
  (X, Instagram, Discord, WhatsApp, LinkedIn) are `SOCIAL` in
  `src/components/cosmos/lib/constants.ts`, drawn by `Social.tsx` with Simple Icons' official
  glyphs (CC0). `BackToTop.astro` (both layouts) appears once the page has moved down a
  screen; it keeps its own five-language label because the layouts read two catalogs.
- **No ghost links.** A menu or footer link renders only when it leads somewhere. The targets are
  listed by catalog position in `NAV_LINKS` / `FEATURED_HREFS` (Nav.tsx) and `FOOT_GROUPS`
  (Footer.tsx); a label whose page does not exist yet stays there commented out. Never ship
  `href="#"`; comment the link out instead.
- **On the payments gateway its own links stay on it.** `Nav` and `Footer` take `area`
  (`PaymentsLayout` and the landing pass `"payments"`): the logo goes to `/`, Pricing to the
  landing's `/#pricing`, and any link into `PAYMENTS` becomes a same-origin path
  (`localHref` / `homeFor` / `pricingFor` in `src/components/cosmos/lib/constants.ts`). Docs and
  sign-in still lead to the platform, where they live. The payments error page's button goes
  to `/` too: a payments page never sends the payer to the company site.

### The institutional skin (payments site and dashboard)

- `src/styles/institutional.css`, switched on by `class="inst"` on `<body>` (`PaymentsLayout`
  always; `CosmosLayout bodyClass="inst"` for the dashboard), re-declares cosmos.css's tokens:
  a light neutral canvas and white cards. **The palette has ranks, set by the product owner:
  black is primary** (buttons, links, figures, the account card: `--btn-bg`, `--accent`,
  `--navy`, all `#13131A`, inverted to white in dark mode), **neutral greys are secondary**
  (canvas, surfaces, lines, tints; no blue cast), and **the corporate blue is tertiary**
  (`--tertiary`: the light buttons' hover ink, the dashboard chart, focus rings). Don't bring blue back
  as a primary colour. It follows the product owner's reference shots; BRAND.md is the
  direction (logo, Open Sauce One), not a hard limit. The checkout designs follow it too:
  Receipt's page is a neutral grey, Card's is black.
- Filled surfaces use `--btn-bg` / `--btn-fg`: in dark mode `--accent` is white, meant
  for text and icons.
- **Solid colours only:** no gradients (backgrounds, glows, thumbnails), no dark bands in light
  mode (every section follows the theme), and no decorative chips (status and network are
  coloured text). The product owner rejected all three as generic.
- **Cosmos Lazos (`--ff-display`) is for the logo and very specific highlights only**; no page
  sets it today. Titles, numbers and brand names are Open Sauce One (weight 600, tight
  tracking). Don't spread it to section titles.
- **Buttons are the Stellar Snap's** (`.btn` in cosmos.css): pills with a 1.5px outline and an
  ink fill that grows from where the pointer enters, placed by `src/scripts/ink.ts` (both layouts
  load it). A variant names its ink with `--ink-fill` / `--ink-fg`. **The ink goes by the
  button's own colour** (product owner): a black button paints white (`--btn-ink`, keeping its
  black outline), a white or outlined light one paints the corporate blue (`--out-ink`, its
  outline turning blue with it). Dark mode swaps them, since there the filled button is white.
- The dashboard's restyle is `src/styles/dashboard.css` (sidebar, page title with breadcrumb,
  the overview's account card, period tabs, `BarChart`, design picker).
  Status is coloured text with a dot, never a capsule; section labels are plain sentence case;
  every overview block keeps `min-width: 0`, so tables scroll inside their box on phones. To see
  it locally, sign in through local Authentik with the `.env` test account (`DEV_TEST_*`).
  The latest settled payments have Today / Week / Month / Year tabs, read from
  `GET /api/payment-intents?status=SUCCEEDED&createdFrom=…` (the community server's
  `createdFrom` filter); the summary's growth line compares the 7-day window with the one before.

### The payments landing

- `/` on payments is `src/pages/payments/index.astro`: server-rendered, copy in
  `src/lib/payments/landing-i18n.ts` (five languages, parity-tested), rates read from
  `src/lib/plans.ts`. It is the one indexable payments page (robots `Allow: /$`, sitemap).
- **A highlighted word uses the Stellar Snap's highlighter, in black** (`.pl-hl`, the product
  owner's choice over lime or the corporate blue): a solid block behind the words, painted left
  to right, white ink on it; inverted in dark mode (white block, black ink). A pseudo-element,
  not a gradient. Today: the hero's "stablecoins" and the final call's.
- The hero runs up under the nav (`margin-top: -73px`) and fills the first screen at every size;
  below 900px the copy comes first and the video under it, and the title stays on two lines.
  Check it at real viewports (screen minus browser bars and taskbar: 1920×947, 2560×1307,
  1536×730, 1366×625, 1280×585, tablets, 390 and 360 phones), not only at a maximised window.
- The hero's background is the coin-ramp video (`public/media/coin-ramp*.{webm,mp4}` + poster),
  anchored right. It multiplies onto the light page; in dark mode it is inverted with its hue
  turned back and lightens onto the page, so the hero follows the theme. It **plays on its own for
  everyone** (the product owner's call, the one exception to reduced motion), pauses only off
  screen, and always has its pause button (WCAG 2.2.2). Its container must not get a z-index: a
  stacking context would cut the video off from the background it blends with. Its fade-in
  makes it one anyway, so it carries the page colour (`--bg`) for the video to blend with;
  without it a lighter band shows behind the white frame.
- Its sections follow how crypto gateways present themselves (reviewed: Stripe, CoinGate, BitPay,
  NOWPayments, Triple-A, BVNK, Cryptomus, CoinPayments, Coinbase Business, MoonPay Commerce,
  Alchemy Pay, Fireblocks): hero, the networks / assets / wallets strip, benefits, a comparison
  with cards and bank transfers, three integration paths (no code, hosted, API), how it works,
  integration options, use cases by business (WAI-ARIA tabs), security, developers, pricing, and
  the FAQ with the final call.
- **Integration options** (`#integrations`; `#designs` stays as an anchor inside it for old
  links) replaced the checkout-designs gallery at the product owner's request: a grid (no tabs)
  where the pay button and the embedded checkout run for real in wide cells (the embed's `demo`
  mode: a sample nothing can pay, no API request; the embedded one logs its events under it),
  then hosted checkout, payment links and QR, API and SDK, and e-commerce plugins (WooCommerce,
  Shopify: "coming soon", not built). Code is folded behind "view code" with a copy button. The pay button and the
  embedded checkout are the embed script's elements (see "Embedding a payment"). The four
  checkout designs still exist (dashboard, `/preview/{design}`); only the gallery left.
- **"How it works" and the use cases are pinned** on screens of at least 1000×700 (`data-pin`,
  wired by the page script): the section's stage is `position: sticky` under the nav inside a
  runway of `--n` steps of plain height (35svh per step), and the scroll position picks the
  step, so nothing hijacks the wheel or the keyboard; a use-case tab scrolls to its own step.
  While pinned, a "Step 2 of 4" counter and a segmented bar sit beside the heading, and each
  screen rises in zooming while the previous one leaves upwards. Smaller screens get
  the plain grid / tabs.
- **Code is highlighted** in the page's palette by `src/lib/payments/highlight.ts` (a small
  tokenizer for bash, TypeScript, JSON and HTML; tested) through `Code.astro`, which keeps the
  raw code in `data-raw` for the copy buttons. No highlighting library and no HTML strings.
- **The FAQ and the final call share one canvas** (`.pl-closing`): the product owner asked for
  no band of another tone between them.
- **The landing's dark mode has more colour** (product owner): inside `.pl` the dark tokens take a
  navy tint (canvas `#090B14`, alternate sections `#0E1222`, cards `#121729`, blue-tinted lines)
  and the tertiary blue marks progress, checks, the current step, the best plan and links. The
  nav, the footer and every other page keep the neutral dark of institutional.css.
- **The sections show the product, not only text** (the product owner found text-only sections
  flat): as those gateways do, each one carries a piece of the interface:
  `src/components/payments/landing/Mock.astro` draws them with the page's tokens (a confirmed
  payment, the card-payout race, the escrow states, the instant/escrow flow with a payment
  travelling the wire, a payment link, the checkout, an SDK call, one screen per step, a paid
  order per business, an explorer card). They are decorative (`aria-hidden`): everything they
  say is in the section's text too, and their figures are examples, never claims. Benefits are a
  bento (wide and narrow cells swapping per row); the developers' code has REST / TypeScript SDK /
  Webhook tabs (the same `[data-tabs]` script as the use cases); pricing has a fee calculator
  (rates parsed from `plans.ts`, escrow's 0.5% as a checkbox, a logarithmic slider); the final
  call carries the brand's astronaut (`public/brand/astronauta-telefono.svg`, inverted in dark
  mode). **Images too, not only drawn UI** (the product owner asked for images after the
  mock-ups): the brand's astronauts by the benefits heading, on the comparison table, by the
  FAQ and in the final call (`.pl-art`, inverted in dark mode; none in pinned sections or by
  code, where they crowded the content); 3D clay renders from 3dicons (CC0,
  github.com/realvjy/3dicons) behind the benefit cards, in security and by the calculator
  (`.pl-3d`; white clay vanishes on a white card, so there it sits on a canvas-tone tile); and a
  CC0 photo per use case (StockSnap, found through Openverse; the IDs are in the page's
  frontmatter), in black and white (the product owner's choice), with that business's paid
  order over it. They live in `public/media/landing`.
  Use only CC0 / public-domain material or the brand's own (no attribution-bound licences, no
  third-party logos in a photo); Unsplash and Pexels sit behind bot checks, so search Openverse
  (`api.openverse.org`, `license=cc0`). Each mock-up is a size container, so its parts rearrange for the room it gets (the
  escrow states stack when narrow). Their wrapper class is `pl-mk--<name>`, a modifier, so it
  never clashes with a part's `pl-mk-*` class.
- **Two settlement modes, as the product owner offers them: instant** (straight to the merchant's
  address) **and escrow** (the payment is held until it is released, e.g. when the order ships).
  As the product owner specified it: the payment waits in an on-chain contract (not with Cosmos
  Pay), the merchant releases it when the order ships, it goes back to the buyer if not released
  within the deadline the merchant sets for the link, and escrow costs 0.5% per payment on top
  of the plan's rate. No escrow code exists in this repo, the community server, the SDK or the
  wallet yet. "What changes" carries both modes (benefits + the "two ways to settle" cards), and
  so do the comparison, the hero lede, pricing and the FAQ.
- **Only checkable claims**: no customer logos, volumes, certifications, licences or uptime
  figures until they are real. Every product claim in the copy is checked against the dashboard
  and the community server (e.g. the dashboard sets amount, memo and message, not an expiry).
  The card column of the comparison states the usual case and carries a footnote saying so.
- **Networks, assets and wallets run as two marquees, and only the marquees show** (the
  product owner removed the visible title, row labels, the SEP-7 note and the pause button).
  Two identical sets slide by half the track; the moving copy is `aria-hidden`, and a visually
  hidden title, row labels and list carry the names. Hovering a row holds it; like the hero
  video they run for everyone, reduced motion included (the product owner's call). **Logos are official artwork only**, full colour, in
  `public/media/brands`: USDC, XLM, SOL from cryptocurrency-icons; Freighter, LOBSTR, xBull,
  Albedo, Rabet from the Stellar Wallets Kit; Phantom and Solflare from their Solana
  wallet-adapter icons; Monad and EURC from Trust Wallet's assets. Single-colour marks (Stellar,
  the Cosmos isotype) are inline in currentColor (`Mark.astro`) so they follow the theme. Never
  draw an approximation of someone else's logo.
- **Typography and structure stay quiet** (design-skill pass, 2026-10-24): no labels above
  headings, headings in one colour with no accent word, no all-caps labels, numbering only for
  real sequences ("how it works"), no arrows on buttons or links, no rows of icon cards (an icon
  sits over a fact, not in a card), no resting shadows; surfaces differ by tone (`--bg` /
  `--surface`), lines only where they carry structure.
- **Motion is wanted** (the product owner's call: "animate everything you can"): the hero comes
  in line by line, every `data-reveal` block rises in the first time it scrolls into view
  (`--i` staggers siblings), the steps' track draws, checks pop, tabs and FAQ answers slide open,
  the logos run, and each mock-up plays when its block arrives (rows one after the other, ticks
  pop, bars fill; the flows and the approve button keep moving). A mock-up's resting state is its
  finished one. **Every figure counts up digit by digit** the first time it comes into view
  (`data-odo`: each digit a strip of 0–9 that spins and settles, left to right, accelerating;
  a visually hidden copy keeps the figure readable to assistive tech). Reveals hide content only under `html.pl-anim`, set by an inline head script
  that removes it again after 2.5 s if the page script never loads, so the page is complete
  without JavaScript. Only opacity, translate and scale animate, and **all of it runs for
  everyone, reduced-motion settings included** (the product owner's call, as for the video).

### Embedding a payment (pay button and embedded checkout)

- Merchants paste `<script src="https://payments.cosmospay.lat/embed/cosmos-pay.js" defer>` and
  `<cosmos-pay-button link="…">` (opens the hosted checkout in a popup, no iframe) or
  `<cosmos-pay-checkout link="…">` (draws a compact checkout inline, in shadow DOM, from the
  public read). Attributes: `link`, `lang` (en/es/pt/fr/de), `theme` (light/dark/auto). Docs:
  `docs/content/docs/embed.mdx` (+ es/pt/fr/de). The payments pages still refuse framing.
- `src/embed/` is bundled by `scripts/build-embed.mjs` (esbuild, one IIFE) into
  `public/embed/cosmos-pay.js`, git-ignored and built before `astro build` (and in `predev`).
  It inlines `PUBLIC_PAYMENTS_URL` and `PUBLIC_PAYMENTS_API_URL`: another environment means
  another build. The smoke test requires the file to be served.
- **The contract is `src/lib/payments/embed-protocol.ts`:** the hosted checkout posts
  `{ source: "cosmos-pay", type: "status", id, status }` to `window.opener` (targetOrigin `*`,
  allowed only because id and status are public) and nothing else: never the URI, address or
  amount. The button accepts a message only from the payments origin, from the popup it
  opened, for its own link. It re-dispatches `cosmospay:status` / `cosmospay:paid`; those are
  UI hints, and the merchant confirms payment server-side (webhook or API).
- The inline checkout validates with `parsePaymentLink` and writes text only. Its strings copy
  the checkout's wording (`src/embed/i18n.ts`, enforced by `embedI18n.test.ts`): change both
  together. Element fields must not shadow `HTMLElement` properties (`lang`, `id`). A `demo`
  attribute shows a sample nothing can pay, with no request (the button opens
  `/preview/classic`; the inline checkout plays open → confirming → paid): the landing's live
  demos use it.
- Locally, load the script from a `*.cosmospay.localhost` page: Vite's dev server refuses a
  cross-site `<script>` from `localhost` (403). Production serves it without that check. It
  carries no SRI hash because it is updated in place.

### Checkout designs

- Four designs: `classic`, `split`, `ticket`, `card` (`src/lib/payments/checkout-themes.ts`).
  The community server stores the choice per payment intent as `checkoutTheme` (create, `PATCH
  /v1/payment-intents/{id}`, the public read). `parsePaymentLink` draws `classic` for a value it
  does not know: the field is cosmetic and never invalidates a payment.
- `src/components/payments/Checkout.astro` serves every design as a `<template>`;
  `src/scripts/payments/checkout.ts` mounts the link's one and fills every `data-slot` occurrence,
  with events delegated on `#checkout`. A new design is: a template in
  `src/components/payments/checkout/`, its CSS in `checkout.css`, the value in `CHECKOUT_THEMES`
  here and on the server, a thumbnail `public/media/designs/<name>.svg`, and its name and
  description in the payments catalog's `designs`.
- `/preview/{design}` draws a design with `src/lib/payments/preview.ts`'s sample: nothing on it
  can be paid (the QR encodes a "sample" notice, the URI is empty, wallet buttons are inert).
- The dashboard picks the design when a link is created and changes it from the link's detail
  (`CheckoutDesignPicker`, through the PATCH proxy).

### Other split-related notes

- **Every payment link's checkout URL** is `checkoutUrl(id)`, shown in `PayLinkDetail`.
- **`astro:env/client` in a component** reaches the docs build too (`sync-portal-ui.mjs` copies
  `src/components/cosmos` and the libs it needs), which cannot resolve it: the sync rewrites
  every such import to `docs/src/shims/astro-env-client.ts`. A new `PUBLIC_*` variable read by
  a component needs an export in that shim, and a new `@/lib/*` module those components
  import needs an entry in the sync's `COPIES`.

## Plans

- `src/lib/plans.ts` is the source of truth. **The free plan ("community") is no longer offered**
  (product owner, 2026-10-25): `PLAN_IDS` lists the plans offered today (starter, essentials,
  growth, enterprise) and drives every picker, the pricing page and self-service changes;
  `ALL_PLAN_IDS` adds the legacy community plan for stored values, limits, admin assignment and
  upgrade order. New accounts start on `DEFAULT_PLAN_ID` (starter; also `profile.plan`'s
  database default). Existing community rows were not migrated, and the shared public wallet key
  stays on community on purpose (its swap rate must stay the highest; see `public-key.ts`).
- Production leaves `ENABLED_PLANS` empty: every offered plan can be picked (product owner,
  2026-10-25). There is no free trial: plan buttons name the plan, never a trial.
- Starter is 1% + 25¢ per payment, no monthly fee. A rate shown anywhere comes from `plans.ts`
  or must match it.

## Rule: every API endpoint MUST be documented in OpenAPI/Swagger

The portal serves its own Swagger UI at `/swagger`, backed by `/api/openapi.json`
(`src/pages/api/openapi.json.ts` -> `src/lib/openapi/document.ts`). That reference is only
worth anything if it is complete: **an endpoint that is not registered does not exist as far
as the SDK, the docs and the consumers are concerned.**

So: **adding or changing a route under `src/pages/api/` is not done until the OpenAPI
registration for it lands in the same change.** No "I'll document it later": that is exactly
how the spec got to the state it is in (see *Current coverage* below). This applies to every
exported HTTP method of the file (`GET`, `POST`, `PATCH`, `DELETE`, `ALL`), each one its own
entry.

### Where the registration goes

Next to the Zod schemas of the module, in `src/schemas/<module>/openapi.ts`.
`src/lib/openapi/auto-load.ts` picks it up with a `/src/schemas/**/openapi.ts` glob, so there is
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

- **Import `z` from `@/lib/openapi/zod`**, never from `zod`, in the registration AND in any
  module whose schemas it documents (`src/schemas/*.ts`). `@/lib/openapi/zod` is what runs
  `extendZodWithOpenApi`, and **with zod v4 that extension is not retroactive**: a schema
  constructed before it runs has no `.openapi()` method at all, so the call throws
  `.openapi is not a function`. Under `astro dev` the import order usually hides this; the
  production bundle reorders modules and it fires there, on the one route that serves the
  spec. `registry.register()` is not a way around it (it calls `.openapi()` internally).
- **Wrap every JSON response in the envelope helper** (`jsonOk` / `jsonCreated`), never a bare
  data schema. The API always answers `{ data, code, status, message }`; a spec that documents
  the payload alone is a spec that lies, and "Try it out" in Swagger then shows a mismatch.
- **Errors come from `errors.*`** (`badRequest`, `unauthorized`, `forbidden`, `notFound`,
  `internalError`); register the statuses the handler can actually return.
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

`npm run check:openapi` first: it fails, by name, on any route operation that is not in the
document. Then `npm run dev` and open http://localhost:4321/swagger to confirm the operation
renders, expands, and that its schemas resolve. Both `/swagger` and `/api/openapi.json` are gated by
`apiDocsEnabled` (`src/lib/api-docs.ts`): on in dev, off in production unless `API_DOCS_ENABLED`
is set. That flag is an `astro:env` field with `access: 'public'`, so it is **inlined at build
time**: a production build serves 404 there and no runtime env var changes it; to expose the
reference on staging, build with the flag set.

### Current coverage

**Every route operation is documented**, plus the external `/cosmos-api/{path}` gateway route.
Don't quote a count from here; quote the line `npm run check:openapi` prints
(`OpenAPI coverage: N/N route operations documented (1 explicitly excluded), M paths in the
document.`); a number frozen in this file was wrong within weeks. The one exclusion is
`/api/auth/{all}`, Better Auth's own handler, named with its reason in the `EXCLUDED` map of
`scripts/check-openapi-coverage.mjs`. Keep it that way: an endpoint is either documented or
listed in that map with a reason, never just missing.

### Known-good shape of the generated document

The spec validates against the OpenAPI 3.0 schema (checked with `@apidevtools/swagger-parser`)
and renders in Swagger UI. Two habits keep it that way:

- **Catch-all proxies** (`/api/admin/{path}`, `/api/kyc/{path}`, `/api/onramp/{path}`,
  `/api/offramp/{path}`) are registered once per verb, with the upstream payload documented
  as an open object: restating the Payments API's entities here would be a second copy to
  be wrong about.
- **Upstream shapes come from `src/lib/cosmos.ts`** (the TypeScript interfaces the client
  already declares) or from the Payments API's own spec in `docs/openapi.json`. Don't invent
  field names; both sources are in the repo.


## Wallet sign-in and account recovery live on the community server

The wallet's own sign-in (`/v1/wallet/auth/*`, the backup box), SEP-10 web auth, SEP-30 account
recovery and `/.well-known/stellar.toml` are served by the community server, not by this app:
it is the piece that runs as load-balanced replicas behind APISIX, and each recovery server is a
separate deployment of it with its own database and keys. Do not add routes for them here.

What this app still does for them:

- **Nothing on the request path.** The community server emails the sign-in code and mints the
  wallet's keys in APISIX itself, so no wallet request passes through this platform. The console
  legs it used to call here (`/api/wallet/console/*`) are deleted, and so are their secrets:
  `WALLET_AUTH_CONSOLE_SECRET` and `WALLET_RECOVERY_CONSOLE_SECRETS` no longer exist in
  `astro.config.mjs`. Do not bring them back.
- **The keys it provisioned before that** (`src/lib/wallet-provisioning.ts`): accounts this
  platform provisioned for the wallet still hold dashboard keys, and `src/pages/api/api-keys`
  rotates them with `WALLET_KEY_SCOPES` instead of minting more.
- **The keyless APISIX routes** (`src/utils/apisix.ts`, synced at boot by
  `src/lib/apisix-route.ts`, upstreams re-pointed by `npm run sync:route`):
  - `<route>-oauth-callbacks`: the wallet sign-in's OAuth callback
    (`/v1/wallet/auth/oauth/callback/*`) plus the shared public key (`/v1/public-key`), with
    CORS from `COSMOS_API_CORS_ORIGINS`.
  - `<route>-payment-links`: the public payment-link read (`/v1/payment-links/*`, GET/OPTIONS),
    made from payers' browsers by the hosted and the embedded checkout, so its CORS is `*`
    without credentials. No other keyless route lists that URI. The old `<route>-pollar-callback` route is only ever
    DELETED at boot, never created.
  - `<route>-sep`: `/.well-known/stellar.toml`, `/v1/sep10/*`, `/v1/sep30/*`. It carries NO
    `cors` plugin, because the community server answers CORS itself for those prefixes and two
    `Access-Control-Allow-Origin` headers make a browser refuse the response, and it forwards
    `Authorization`, because there it is the SEP-10 / identity JWT.
  - `<route>-sep-recovery-{a,b}`: optional host-bound copies of the SEP route, one per recovery
    server, from `COSMOS_RECOVERY_{A,B}_HOST` + `_UPSTREAM` (both halves or neither).
- **Its old tables.** `wallet_backup` (encrypted seeds people restore from),
  `wallet_auth_handshake`, `wallet_login_code`, `recovery_account` and `recovery_auth_method` are
  RETIRED but kept: nothing here reads or writes them. Never drop them before
  `npm run export:wallet-data` (`scripts/export-wallet-data.mjs`) has been run and its output
  imported on the community server. `wallet_registration` is retired too (nothing writes it),
  but it is NOT in the export and it is still READ: `isWalletProvisionedUser` uses it to keep
  legacy wallet accounts on the rotate-only key path. Dropping it changes that behaviour, so it
  needs its own decision, not a ride along with the others.

## Talking to the Payments API

This app reaches the Payments API (the community server) server-to-server, not through APISIX
(`src/lib/cosmos.ts`), so it presents what the gateway would have: `X-Gateway-Secret` and the
consumer headers.

- **`COSMOS_API_URL` may list several replicas** (comma-separated) and `src/lib/cosmos.ts`
  round-robins across them, as APISIX does. Locally, run every replica it lists (the server's
  `npm run dev:local` starts `api` + `replica`) or point it at one: with one of two down, every
  other call answers 502 "Could not reach the Payments service", and the server log names the
  cause (`[cosmos] … failed: ECONNREFUSED`).
- **`COSMOS_GATEWAY_SECRET` must equal the server's `APISIX_GATEWAY_SECRET`.** The server always
  enforces it; empty or mismatched, every Payments API call answers 403. APISIX sets the same
  value on proxied requests (`src/utils/apisix.ts`).
- **`X-Cosmos-Internal` is a MAC, not a flag.** `src/lib/console-marker.ts` mints
  `v1.<unix seconds>.<hex HMAC-SHA256(COSMOS_GATEWAY_SECRET, label + ts)>` per request; the
  server accepts it for five minutes either side of its clock. It used to be the literal `1`,
  trusted only because APISIX strips the header from clients, which left it one forgotten strip from handing
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
  from `astro:env`. The client is generated into `generated/prisma/` (git-ignored); import
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
