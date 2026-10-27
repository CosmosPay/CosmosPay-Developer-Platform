# AGENTS.md

Guidance for Codex when working in this repository (Cosmos Pay developer platform:
Astro SSR portal + its own REST API under `src/pages/api/`).

## Commands

```bash
npm run dev               # astro dev --host; predev runs `prisma migrate deploy` + scripts/ensure-docs.mjs
npm run build             # prisma generate -> docs:build (Fumadocs export into public/docs) -> astro build
npm run build:app         # prisma generate -> embed:build -> astro build: no docs build (563 pages on 8
                          #   workers), docs/ untouched; enough to check a change outside the docs
npm start                 # node dist/server/entry.mjs; prestart runs ensure-docs. Production runs under PM2
npm test                  # = test:unit (node:test over tests/unit/**/*.test.ts; no DB, no astro:env),
                          #   4 files at a time: as fast as one per core, without holding them all
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

## Languages: seven, everywhere

- **The product speaks English, Spanish, Portuguese, French, German, Hindi and Simplified Chinese**
  (`en es pt fr de hi zh`) on every surface: the platform's catalog (`src/lib/i18n/messages/*.ts`,
  the languages and their flags in `src/lib/i18n/locales.ts`), the payments catalogs
  (`src/lib/payments/i18n.ts`, `landing-i18n.ts`), the embed (`src/embed/i18n.ts`), Open Graph
  locales (`src/lib/payments/seo.ts`), `BackToTop.astro` and `src/lib/geo.ts`. A new language goes
  into all of them. The docs (Fumadocs) stay in five.
- **Nothing on screen is hardcoded English**: every label, placeholder, aria-label and example value
  comes from the catalog (`ui.*` for shared bits such as close, search and select; `dash.examples.*`
  for sample data in placeholders). **Never build a plural with a suffix** (`{s}`): give the
  singular and the plural their own strings (`atLimitOne` / `atLimit`).
- **Every catalog mirrors English key for key** with the same `{placeholders}` and no empty string:
  `tests/unit/dashboardI18n.test.ts` (the platform), `paymentsI18n.test.ts` and `embedI18n.test.ts`
  enforce it. URLs are not copy: links live in the components (`NAV_LINKS`), not the catalogs.

## Writing rule: no em dashes

The product owner forbids the em dash (U+2014) in every context: UI copy in every language,
code comments, docs, commit messages and pull requests. Use a full stop, comma, colon,
parentheses or a conjunction; never an en dash or a spaced hyphen in its place (en dashes stay
only in numeric ranges). An empty table cell shows "-" or a word. Page titles separate with
" | ". The only em dashes left in the repo come from the SDK's generated reference
(`docs/content/docs/sdk/`): fix them in the SDK, then regenerate. The API reference
(`docs/openapi.json`, `docs/content/docs/api/`) has none since the community server dropped them
from every message and spec text (2026-10-25); a regenerated spec that brings one back is a server bug.

## Standing rules from the product owner (check every UI change against them)

These were said more than once; breaking one is a bug, whatever the task was.

- **No empty-state text anywhere** (2026-10-26, repeated 2026-10-27): no "No X yet", "Nothing
  here", "Add one to…" or similar in a table, a list inside a detail, a menu, a card or a form
  field. An empty table or list is its empty rows (`FillRows`, whose `empty` is only for a load
  error); a select with nothing to choose is disabled; a menu shows nothing. Only a load error or
  a record that does not exist is said. Before finishing, grep the dashboard for
  `className="empty"`, `notif-empty` and `empty={` and keep only load errors and not-found.
- **A private account is an account on the token's contract** (2026-10-27): never list a public
  wallet as one (the table reads the chain and shows only registered accounts). Adding one asks
  for the customer's signatures (the key transaction, then the register) and saves nothing to the
  customer before the contract has it. An account already on the contract is a private account
  already (the contract keeps one per Stellar account): it is added with no signature, whatever
  key root registered it. **More than one private account per address** (product owner,
  2026-10-27) are **sub-accounts**: a new Stellar account the address creates and funds (2 XLM)
  and whose only signer is the address (its own key at weight 0), registered on the token; the
  address signs everything (`src/lib/zk/sub-accounts.ts`). Never change the contract for it.
  Balances show only after the customer's signature,
  every time (no key is kept or stored).
- **One key root for private accounts**: the confidential key comes from the signed key
  transaction (any wallet, a signed XDR), in the dashboard and first at the checkout. An account
  registered under another root cannot be opened in the dashboard, so never add another
  derivation (or change the key transaction's bytes) without a way for existing accounts.
- **No plain-text explanations or bare references** (2026-10-27): a warning or a decision in a
  dialog is a component (the `.zka-exists` warning panel, choice cards as radio buttons), never a
  paragraph; a sequence is a list with who does each step; every address, transaction or contract
  shown is a link (`AddressLink` / `TxLink`: explorer, copy, preview), and `fmtNodes` puts
  links inside translated sentences. Load the design skills (frontend-design) for UI work.
- **The dashboard never connects a wallet**: people hand over a signed XDR. Cosmos Pay is
  non-custodial: no key or key material of anyone's is stored, client or server.
- **Every list is the Payments table** (figures first, filter bar with the view's buttons, a row
  that opens its detail, icon actions and a "⋮" menu with every action, empty rows, pages),
  **long forms go in steps** (`FormSteps`), **every create opens a modal** copied from an
  existing one, and **every delete asks first** (`ConfirmModal`). The details are under "The
  institutional skin" below.
- **A table with a delete selects several rows** (2026-10-27): `components/BulkSelect.tsx`, a
  checkbox first in each row (disabled, with the reason, where the row cannot go: a settled
  payment) and one in the head for the page; while rows are selected the filter row shows how many,
  "Delete selected" and "Clear selection" in place of the create button, and the delete confirms
  with the names before it runs (`useBulkDelete`). Payments, customers, products, webhook endpoints
  and private accounts have it; a new deletable table gets it too.

## Three domains, one app

| Domain | Area | Pages |
| :--- | :--- | :--- |
| `cosmospay.lat` | `site` | `src/pages/site/`: landing, `/pricing`, `/tos` |
| `dev.cosmospay.lat` | `dev` | everything else in `src/pages/`: `/login`, dashboard, onboarding, invite, kyc, `/docs`, `/swagger`, `/api/*` |
| `payments.cosmospay.lat` | `payments` | `src/pages/payments/`: `/` home, the content pages `/integrations`, `/use-cases`, `/security`, `/fees`, `/faq`, `/{id}` hosted checkout, `/pay` SEP-7 handler, `/contact` (the contact form's POST), `/preview/{design}` |

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
  home and the content pages are the indexed ones), and the domain has its own seven-language
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
- **It works by keyboard, screen reader and touch.** Each mega trigger is a disclosure
  (`aria-expanded` / `aria-controls`); every panel and the mobile menu are in the page from the
  first render, hidden until opened, so their links are crawlable and Tab goes from a trigger
  into its links. Escape closes and returns focus, tabbing out closes, the burger names its
  state, and while the mobile menu is open the rest of the page is `inert` and does not scroll
  (`html.nav-locked`), focus moves into it and a desktop-wide window closes it. The language
  picker is a list of buttons (each in its own `lang`, the current one `aria-current`), the theme
  toggle is `aria-pressed`, and its labels are in the catalogs (`nav.main`, `closeMenu`, `theme`,
  `language`). Column names label link lists, they are not headings; the footer's group titles
  are h2.
- **The bar answers the pointer as the buttons do:** theme, docs, language and burger take the
  snap's ink in the outline colour (`--out-ink`, placed by `ink.ts`), the text items and sign-in
  sweep an underline. Floating panels (mega, mobile menu, menus, modals, toasts) reset to
  cosmos.css's tokens, except in the institutional skin (the payments site and the dashboard),
  where they take the skin's (`body.inst :is(...)` in institutional.css): a modal's or the mobile
  menu's button is the page's black, never the old navy. Modals are portaled to `<body>`, so they
  read the body's tokens.
- **Every page also has the footer's social profiles and a back-to-top button.** The profiles
  (X, Instagram, Discord, WhatsApp, LinkedIn) are `SOCIAL` in
  `src/components/cosmos/lib/constants.ts`, drawn by `Social.tsx` with Simple Icons' official
  glyphs (CC0). `BackToTop.astro` (both layouts) appears once the page has moved down a
  screen; it keeps its own label per language because the layouts read two catalogs.
- **A mega panel hangs from its own trigger** (product owner: it opened "from the middle"): sized
  to its content, pulled back inside the window when it would cross the edge, and growing out of
  the trigger (Nav.tsx sets the transform origin); it closes with a short exit.
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
- **The dashboard follows the product owner's gateway-dashboard reference strictly** (Dribbble
  "Gateway dashboard", 2026-10-25), on `src/styles/dashboard.css`:
  - **The shell fills the window, with no frame or border around it** (product owner: the
    reference shot's rounded frame was its presentation, not the product): the sidebar on the left (`widgets/Sidebar.tsx`: logo, "Main menu" and "Preferences" split by a hairline, plain
    links whose current one is bold, groups that open into a dashed tree with a dot on the current
    view; a group with one visible view renders as a plain link), the general nav inside the
    content column (`Nav inDash` gives `.nav-dash`: no logo, no surface at the top but its bottom
    line always drawn, product owner; the logo comes back on screens where the sidebar is
    off-canvas), then the page head: the view's name as the h1,
    a slash and the organization as a breadcrumb menu (`OrgSwitcher variant="crumb"`), the three at
    one size (`--title-fs`, 24px: its letters as tall as the environment switch's selected pill;
    product owner: never an arrow, never two sizes, in proportion to the switch), Sandbox / Production
    and the outlined "create organization" (icon only on phones). On a phone a long head gives way
    instead of scrolling the page sideways: the organization's name first (down to its first letters
    and the chevron), then the view's name ends in an ellipsis. The environment survives a reload:
    the switch writes the `cosmospay-env` cookie and `dashboard.astro` reads it, so the first render
    is already on it. A view's own h2 stays
    for assistive tech only and no view has a visible subtitle. The sidebar entries are `SIDE` in
    `dashboard/data.ts`; a group slides open and closed (its height animates; closed, it is inert).
    The sidebar's logo never moves (product owner): on a window too short for the menu only
    `.side-nav` scrolls, under it.
    `DISABLED_VIEWS` there switches a view off (out of the sidebar and the search, its link opens
    the overview): Fiat, temporarily (product owner, 2026-10-25), the organizations' (`blindpay`)
    and the platform admin's (`adminFiat`, whose API answers 404 while the BlindPay plugin is off;
    `FIAT_ON` in `AdminViews.tsx` drops the overview's fiat panel and the organizations' fiat
    columns with it).
  - **The bar carries the dashboard's search** (`widgets/DashSearch.tsx`, passed to `Nav` as
    `search`; Ctrl K / Cmd K or "/" focus it): a combobox that finds the pages by name (and by
    their group's) and, with a query, searches payments, swaps and liquidity by writing their `q`
    filter to the URL; `FILTERS_EVENT` (`dashboard/hooks.ts`) makes a list already on screen read
    it again. On phones it shrinks to its glyph and opens over the bar.
  - **The overview** (`views/OverviewView.tsx`): a black account card (its up and down arrows step
    through the organizations and are not drawn when there is no other one, product owner; name,
    plan, the plan's standing in its colour (green active, yellow paused or a payment overdue, red
    suspended; product owner), created date, the settled volume in USD, the plan's rate
    and the environment as text split by a hairline) beside a white panel like every other one
    (product owner: no grey panel): "Quick links" as four rectangular tiles (an icon in a small
    square and the view's name; product owner: in place of the balances, which keep their own view),
    the organization ID to copy, "Create payment link" and "Swap". **The quick links follow each
    person's use** (`src/lib/dashboard-usage.ts`, tested): Documentation, API keys, Webhooks and API
    logs until a view earns a place with recent use (every view opened counts, halving every two
    weeks; only views the viewer may open), kept per account in the browser
    (`cosmospay-usage:<user>`, the shell records each view it shows). Money and counts **count up
    digit by digit** (`components/Odometer.tsx`, the payments landing's effect: the card's volume,
    the activity's figures) whenever they arrive or change. "Activity" with Daily / Weekly /
    Monthly / Yearly over a row of five figures that are tabs (WAI-ARIA, arrow keys), each over its
    own chart (product owner: the summary must show
    swaps, liquidity, webhooks and their own charts, not payments only). **A chart tells
    something** (product owner, 2026-10-27): `components/StackChart.tsx` splits every count by how
    it ended (completed at the baseline, pending, not completed; webhooks delivered and failed;
    private payments expired), the legend gives each part's window total and share, and the
    tooltip a bucket's total, each part with its share, and what it settled in USD (payments,
    swaps, private payments). A volume is one USD series on its own axis (`currency`): never two
    scales on one plot. The outcome palette (`--viz-done/-wait/-fail`, its own steps in dark mode)
    was validated with the dataviz skill's script; the amber sits under 3:1 on white, so every part
    is also labelled in the legend, the tooltip and the hidden table. Bars are square (product
    owner), a 2px surface gap between stacked parts, solid hairline grid. Each figure carries an
    insight line, not a bare number (the completed or delivered share, the average ticket, what
    swaps settled, the fees), and its growth against the window before (tertiary blue up, red down) and its chart a link into its view, filtered to the
    window where the view has a date filter. Then "Transactions" with Today / Week / Month / Year,
    the shared filter bar (settled / in progress / failed, network, search) and one line per
    payment (status icon, label over value, a menu to copy the ID, open the explorer on its chain
    or that payment in the Payments view), paged like every table (rows per page, empty rows keeping
    the height); "View all payments", at the pager's end, keeps the period, network, search and
    "settled". Counts never build a plural from a suffix: `countText` picks the singular string.
  - **Every list of money or events carries its own activity** (product owner, 2026-10-26):
    `components/ActivityPanel.tsx` is the overview's activity, shared (`ViewActivity` reads its own
    series): Payments shows settled volume (USD) and payments, private payments their settled volume
    (USD) and the payments created (the series' `zkPayments` part), Swaps, Liquidity and Webhooks
    their one figure (a single figure stands alone, not a tab). Each sits above its list; only the
    overview's charts link into a view. **Figures always come first, then the tables, in every view**
    (product owner, 2026-10-27): a second table goes after the main one, never above the figures. A list with no series of its own (customers, products,
    API keys, logs, client activity, users) opens with `ViewFigures` (same module): the activity
    panel's figure strip without its chart, its numbers counted from the list, a skeleton while it
    loads and a dash when it failed. **A second list on a page** (a webhook's
    deliveries, the most frequent errors, recent settlements, Settings' team and wallets) is a
    `hub-section` with its `h2`
    heading, then its own `FilterBar` (its own URL keys when the page's first list already uses
    `q`/`status`/`date`, e.g. `accq`) and its panel, as the overview's transactions; never a title
    inside the panel.
  - **The view-by-view review (product owner, 2026-10-27): every list is the Payments table.** Rows
    open their detail (a record view or a dialog that also offers the row's management actions;
    `components/RecordDetail.tsx` is that dialog: eyebrow, name, fields, actions); the
    first cell is the record's `RecordLink` (link, copy, hover preview); a created/added date column;
    the actions cell (`row-actions`) holds the details icon, the row's main action as an icon (edit,
    create the private account, continue a pending swap or deposit, redeliver, sell), the explorer
    (drawn disabled until there is a transaction) and delete, then the `RowMenu` with every action;
    `FillRows` with the load error said as such, `Pagination`, a `TableSkeleton` with the table's
    columns. **Every delete (and a secret rotation, an invitation's revoke) asks first**
    (`ui/ConfirmModal.tsx`), from the row, its menu and its detail alike. A view the account may not
    open lands on the overview, its address and title too (Dashboard.tsx). Settings opens with its
    figures (members and seats, pending invitations, wallets, API keys), then the organization's
    details and plan, then the team (members and pending invitations in one table, a status filter;
    the owner's edit and remove drawn disabled) and the wallets (`OrgWalletsSection`).
  - **A form with many fields or much to read goes in steps** (product owner, 2026-10-27):
    `components/FormSteps.tsx` (`useFormSteps`, `FormSteps`, `FormStep`, `FormStepsFooter`): the
    steps named at the top, the current one in ink and a passed one with a check (a button back to
    it), "step n of total", the first field focused on each step, "Next" only once the step is valid
    and the form's own action on the last. In steps: the payment link (amount, destination, fee,
    design), the private payment (amount and customer, details, fee), the API key (details,
    permissions), the member invitation (a dialog: email and role, permissions), the liquidity
    deposit (pair, amounts), the Stellar wallet (address, signature) and BlindPay's (off while Fiat
    is): the KYC receiver (who it is, then what its type and level ask for: personal data, documents,
    source of funds; or the company, its documents, its owners), the payin (quote, confirm) and the
    payout (quote, then the sending wallet and its signature), the receiver's bank account (a dialog
    over its detail: the account, then its numbers; its wallet is a dialog too); "Get quote" moves on
    by itself and a changed field drops the quote. Every "add"/"create" is a dialog, never an inline form: the swap
    form ("New swap" in Swaps' filter row; the overview's "Swap" opens it with `?create=1`) and the
    support ticket too. Support (the customer's and the staff inbox) is the Payments table too:
    figures per status, the tickets as rows (subject with its unread count, priority, status, last
    message, updated; the inbox adds the customer and moves a ticket's status from the row's menu),
    and a row opens its conversation in a dialog (`components/TicketDialog.tsx`: the thread, the
    composer and, for staff, the customer, when they were last seen and the status and priority
    pickers). The webhook form checks its URL is one before sending and words the server's refusal
    of a non-public host (and any other failure) in the user's language. The Payments API answers
    its lists as a page (`{ data, total, take, skip }`): `cosmosWebhooks.list` returns the page's rows
    (`lib/upstream-page.ts` `pageRows`), as `/api/webhooks` documents (reading the page as the list
    left the webhooks table empty). The webhook log says a delivery's outcome as ok / fail / pending;
    `LogsView` reads them as the deliveries' SUCCEEDED / FAILED / PENDING. Dialogs stack (`ui/Modal.tsx` keeps the open ones): only the top one answers
    Escape and keeps Tab, so a token picker or a confirmation closes alone over its form or detail;
    a dropdown inside one (`Select`, `CountrySelect`, `MiniSelect`) closes alone on Escape too.
    The invitation says before sending what the server would refuse: an email already in the team or
    invited (under the field), every seat taken (members plus pending invitations; "Invite member"
    disabled, with why); a refusal still reads in the user's language, never the server's English.
  - **The activity comes from `GET /api/cosmos/series?period=day|week|month|year`**, the community
    server's `GET /v1/summary/series` (30 days, 12 weeks, 12 months, 5 years, UTC buckets, weeks
    from Monday), with the window's totals (distinct payers too) and the window before it, plus
    `swaps` (Stellar DEX, Solana / Monad, cross-chain and USDT0), `liquidity`, `webhooks` and
    `zkPayments` (private payments: created, settled, expired, volume and fees) for the same window, each with its own buckets (consumer and network; cross-chain and USDT0 count zero
    in the sandbox). **A chart with nothing to draw shows its window at zero** (product owner: fill
    with 0): no buckets, or a part a server does not send, draws the window's buckets (`zeroBuckets`,
    as the server cuts them) empty. **The settled volume is in USD** (product owner): the server
    prices each settled asset from NEAR Intents' token list (`volumeUsd` on `/v1/summary` and on the
    series' buckets, totals and previous window; testnet assets at their mainnet counterpart's
    price), and says how many settled payments it could not price (`unpriced`, shown under the
    figure). Raw `volume` (every asset's amount added) is no longer shown anywhere. A window that
    fails to load, or a volume the server could not price at all (`volumeUsd` null), shows a dash.
    The list reads `GET /api/payment-intents?createdFrom=…`.
  - **No ghost controls; everything named on screen opens** (product owner, 2026-10-25). A button
    or link that does nothing, an always-disabled one or a figure that names something with no way
    to it is a bug. What exists:
    - `goFiltered(go, view, params)` (`dashboard/hooks.ts`) opens a view already filtered: its
      `useListFilters` keys (`q`, `status`, `chain`, `date`...) or a one-off request read by
      `useUrlRequest(key)` and dropped from the URL: `open=<id>` shows that record (Swaps,
      Liquidity, private payments, Support's tickets; read by id when the list does not hold it;
      Payments sends it to the payment's own view), `create=1` opens Payments' form (with `amount`,
      `asset` and `note` from a product).
    - **A payment opens on a view of its own, never a dialog** (product owner, 2026-10-26):
      `views/PaymentRecordView.tsx` at `/dashboard?view=payment&id=<id>` (`RECORD_VIEWS` in
      `dashboard/data.ts` names each record view and its list; the sidebar marks the list). Every
      way in calls `openRecord("payment", id)` (`dashboard/hooks.ts`, an event the shell hears):
      the overview's transaction rows (the whole row), Payments' and Balances' rows, ids and menus,
      a customer's payments, a link just created; `recordHref` is its address for links and new
      tabs. The page reads the record by id on the server's `?id` and follows it while it is not
      final. **Its head is its route** (product owner: never "Payment / organization"): a back
      button, the list's name as a link, a slash and the record's short id as the h1 (the id gives
      way on a narrow screen). The back button returns to the entry before (`history.back()`) when
      the dashboard made the current one, else opens the list. **Only a pending payment can still
      be paid**: once submitted, paid, failed or expired the view is history (product owner: an
      expired link offers nothing to keep paying): no QR, checkout link, wallet link, XDR or
      design, and its menus disable "copy link" and "open checkout" with the reason. The design
      options there are compact (`CheckoutDesignPicker compact`: small, one row, no descriptions).
    - **Every move between views is a history entry** (product owner: the mouse's Back went to the
      landing): `navigate` in `Dashboard.tsx` pushes the view's address (state `{ dash: true }`)
      for the sidebar, the search, `goFiltered`, `goToAdmin` and `openRecord` alike, before the new
      view writes its filters, so each entry keeps its own; `popstate` restores the view and record
      the address names and re-reads the filters (`FILTERS_EVENT`). A move to the view on screen
      adds nothing.
    - The Balances view's tiles open their settled payments, notifications open the record their
      metadata names (`targetOf` in `NotificationsView.tsx`), a customer's payments open in Payments (searched by
      the wallet that paid, `p.source`), products and webhook endpoints open their edit forms, a
      delivery its detail (the error, the attempts) with a failed-only filter, a private payment
      its detail, the admin overview's figures their lists (`goToAdmin`, a venue or fiat tab).
    - **Every reference copies, and previews whatever it can** (product owner, 2026-10-26): ids,
      accounts, endpoints, keys, pools, paths are a `components/RecordLink.tsx`: it opens (a link to
      `?view=…&open=<id>`, a plain click in place, a modified one a new tab; a button for a record
      with no address, as an endpoint; an external link for an explorer), its copy button copies
      the full value (`CopyRef`), and a card previews it on hover or focus
      (`components/RecordPreview.tsx`: `PaymentPreview`, the generic `PreviewCard`; portaled and
      fixed, so no table scroller clips it, hoverable, Escape closes it, no native title stacked on
      it). Accounts are `components/AddressLink.tsx` (explorer, copy, a card with the full address,
      the network and what the screen knows: the organization wallet it is, the payments listed
      with it). Cells show ids shortened (`shortAddress`); the card, the copy and the link carry
      the full value. Where: the overview's transactions (payment, paid by, paid to), Payments,
      Balances, Swaps, Liquidity (operations, pools, positions), private payments, Customers (the
      customer, its account, its payments), Products, API keys, webhook endpoints and deliveries,
      API logs (the path) and notifications (the address, copy only). The admin lists are the
      Payments table too (`AdminViews.tsx`: `statusFigures` their figures, `IdTd` the record's
      `RecordLink`, `AdminRowMenu` the actions cell, `AdminDetail` the row's `RecordDetail`, statuses
      in the reader's language; Fiat's KYC and transfer statuses as the organization's Fiat words
      them). Users opens its account's detail (role, plan and plan status changed there or in the
      row) and notifications open theirs (figures first: all, this week, sign-ins, changes; "Open"
      still goes straight to what one names). Card classes are `rpv-*` (`.rp` and `.wrap` are
      taken elsewhere).
    - A pending Stellar payment's detail checks a transaction hash (`/validate`) for a payer whose
      wallet never reported back.
    - An empty list stays empty (product owner, 2026-10-26, repeated 2026-10-27: no "nothing
      here" text or create button anywhere, tables, detail lists, menus and form fields included;
      the view's first action is in its filter row); a list that failed to load still says so in
      its middle row. A plan limit (API keys,
      production keys, organizations, a locked organization) opens the plan dialog for whoever can
      change plan (keys: only the organization's owner, whose plan sets them) and says who decides
      otherwise. A control the viewer may not use (a permission) is hidden, not disabled; an
      action that does not apply to one row (no transaction yet, a completed payment) is drawn
      disabled, saying why, so every row's buttons line up (product owner, 2026-10-26).
    - **Every row leads with an icon and ends with its "⋮"** (product owner, 2026-10-26): the
      token it handles with its network's badge (`TokenMark`: payments, balances, swaps,
      liquidity, private payments), a status mark (`components/StatusIcon.tsx`: deliveries, the
      overview's transactions) or the kind of record (`am-sq`: products, keys, endpoints;
      avatars for customers). `components/RowMenu.tsx` is the row's menu (details, a new tab, copy
      the id or the link, the explorer, the row's own actions; portaled and fixed, focus moves
      into it, Escape returns it; an action that does not apply stays disabled with its hint).
    - **Filters show their options' icons**: a status's mark (`StatusIcon`, `paymentTone`,
      `pillTone`) and a network's logo (`NetworkMark`), in the list and on the chosen value. So do
      the cells: a status (`Pill`) is its mark and its coloured word, never a dot (done is green in
      both themes, never the ink), and a network cell carries the network's logo (both for a swap
      between networks).
    - The account menu's item opens the personal account view in place (`Nav onAccount`); the
      notifications view is titled as the sidebar names it.
  - **One filter row for every list** (`components/FilterBar.tsx`, the logic pure and tested in
    `src/lib/dashboard-filters.ts`): the search, then a dropdown per filter (status, network, type,
    date), each showing its name until it is set and filled ink while it filters, with how many rows
    each option would show (each control counts what the others leave); "clear filters" once any is on
    (the count of rows shown is for assistive tech only: the pager shows the range), and **the view's
    own buttons at the row's right end** (`FilterBar actions`;
    product owner: create payment, add product, new ticket... sit at the filters' height, never on a
    row of their own above the list). A view whose sections are tabs (Liquidity) puts them at the
    right of its tabs (`.tabs-row`). Products, Customers, Webhooks, API keys and Support have a
    filter row too. **Status is never a separate row of tabs** (product owner): the
    admin lists and the support inbox (`FilterBar`: search by subject, customer or message, status
    with counts) put theirs in the same row
    as their search. The filters live in
    the URL (`useListFilters`, read after mount so the server render matches), so a filtered list
    survives a reload and can be shared; switching views drops them. Tabs remain only for sections
    (Liquidity, Fiat) and periods (the overview), as segments, never chips.
  - **Data loads in one go, never request after request** (product owner, 2026-10-26):
    - `dashboard.astro` reads what the first render needs together (organizations, profile, role:
      one `Promise.all`) and hands the shell the organizations, the active one (the
      `cosmospay-org` cookie the shell writes) and the view the address names (`?view=`). So the
      first render is the right view of the right organization: no request waits for the
      organizations, and no overview mounts and fetches only to be replaced. A failed read of the
      organizations is not "no organizations": the onboarding gate is skipped and the shell reads
      them itself (it used to send someone with organizations to create a first one).
    - The shell's own data (notifications, invitations, support's unread count) and the overview's
      first look (summary, series, transactions) each go out as one `Promise.allSettled` (one that
      fails never holds back the others); a period changed afterwards fetches only its part.
      Views that read several lists already use `Promise.all`.
    - `usePolling` fires on mount unless given `{ immediate: false }`: a view that loads on its
      own passes it, or every mount asks twice at once.
    - Each request reads the session once: `src/lib/request-session.ts` (the middleware and every
      API route share the answer for the same request). Better Auth's cookie cache was tried and
      left off: it only refreshes through its own endpoint, so it saved nothing here while letting
      a revoked session work for its lifetime.
    - Measuring: `astro dev` is far slower than the build (Vite compiles modules while the page
      hydrates, and API routes queue behind it); time the dashboard on `npm run build` +
      `node --env-file=.env dist/server/entry.mjs`.
  - **Every table is paged and keeps its height** (product owner, 2026-10-26): `usePaged` (`hooks.ts`)
    pages at the viewer's rows per page (`PAGE_SIZES` 10 / 20 / 50, never more than 50; one choice
    for every table, kept in the browser as `cosmospay-rows`), `Pagination` under the table always
    shows the picker, the range and, past one page, the steps (as tall as the picker, its line and
    type: product owner). A chart whose legend names the currency ("Volume (USD)") shows plain
    figures on its axis and in its tooltip, never the currency again (product owner). A short or empty page is padded with
    empty rows (`components/FillRows.tsx`, each as tall as a real row of that table, measured); an
    empty list is just those rows, never an "empty" box. The actions column takes only the room
    its buttons need, against the table's right edge, so the width goes to the data (product owner:
    no empty band on the right). The table scroller is positioned, so a wide table's hidden labels never make the
    page scroll sideways on a phone. Small summary tables inside a view or a dialog are not paged.
  - **Every dropdown is `components/Select.tsx`** (no native `<select>` in the dashboard): the
    WAI-ARIA select-only combobox (arrow keys, Home / End, typeahead, Escape, a click outside), with
    marks and hints on its options, opening upwards when there is no room. It and every menu (the
    organization menu, a payment's menu, the toolbar `MiniSelect`, the swap settings, the nav's
    language and account menus, the country picker) pop open and closed: `usePresence`
    (`src/components/cosmos/hooks/`) keeps a popup while it plays its closing animation. Modals fade
    their backdrop in and out; closing one from inside (X, the backdrop, Escape) plays its exit
    before `onClose`, and Escape inside an open dropdown closes the dropdown only.
  - **Motion runs for everyone in the dashboard and the nav, reduced-motion settings included**
    (product owner, as on the payments landing; their own Windows has reduced motion on). Keep it
    short and small; do not add `prefers-reduced-motion` switches that turn it off.
  - **Fields are plain** (`.inst .field`): white, a 1px grey line, 12px corners, the label above and
    the help under the input (`Field` / `Sel` link it with aria-describedby), focus darkening the
    line with the tertiary ring. A text field never draws the square focus outline inside its rounded
    line (the product owner saw it as a stray box): `.inst :focus-visible`'s outline is off for text
    fields, which show focus themselves (their line and ring, or their well's `:focus-within`).
  - **One shape for everything** (product owner: "the same rounded pattern, no button outside that
    style"), tokens on `.inst` at the end of `dashboard.css`: every button, icon button, segment,
    toolbar search and filter is a pill; form fields and small boxes `--r-field` (12px); options in
    a list or menu `--r-item` (10px); popovers, menus and the wells inside a card `--r-pop` (16px);
    cards and panels `--r-card` (20px); modals `--r-modal` (24px). A new component takes one of
    these. Icon buttons and small outlined buttons take the snap's ink too (`ink.ts` lists them); an
    action in a panel's head is a small outlined button, a text action inside a table an underlined
    link.
  - **No chips**: plan, role, seat, lock, environment and ticket labels are coloured text.
  - **Copy says only what the screen needs** (product owner, 2026-10-25: no AI-style
    clarifications): no subtitles under view names, no note that restates a label, a placeholder,
    the network cards or the button (the swap button already names what is missing). A hint stays
    only when it prevents a mistake: a format, a requirement, a security warning.
  - **What loads has a standard skeleton** (`components/Skeleton.tsx`: `TableSkeleton`,
    `ListSkeleton`, `ChartSkeleton`, `Sk`): grey shapes of the content (rows, a status mark with
    label-over-value pairs, bars) with a light band sweeping across them, a solid blurred band rather
    than a gradient, each a polite status naming what loads. Content then arrives with a short rise
    (`.arrive`), table rows with their GSAP stagger, and the chart's bars grow from the axis.
  - Status is coloured text with a dot or an icon, never a capsule; section labels are plain
    sentence case; every overview block keeps `min-width: 0`, so nothing pushes the page wider on
    phones. To see it locally, sign in through local Authentik with the `.env` test account
    (`DEV_TEST_*`).

### Payment links on every chain

- **A payment link settles on Stellar, Solana or Monad**, on the environment's network (Solana
  devnet and Monad testnet in the sandbox). The form is composed, not a stack of fields: the network
  as three choice cards, the amount with its asset dropdown in one well (as the swap widget), the
  destination, and memo / message under "more options"; transaction intents
  (a known payer) are Stellar's only, Monad needs an amount and takes no wallet message. The schema
  (`src/schemas/payment-intents.ts`, tested) checks each chain's address shape and decimals; the
  Payments API checks the rest.
- **`src/lib/chains.ts` is the chain vocabulary** for every screen and route: names, native coins,
  test-network names, address shapes, explorers (transactions and accounts, per network) and the
  token presets. Presets are only addresses we verified: Solana USDC (mainnet `EPjF…Dt1v`, devnet
  Circle's `4zMM…ncDU`) and Monad mainnet USDC (`0x7547…b603`, from NEAR Intents' list); Monad's
  test network has none. Other tokens go by ticker and mint / contract (`TokenSelect`).
  `payment-link.ts` re-exports its chain list and explorer from there.

### Customers and their wallets

- **A customer holds wallets on several networks** (product owner, 2026-10-27; the server's
  `customer_wallet`, unique per organization, network and address). `views/CustomersView.tsx`: the
  table shows each customer's network marks and how many wallets; the create form takes any number of
  wallets (network, address checked against that network as it is typed, name); the detail lists them
  with the payments each made (opening Payments searched by that wallet) and adds or removes one
  (`/api/customers/{id}/wallets`, `customers:edit`). A customer's payments are those any of its wallets
  paid. `account` is the server's deprecated first wallet: never read it in new code.

### Organization wallets

- **The organization's receiving wallets live in Settings** (product owner, 2026-10-25: asking people
  to connect a wallet from the payments views is impractical, and members without the permission
  must not be able to remove one or pick an address outside the list). Model `OrganizationWallet`
  (chain, address, optional name, the wallet that proved it); routes
  `/api/organizations/{id}/wallets` (list: any member; connect: `wallets:create`) and
  `/api/organizations/{id}/wallets/{walletId}` (rename: `wallets:edit`; remove:
  `wallets:delete`). `wallets` is a permission resource like the others (owners and admins hold
  it implicitly). UI: `components/OrgWallets.tsx` (`OrgWalletsSection` in Settings,
  `ConnectWalletDialog`, `WalletSelect`, `useOrgWallets`).
- **Connecting proves the wallet**: it signs `walletProofMessage` (`src/lib/org-wallets.ts`: the
  organization, the network, the address and `issuedAt`), and the route checks the signature
  against the address (`src/lib/org-wallets-verify.ts`): SEP-53 on Stellar (Freighter), Ed25519 on
  Solana (Phantom, Solflare), EIP-191 `personal_sign` on Monad (any injected EVM wallet; the
  signer is recovered with `@noble/curves` + `@noble/hashes`, pinned). A proof is accepted for 10
  minutes; replaying one only connects the same wallet again. Tested against SEP-53's own vectors
  and web3.js's documented `personal_sign` example (`tests/unit/orgWallets.test.ts`). The browser
  side is `src/lib/wallets/prove.ts`.
- **A Stellar wallet is added with a signed XDR, not a connected wallet** (product owner,
  2026-10-27: people hand over a signed XDR). `ConnectWalletForm`'s Stellar branch takes the address
  and a name, then the proof transaction (`src/lib/wallets/wallet-proof-xdr.ts`: the same proof
  message hashed into a manageData entry, sequence 1, never valid) signed with Freighter in one
  click or in any wallet and pasted back (`signedXdr` on the connect route, no `provider`); either
  network's signature counts, since it applies on neither. `src/lib/wallets/signed-xdr.ts` checks a
  signed XDR in both the browser and the server, without Node's `Buffer` (a page has none). Solana
  and Monad still prove through their wallets' message signatures.
- **Payment forms choose, they never take a typed address**: the payment link's destination and the
  private payment's recipient are a `WalletSelect` of the organization's wallets on that network
  (whoever may connect wallets gets "connect another" inline, in the form, never a dialog on a
  dialog; the others are told someone with permission can do it in Settings). **The routes enforce
  it**: `POST /api/payment-intents` and `POST /api/zk-payments` answer 400 for an address that is
  not one of the organization's wallets (`orgHasWallet`), failing closed if the table cannot be
  read. Requests made with an API key straight to the Payments API are not affected.

### Public swaps (no account)

- **Product owner: Cosmos Pay offers public swaps and a public swap API without an account.**
  `/swaps` exists on the gateway and on the company site (`DUAL_PATHS` in `hosts.ts`: each domain
  serves its own, the platform redirects to the gateway): `src/pages/payments/swaps.astro` (a gateway
  content page: section bar, page header) and `src/pages/site/swaps.astro` (its own header, the
  institutional skin), both rendering `components/cosmos/swaps/PublicSwaps.tsx`: the dashboard's
  swap widget and screens on `publicSwapApi`, USDT0 out of Stellar with its networks (from the API)
  and a "send USDT0" that preselects the pair, the public API in three `curl` calls, the questions.
  The pages load `dashboard.css` (scoped to the widget's classes) and `public-swaps.css`. The nav's
  Products menu links it (`localHref` keeps it on the company site there).
- **The browser calls the gateway with the shared public key** (`GET /v1/public-key?env=prod`,
  keyless): commission is the public consumer's plan's (`swapFeePct("community")`, shown on the page
  with the offered plans' range, `swapFeeRange()`), and the server confines the key to quoting, creating, submitting and reading a swap by
  its id. **Every visitor shares that key**, so a record it creates comes back with a `publicToken`
  that only its creator holds: `publicSwapApi` keeps it in memory (never in the URL) and sends it as
  `X-Record-Token` to read, submit or report that record; without it the server answers 404. The
  gateway's CORS `allow_headers` lists `X-Record-Token` (`src/utils/apisix.ts`), or the browser
  cannot send it. **The gateway's CORS must list both origins** (`COSMOS_API_CORS_ORIGINS`:
  `https://payments.cosmospay.lat` and `https://cosmospay.lat`, as its default and `.env.example` do;
  an environment that sets its own list adds them and restarts, since the routes sync at boot), or the
  widget cannot reach it from either page. A local test needs the local origins in that list too.

### Swaps from the dashboard

- **The swap form is the standard swap widget** (`components/SwapWidget.tsx`, in the dialog that
  "New swap" opens from `views/SwapsView.tsx`'s filter row, framed by it (`.swap-modal`); the
  view starts with its figures as every one; product owner: "stop making flat forms"): "You pay" and "You receive" wells
  with a big amount and a token button naming its network, a flip between them, the quote updating on
  its own (debounced) with its details folded under the rate, the accounts the route needs, one
  button whose words say what is missing, and a slippage popover. The token picker
  (`components/TokenPicker.tsx`) lists the tokens on every network, searchable, by network, with
  official logos where they exist (`TokenMark`, else a neutral monogram) and each network's mark
  (`NetworkMark`) on its heading and in the network filter.
- **Token and network logos are Vite assets** (`src/assets/logos/{tokens,networks}`, product owner,
  2026-10-27: icons must not reload all the time). `@/lib/logo-urls` (`tokenLogoUrl`,
  `networkLogoUrl`) turns the manifest's file names into fingerprinted `/_astro/` URLs, which the node
  adapter serves with `max-age=31536000, immutable`; a file under `public/` goes out with
  `max-age=0` and is revalidated on every load. Render a logo through those two, never the
  manifest's value. The landing's brand files stay in `public/media/brands`.
- **Each side offers only what can be swapped** (product owner, 2026-10-26: some assets are not
  compatible). "Pay" lists `canPayWith` tokens (an OFT-only USDT0 destination never is one);
  "receive" lists `receivableFrom(from)`, the pairs `routeFor` settles in this environment. A new
  source keeps the other side only while the pair has a route; flipping needs a route back. The
  catalogue also drops what NEAR Intents no longer trades (`tradesOnNear`: no price, or tagged
  deprecated; it quotes none of those), as the Payments API's asset list does.
- **Tokens and routes are `src/lib/swap-catalog.ts`** (tested): NEAR Intents' list joined with the
  environment's Stellar assets and the verified Solana / Monad presets. Within Stellar, Solana or
  Monad a pair goes through that chain's market (the Stellar DEX in both environments, Jupiter and
  Kuru Flow on mainnet); between networks, or within any other network, through NEAR Intents. Until
  both addresses are in, a NEAR Intents pair shows an estimate from the listed prices (`priceUsd`,
  indicative), then the firm quote.
- **Every NEAR Intents network the Payments API validates is offered** (about 35: EVM chains,
  Bitcoin-family, XRP, Tron, TON, NEAR, Sui, Aptos, Starknet, Cardano, Aleo...; `NETWORK_NAMES` in
  `src/lib/chains.ts` names them). A deposit on a network with a wallet-link standard gets a link;
  elsewhere `depositUri` is null and the detail shows the address, memo and QR.
- **One list for every swap**: the swaps on each chain, the cross-chain ones and USDT0's transfers
  together, newest first, filtered by status group, type (on one chain / between chains / USDT0
  bridge), network and date. The old `?view=crossChainSwaps` opens it filtered to cross-chain; the
  sidebar has no separate entry.
- **The widget and the screens a swap opens take a `SwapApi`** (`src/lib/swap-api.ts`): `orgSwapApi`
  (the organization's proxies under `/api`) in the dashboard, `publicSwapApi` (the gateway with the
  shared public key) on the public swap pages. Same bodies (the Payments API's), so one widget
  (`components/SwapWidget.tsx`) and one set of screens (`components/SwapDetails.tsx`,
  `SwapRecordDetail`) serve both.
- **USDT0 out of Stellar** (`src/lib/usdt0.ts`, proxies `/api/usdt0/*`, OpenAPI tag USDT0): USDT0 on
  Stellar to USDT or USDT0 on a network LayerZero's OFT reaches (`GET /v1/usdt0/routes`: 21 today,
  native USDT on Ethereum, USDT0 elsewhere) is its own route in the catalogue (`routeFor` kind
  `usdt0`, ahead of NEAR Intents): 1:1, no slippage, LayerZero's fee in XLM, the seventh decimal
  stays on Stellar (the OFT shares six). The holder signs one Soroban transaction (Freighter or
  SEP-7), the screen follows the LayerZero message to its destination. Stellar mainnet only (USDT0
  does not exist on testnet), no Cosmos Pay commission. Networks only USDT0 reaches are named in
  `OFT_NETWORK_NAMES` (`src/lib/chains.ts`), never in `NETWORK_IDS` (that is NEAR Intents' set).
- **Stellar swaps, Solana / Monad swaps, cross-chain swaps and liquidity are non-custodial**: the
  Payments API builds the transaction, the person signs it in a wallet, the dashboard submits the
  signed envelope. Nobody's key ever reaches this app.
- **Freighter signs in one click** (`components/FreighterSign.tsx` over
  `src/lib/wallets/freighter.ts`, the SDF's `@stellar/freighter-api`, pinned and loaded on the
  first click): it checks the extension answers (2.5 s), the account matches the transaction's
  source and Freighter is on the transaction's network before asking it to sign, and says which
  one to switch otherwise. The QR (SEP-7) and the paste box stay for every other wallet. Used by the
  Stellar swap and the liquidity details; only a PENDING operation can be signed, and the swap's QR,
  link and unsigned XDR disappear once it was sent.
- **Every create carries an idempotency key** (`idempotencyKeys()` in `dashboard/helpers.ts`): the
  same terms keep their key, so a double click or a retry gets the swap already built (the server
  answers 409 to the same key with other terms). The proxies forward `idempotencyKey` in the body.
- **The Stellar form** sends the source asset (XLM unless another one with its issuer), the
  destination account (empty: the source) and a numeric memo (MEMO_ID).
- **Cross-chain (NEAR Intents) is mainnet only**: the sandbox lists assets and prices (a dry quote);
  opening a swap needs Production. Solana (Jupiter) and Monad (Kuru Flow) swaps are mainnet only too.
  Never fund one to test it: Stellar testnet with a Friendbot account is the end-to-end check.
- **Locally, a plan commission needs its recipient** (`NEAR_INTENTS_FEE_RECIPIENT`,
  `SOLANA_SWAP_FEE_WALLET`, `MONAD_SWAP_FEE_WALLET` on the community server) or the server answers
  503 misconfigured. A local server can set `SWAP_COMMISSION_DEV_WAIVER=true` instead: it waives
  (and logs) the commission; the boot refuses it in production.

### The payments landing

- **The gateway is several pages** (multi-page layout, product owner, 2026-10-25: "so not
  everything is in one place"). `/` is the home a cold visitor converts from: the hero with two
  risk reducers under its buttons (no monthly fee on Starter, testnet with no real money), the
  logos, what changes, how it works, the three ways to start, the plans, four security facts,
  the first four questions and the final call, with the main call to action repeated after
  "what changes" and "how it works" (`InlineCta.astro`). Each topic in full has its page,
  listed once in `src/lib/payments/site-pages.ts` (routing in `hosts.ts`, `robots.txt`,
  `sitemap.xml`): `/integrations` (options with the live demos, the developers' code, the
  three paths), `/use-cases` (businesses, the comparison with cards), `/security`, `/fees`
  (plans and calculator; `/pricing` is the company site's) and `/faq`. A sticky section bar
  (`Subnav.astro`) under the general nav links them and ends with the main call to action.
  It is the first thing under the nav on every page, the home included (product owner: no
  waiting for it), so there the hero starts under it instead of running up under the nav. Its
  links hover as the general nav's do (an underline sweeps in), and the repeated call to action
  sits close to the section it follows (the section above gives up most of its bottom padding;
  below it keeps its own). Two sections on the same canvas in a row share one gap (half each)
  instead of adding their paddings;
  each content page opens with `PageHeader.astro` (its h1, one line, a clay render).
- **Every section is a component** in `src/components/payments/landing/sections/`, reading
  `landingData(lang, layout)` (`data.ts`); `layout` "multi" turns topic anchors into page links
  (`links`). Teaser variants: `<Pricing compact>` (no calculator), `<Security compact>` (four
  facts), `<Faq limit={4}>`, `<Faq bare>` (heading for assistive tech only, under a page
  header). The page behaviour is `src/scripts/payments/landing.ts` (`startLanding()`), the head
  extras `LandingHead.astro`. Pinned stages stick under the nav and the section bar
  (`--subnav-h`); the script reads where each stage sticks. On a phone the section bar scrolls
  sideways and the script centres the current page in it.
- **Search engines get every language.** An indexable gateway page exists once per language at
  `?lang=<code>` (the language resolution reads it first) and its bare path is the x-default.
  `src/lib/payments/seo.ts` builds those URLs for everything that names them: the canonical (each
  version names itself), the hreflang links and `og:locale` (+ alternates) in `PaymentsLayout`,
  `robots.txt` (`Allow: <path>?lang=`) and the sitemap (every version with its alternates).
  `StructuredData.astro` (rendered by `LandingHead`) emits one JSON-LD graph per page:
  Organization, WebSite, the page (a FAQPage on `/faq`, with the questions the page shows) and a
  BreadcrumbList matching the breadcrumb `PageHeader.astro` draws over a content page's title.
  Only what the page says: no ratings, prices or claims beyond its copy.

- `/` on payments is `src/pages/payments/index.astro`: server-rendered, copy in
  `src/lib/payments/landing-i18n.ts` (seven languages, parity-tested), rates read from
  `src/lib/plans.ts`. It and the content pages are the indexable payments pages (robots `Allow` per page, sitemap).
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
- **The FAQ and the final call are separate sections** in the multi-page layout (the product
  owner asked to see them apart); `.pl-closing` (one canvas for both) remains for the single page.
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
  (rates parsed from `plans.ts`, escrow's surcharge as a checkbox, a logarithmic slider); the final
  call carries the brand's astronaut (`public/brand/astronauta-telefono.svg`, inverted in dark
  mode). **Images too, not only drawn UI** (the product owner asked for images after the
  mock-ups): the brand's astronauts on the comparison table (none by the benefits heading: the product
  owner removed that one), by the
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
  within the deadline the merchant sets for the link, and escrow costs 1.95% per payment on top
  of the plan's rate. No escrow code exists in this repo, the community server, the SDK or the
  wallet yet. "What changes" carries both modes (benefits + the "two ways to settle" cards), and
  so do the comparison, the hero lede, pricing and the FAQ.
- **Only checkable claims**: no customer logos, volumes, certifications, licences or uptime
  figures until they are real. Every product claim in the copy is checked against the dashboard
  and the community server (e.g. the dashboard sets amount, memo and message, not an expiry).
  The card column of the comparison states the usual case and carries a footnote saying so.
- **Networks, assets and wallets run as three marquees, and only the marquees show** (the
  product owner removed the visible title, row labels, the SEP-7 note and the pause button): what a
  payment settles on (Stellar, Solana, Monad and their assets), the networks and tokens NEAR Intents
  swaps between (`NETWORK_IDS` with a logo, plus a few stablecoins and wrapped BTC), and the
  wallets, Pollar among them (its brand kit's blue mark on light pages, the white one on dark, and
  only ever beside its name, as the kit asks).
  **Every row runs at the same speed** (product owner): `landing.ts` sets each row's duration
  from the width of one set (48 px/s), so a longer row loops more slowly instead of moving
  faster. Two identical sets slide by half the track; the moving copy is `aria-hidden`, and a visually
  hidden title, row labels and list carry the names. Hovering a row holds it; like the hero
  video they run for everyone, reduced motion included (the product owner's call). **Logos are official artwork only**, full colour, in
  `public/media/brands`: USDC, XLM, SOL from cryptocurrency-icons; Freighter, LOBSTR, xBull,
  Albedo, Rabet from the Stellar Wallets Kit; Phantom and Solflare from their Solana
  wallet-adapter icons; Monad and EURC from Trust Wallet's assets. Single-colour marks (Stellar,
  the Cosmos isotype) are inline in currentColor (`Mark.astro`) so they follow the theme. Never
  draw an approximation of someone else's logo. **Every token and network logo** (the landing's
  swap row, the dashboard's `TokenMark` everywhere an asset shows) comes from the generated manifest
  `src/lib/token-logos.ts` (`tokenLogo` / `networkLogo`, tested in `tests/unit/tokenLogos.test.ts`):
  96x96 WebP files in `public/media/{tokens,networks}`, each with its source and licence in that
  folder's `SOURCES.md` (Trust Wallet's assets, MIT; the projects' own brand kits; token lists
  that name an official icon). `scripts/fetch-token-logos.mjs` refreshes the set (never during the
  build) and refuses CoinGecko and CoinMarketCap images. A token without official artwork keeps a
  neutral monogram.
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
- **Besides the buttons' ink, the only blue effect is a 3D render's own hover** (product owner,
  after trying blue cards, blue entrance pops and a blue payment travelling the flows: "quita
  los efectos azules, solo déjalo en el 3d"): its clay takes a faint tertiary blue (a filter) and it leans in; the card
  around it does not change. Entrances, completions and the flows keep their own colours.

### The contact form

- **The final call on every gateway page carries a contact form** (product owner), beside the
  main button (`FinalCta.astro`, anchored at `#contact`). It posts to `/contact` on the payments
  domain (`src/pages/payments/contact.ts`); the rules are pure and tested in
  `src/lib/payments/contact.ts` (`tests/unit/paymentsContact.test.ts`).
- **It works without JavaScript**: the page comes back at the form with
  `?contact=sent|invalid|limited|failed`, shown in its live region; with the page script it posts
  in place (`Accept: application/json` answers `{ status, errors }`) and marks the wrong fields.
- **Only this origin may post** (Astro's `checkOrigin` is off app-wide, so the endpoint checks
  `Origin` itself). A script is answered "sent" and nothing goes out: the honeypot field
  (`website`) filled in, or a post under 3 s after the page rendered. One network sends at most
  five messages per 15 minutes, keyed on `cf-connecting-ip` (Cloudflare overwrites it) else the
  connection, never X-Forwarded-For or X-Real-IP (a client writes those). Past sixty an hour from
  everyone together the form points visitors at the public address and logs a warning (a circuit
  breaker: forged keys cost the form, never the way to reach the team). In memory: one process.
  For a firm per-network limit nginx should accept only Cloudflare's addresses, so
  cf-connecting-ip cannot be forged. The body is read
  up to 20 KB, whatever Content-Length says. One-line fields refuse line breaks, so nothing a
  visitor types can become a mail header.
- It emails `CONTACT_EMAIL` (else the gateway's public address, `CONTACT_ADDRESS`) through
  `src/lib/mailer.ts`, the visitor as the reply-to, their words as text (escaped in the HTML part).
  With no mail transport configured the visitor is told to write to that address instead.

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

### The merchant fee (B2B on top of Cosmos Pay)

- **Product owner (2026-10-26): every service takes a merchant fee**, so an organization can
  resell Cosmos Pay to other businesses and charge its own customers: a percentage (bps, up to
  10%) and/or a fixed part, paid on-chain to a wallet it names, apart from the plan commission;
  each request chooses whether the recipient pays it (taken from the amount) or the payer (on
  top). The Payments API owns the rules (`merchantFee` on its routes, `src/common/merchant-fee/`
  over there); where a chain cannot split a payment natively it is a contract of our own.
- **Live in the API on every service:** payment links on all three chains, swaps on all three
  (Stellar, Jupiter, and Kuru through `contracts/MerchantFeeSwapRouter.sol`), cross-chain swaps,
  private payments (a third confidential transfer), liquidity (bps of each asset) and USDT0
  (through the Soroban wrapper `contracts/soroban/usdt0-fee-wrapper`, which also carries Cosmos
  Pay's plan commission: without it a USDT0 transfer charges none, and the dashboard shows the
  commission only when `feeAmount` is above zero). The two contracts are the operator's to deploy
  on mainnet (`KURU_MERCHANT_FEE_ROUTER`, `USDT0_FEE_WRAPPER`);
  until then those routes answer `merchant_fee_unsupported`. B2B goes straight to the API: the
  dashboard's own forms are for the organization's operations.
- **Dashboard:** the payment link form's "more options" has the merchant fee, on every chain:
  percentage, fixed amount, the wallet (a `WalletSelect` of the organization's wallets on the
  link's chain, never a typed address; EVM ones compared whatever their case) and who pays it. `POST /api/payment-intents` takes `merchantFee`
  (`src/schemas/merchant-fee.ts`) and refuses a fee wallet that is not one of the
  organization's (`orgHasWallet`), as it does the destination. The payment's view lists the fee.
- **A Stellar link with a merchant fee cannot be one SEP-7 `pay` link** (that pays one
  account): the server stores the hosted checkout as its `uri`, and the public read answers
  `merchantFee` and `payerAccountRequired: true`. The checkout (`PayerStep.astro` in every
  design, `checkout.ts`) then asks for the payer's Stellar account (typed, or Freighter's),
  calls the keyless `POST /v1/payment-links/{id}/transaction` (`buildPayerTransaction`), and
  shows that envelope's QR and `web+stellar:tx` link, or has Freighter sign it and submits it to
  Horizon (`submitSignedTransaction`). Until then there is no QR, and never the manual transfer:
  paying by hand would skip the fee and leave the link unpaid. The amount shown is what the
  payer sends (`payerTotal`: the fee added when the payer pays it), with a line naming the fee.
  The embedded checkout opens such a link's hosted checkout in a new tab.
- **The gateway's keyless payment-links route allows POST** (`PAYMENT_LINKS_METHODS`), for
  that build. An environment whose routes were synced before needs a resync (the platform's
  boot does it) or the checkout cannot build the envelope.
- **The checkout reports what the payer does with a wallet** (product owner, 2026-10-27: the
  progress must see the wallet open, close and send): `reportCheckoutEvent` posts
  `walletOpened`, `walletClosed` or `sent` to the keyless `POST /v1/payment-links/{id}/events`
  (same route, POST), and the owner's read answers `checkoutWalletAt`, `checkoutWalletClosedAt`
  and `checkoutSentAt`. The extension and Freighter report for themselves (`signWithFreighter`'s
  `onOpen` runs once Freighter is there); a wallet link or the web wallet counts as opened when
  the page blurs or hides within `WALLET_OPEN_MS` of the click, and as back without paying when
  the page shows again and, a ledger later, the link is still open. Informational only: the
  status still follows the chain. `PaymentRecordView`'s progress draws created, on the page,
  wallet (open, or a warning when it came back without paying), sent, paid; only the furthest
  step is live.
  **A reported `sent` is never the chain's word:** the keyless route takes it from anyone
  holding the link, so "Payment sent, confirming" stays SUBMITTED's; a report reads "not on the
  network yet" for `SENT_REPORT_MS`, then turns into the warning "send not confirmed".
- `parsePaymentLink` refuses a malformed fee and a `payerAccountRequired` link that is not a
  Stellar link with a fee and an amount, and only then accepts an `https` `uri` (never used as
  a wallet link).
- **A Solana link with a merchant fee is a Solana Pay transaction request**
  (`solana:https%3A%2F%2F…/solana-pay`): the wallet asks the API for the transaction with both
  transfers. `URI_SCHEMES.solana` takes that shape and a transfer request, nothing else. The
  checkout hides the manual transfer for it, as for Stellar; a **Monad** link's deposit address
  splits the fee itself, so its manual row stays and shows the total (`payerTotal`).
- **Private payments:** a ZK payment with a merchant fee carries `merchantFee` (its amount and
  wallet) in the public read. `ZkCheckout.tsx` then makes a third confidential transfer after
  the commission (the "merchantFee" step, only when there is one) and confirms with
  `merchantFeeTxHash`; `parseZkCheckout` voids a payment whose fee is malformed, and
  `confirmZkCheckout` sends no hash that is not one.

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

### ZK payments as a service

- **People see "private payments", never "ZK"** (product owner, 2026-10-25: people don't know what
  ZK payments are): every catalog string, page title, API message, Swagger tag and docs heading says
  private payments (pagos privados, pagamentos privados, paiements privés, private Zahlungen, निजी
  भुगतान, 隐私支付). `zk` stays only in identifiers: routes, keys, file names, the
  `ZK_PAYMENT_SUCCEEDED` event and code comments.
- **What it is**: confidential payments on Stellar, the amount hidden on-chain (Pedersen
  commitments, UltraHonk proofs verified on-chain), built on OpenZeppelin's Confidential Token
  (`stellar-confidential` 0.8.0) and the TypeScript SDK `stellar-confidential-token-sdk` (MIT,
  unaudited; pinned to commit `aad1706`, the product owner approved the dependency). Cosmos Pay
  operates its own confidential token (wrapping XLM) with its own auditor registry, so it holds the
  auditor key every account on the token is registered under. **Commission: 0.18% per transaction**
  (18 basis points, `src/lib/zk/amounts.ts`, tested; the Payments API is the authority), taken from
  the payment: the payer pays the amount, the merchant receives it minus the commission, Cosmos Pay
  the commission. **Testnet only for now**; a network without it answers "not available".
- **Flow**: the dashboard's ZK payments view (`views/ZkPaymentsView.tsx`, Payments group) creates a
  payment through `/api/zk-payments` (OpenAPI-registered); the payer pays on the ZK checkout
  `payments.cosmospay.lat/zk/{id}` (`components/cosmos/zk/ZkCheckout.tsx`): Freighter connects, the
  confidential key is derived from two SEP-53 signatures (`src/lib/zk/derive-key.ts`) on every
  connect and never stored (a reload asks for the signatures again; `ZkWallet.connect` also removes any
  key an earlier version left in sessionStorage), the account registers if needed, public XLM is deposited and
  merged if the confidential balance is short, then two confidential transfers (the net amount to
  the merchant, the commission to Cosmos Pay's fee account) and `POST /v1/zk-checkout/{id}/confirm`
  with both hashes. The server decrypts both amounts with the auditor key and marks it paid.
  Retries never pay twice (the sent hashes are kept). **A private account is a customer's Stellar
  wallet** (product owner, 2026-10-27: they are customers' wallets, with no limit on how many; the
  organization's own wallets, in Settings, only take its fee). The payment's recipient is one of
  them: the create body names `customerId` and `recipient`, and `/api/zk-payments` refuses a recipient
  that is not a Stellar wallet of that customer (`cosmosCustomers.get`); an optional `merchantFee`
  (percentage and/or fixed XLM, from the amount or on top, as on a payment link) must go to one of the
  organization's Stellar wallets (`orgHasWallet`), and the dialog shows the split the API makes
  (`zkSplit` with `ZkMerchantTerms` in `src/lib/zk/amounts.ts`: the commission on the amount, the
  fee's percentage rounded down). The accounts are **a view of their own, "Private accounts"**
  (`views/ZkAccountsView.tsx` with `components/ZkAccountPanel.tsx`, beside Private payments in the
  sidebar; product owner, 2026-10-27: separate the two views; no bare "connect Freighter"):
  figures first (the accounts and sub-accounts, the customers holding them, the private payments
  they received), then the **"Private accounts" table** (product owner, 2026-10-27: the same table
  format as every list). **Only accounts on the token's contract are listed** (product owner,
  2026-10-27: an account that is not on the contract is a public wallet, never a private account):
  every customer Stellar wallet (every page of `/api/customers`, 100 at a time) is read from the
  chain with no signature (`confidentialAccounts` in `src/lib/zk/wallet.ts`, 25 at a time) before
  the table shows, and only the registered ones are rows, with their customer, their balances (read
  only with the customer's signature, "view balances" in the cell, the row and the detail) and the
  private payments they received (a count that opens Private payments filtered to the account,
  `q`). A row opens the account's detail. Private payments reads the same customers
  (`useCustomerAccounts`) and the chain (`useRegisteredAccounts`) for its recipients, with no
  table of accounts. **"Create private account" asks for the
  signatures** (product owner, 2026-10-27: "añado mi pública y no me crea una privada"; the button
  and the dialog say create, the person passes the public account and the contract holds its
  private account): a **dialog in two steps** (`AddPrivateAccountModal`, the
  `CustomerFormModal` pattern with `FormSteps`; creating is always a modal): the account (a
  customer, new or already there, and one of their Stellar wallets not on the token yet or a new
  address), then the signatures: the account must exist on the network (`accountExists`, refused
  before any signature), the customer signs the key transaction, the browser proves the
  registration and the customer signs the register transaction; an account already registered
  is added with nothing to sign (the token keeps one confidential account per Stellar account, so
  nothing new can be derived for it, and one registered with the message root still receives
  private payments; only its balances do not open here). **The wallet is saved to the customer
  (`customers:create`) only after that**, so nothing public is ever listed. Each signature
  opens over the dialog, which cannot be closed while the work runs. **The second step reads the
  contract first and says which case it is**: no private account yet (it is created, "Request
  signatures and create"), or this public account already has one (since when and in which
  transaction, from the token's `register` event, `registrationOf` in `src/lib/zk/wallet.ts`; "Add
  the existing private account", no signature) or another one, a sub-account of the address
  ("Create another private account", the default: three signatures with the address, the
  sub-account's creation, its key transaction and its register). Which accounts are sub-accounts,
  and of which address, is read from the chain (`controllersOf`: the account's signers), never
  stored; a sub-account's actions are signed by its address (`XdrSigner`'s `signerKey`). The
  detail shows "Created on the contract" the same way, and "Signed by" for a sub-account. "Delete private account" (row menu and detail,
  `customers:edit`) removes the wallet from its customer, as the customer's detail does; the
  confidential account and its balance stay the customer's on-chain. **Nothing connects or opens a wallet** (product owner,
  2026-10-27: people hand over a signed XDR, not their wallet, and the wallet is the customer's, so
  never Freighter here): every signature goes through `components/ZkSignDialog.tsx`, the copy and
  paste half of the swap's signing (the XDR in a `CopyBlock` for the customer, the signed XDR pasted
  back, refused unless it is that transaction signed by the row's account, with a clock for the
  SDK's 180 s window). `XdrSigner` (`src/lib/zk/xdr-signer.ts`) is the
  SDK's signer. The confidential key comes from the signature of a fixed, never-valid **key
  transaction** (`keyTransactionXdr`: sequence 1, a manageData entry binding token and account), which
  any wallet can sign; **signed once** (product owner, 2026-10-27: one signed XDR from the customer;
  Stellar signatures are Ed25519, deterministic by RFC 8032, so a second one proves nothing). That
  root is Cosmos Pay's, not the protocol's SEP-53 signer root: an account created this way opens here,
  not in another client of the protocol. Anyone can ask a person to sign that public transaction, and
  the signature reads the account's private balances (it moves nothing); the dialog warns about it.
  **Cosmos Pay is non-custodial and stores no key material** (product owner, 2026-10-27), so no
  per-account secret is mixed into the root, and the API holds no part of the key: never add one
  server-side. `ZkWallet.connect` tries roots in order: the table passes the transaction root only
  (an account made with a message signature, the private checkout's with Freighter, says it was
  created elsewhere); the private checkout, which signs with Freighter: transaction, then message (product
  owner, 2026-10-27: an account created at the checkout must open in the table; one registered with
  the message root, by the checkout or by the table before it took signed XDRs, never does there).
  Then view balances, incoming to
  available, deposit and withdraw in the row menu and the detail (the amount in a dialog, the progress
  under the row or in the add dialog, with a clock while the proof runs). Without any private account
  the table says so and offers "add private account"; the create dialog then says no customer has
  one. The dialog's recipient is a select of the private accounts only (the server refuses an
  unregistered recipient anyway), and it waits until the chain was read. No separate account page.
- **Proofs are generated in the browser.** The private checkout is cross-origin isolated (COOP
  same-origin, COEP credentialless, set by the middleware on every `/zk` path of the payments domain,
  which owns the `/zk` prefix), so bb.js proves on several threads; the dashboard is not isolated and
  bb.js proves there on one thread with plain memory (a register proof took about 7 s headless), as
  it does in a browser that cannot isolate (Safari). `canProve()` only asks for WebAssembly;
  `provesInParallel()` says which mode applies. bb.js is **served by a route, not public/**:
  `/zk/bb/{version}/{file}`, on the payments domain **and the platform's** (`PROVER_PREFIX` in
  `hosts.ts`: bb.js starts its Web Worker from its own URL, which must be the page's origin)
  (`src/lib/zk/bb-assets.ts`) reads `node_modules/@aztec/bb.js/dest/browser` at the SDK's pinned
  version (`src/lib/zk/bb-version.ts`, `tests/unit/zkBbAssets.test.ts`) and adds the isolation
  headers its Web Worker needs (static files skip the middleware). Astro leaves `params` empty for
  that rewritten path, so the route reads the path. The SDK encodes contract arguments with Node's
  global `Buffer`, which browsers lack ("Buffer is not defined" on every register, transfer and
  withdraw): `src/lib/zk/buffer-global.ts`, imported first by `wallet.ts`, installs the `buffer`
  package's. `@aztec/bb.js` is aliased to a stub in Vite and
  loaded as native ESM by `src/lib/zk/bb-loader.ts`; noir's wasm packages are excluded from
  dependency pre-bundling. The development build exposes `window.__zkSelfTest(token, account)` in
  the private payments view: a real register proof with throwaway keys, no wallet or network.
- **What the pages read comes through the gateway, never this server**: the keyless route
  `<route>-zk-checkout` (`/v1/zk-checkout/*`: the payment's public view, the confirm call and the
  network's config; any origin, no credentials; `src/lib/apisix-keyless.ts`, tested). It has its own
  prefix because nothing under it needs a consumer; every authenticated ZK route stays under
  `/v1/zk-payments`. `src/lib/zk/checkout-api.ts` is the trust boundary (every field checked, the
  RPC must be https; tested).
- The landing presents it in the pricing lede and the FAQ ("What are private payments?").

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
- Starter is 1.5% + 18¢ per payment, no monthly fee. A rate shown anywhere comes from `plans.ts`
  or must match it.
- **Every rate is 75% of the competition's, rounded down** (product owner, 2026-10-27), so each
  is at least 25% cheaper: payments from BitPay's tiers (2% / 1.5% / 1% + 25¢ → 1.5% / 1.12% /
  0.75% + 18¢; the monthly fees have no counterpart and stay), swaps from MetaMask's 0.875%
  (Starter and the public key 65 bps, then 26 / 13 / 7 on the same ladder as before), private
  payments from Railgun's 0.25% (18 bps, the server's `ZK_PAYMENT_FEE_BPS`), escrow from
  Escrow.com's 2.6% (1.95%). A new rate keeps that rule and changes every surface together.
- **Every service's rate is on the pricing surfaces** (product owner, 2026-10-27: the swap
  commission was on no pricing page). `/pricing` compares, per plan, the payment fee, the swap
  commission (`swapFeePct`), escrow (`ESCROW_FEE_PCT`), private payments
  (`PRIVATE_PAYMENT_FEE_PCT`) and the merchant's own fee; each plan card, the payments site's
  `/fees` cards, the dashboard's plan comparison and the onboarding spec panel show the swap
  commission too, and the pricing FAQ quotes every plan's and the public key's. Copy carries
  `{placeholders}` filled from `plans.ts`, never a written rate.
- **Cosmos Pay is sold as a service** (product owner, 2026-10-27): payments, swaps, a payment
  gateway and private payments. Cosmos Pay runs everything; an organization only names the wallet
  addresses that receive the money (and its own fee) and signs with its wallet. Copy never says
  an organization runs anything or uses keys of its own to offer them.
- **A plan has a standing** (`src/lib/plan-status.ts`, tested): `active`, `paused`, `past_due` or
  `suspended`, stored on the owner's profile (`profile.planStatus`, migration
  `20261026120000_profile_plan_status`, default active). Billing has no provider yet, so staff set
  it in the admin users view (`PATCH /api/admin/users/{id}` `planStatus`); a provider's webhooks
  will set it later. Organizations carry their owner's (`OrganizationSummary.planStatus`) and the
  overview's account card shows it. It changes nothing else yet (no feature is blocked).

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
