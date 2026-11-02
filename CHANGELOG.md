# Changelog

All notable changes to the Cosmos Pay Developer Platform are documented here.
Generated from [Conventional Commits](https://www.conventionalcommits.org) by [git-cliff](https://git-cliff.org).
## [0.21.7] - 2026-11-02

### Bug Fixes
- WCAG AA contrast, card heading order, Solana/Monad via the SDK (88f22f0)

## [0.21.6] - 2026-11-02

### Documentation
- SDK 2.3.2 reference and the Cosmos Pay Wallet name (9b11b31)

## [0.21.5] - 2026-11-02

### Bug Fixes
- Pin the agent skill that matches pay_sdk 2.3 (a748346)

### Performance
- Load the API reference UI only on API pages (5b044b1)

## [0.21.4] - 2026-11-02

### Documentation
- Regenerate the SDK reference for @cosmosapp/pay_sdk 2.3.1 (every webhook event) (dd96c1c)

## [0.21.3] - 2026-11-02

### Documentation
- Regenerate the SDK reference for @cosmosapp/pay_sdk 2.3.0 (33307ca)

## [0.21.2] - 2026-11-02

### Documentation
- Regenerate the API reference (server v1.8.6 description fixes) (11add15)

## [0.21.1] - 2026-11-01

### Documentation
- Regenerate the API reference with described schemas (server v1.8.5) (185e1f1)
- KYC wallets and bank accounts on a page of their own (b7b0282)

## [0.21.0] - 2026-11-01

### Features
- Llms-full.txt in two parts, guides and SDK, and the REST API reference (7aed381)
- Answer each FAQ in a passage that stands on its own (91ce7f7)

## [0.20.1] - 2026-11-01

### Bug Fixes
- Embed page titles fit a search result (eda4219)

## [0.20.0] - 2026-11-01

### Features
- /security says how webhooks are signed and where to report an issue (34f9cbc)
- /compare sets Cosmos Pay beside Stripe's stablecoin payments, beyond the rate (55a31a0)

## [0.19.1] - 2026-11-01

### Bug Fixes
- One wallet name, Cosmos Pay Wallet (35d9adb)

## [0.19.0] - 2026-11-01

### Features
- The Organization states its country (AR), as /about does (99daadc)

### Bug Fixes
- Drop dangling article nodes from /learn; SDK node states its license (8ee0ff1)
- Plain Markdown for agents; Solana and Monad through the SDK (bec3dbf)

## [0.18.1] - 2026-11-01

### Documentation
- Regenerate the SDK reference for @cosmosapp/pay_sdk 2.2.1 (9e2e0bc)

## [0.18.0] - 2026-11-01

### Features
- Serve Bing's ownership file on every domain (9ee9653)

## [0.17.0] - 2026-11-01

### Features
- Guides cite the payment-request standards they name (fc8b86a)

## [0.16.0] - 2026-11-01

### Features
- Agent discovery: Link headers, auth.md and an agent skills index (95afd74)
- List each response's fields in the API reference Markdown (f80d77b)

### Performance
- Hand each API reference page only its part of the OpenAPI spec (0d906cd)
- Write less of the API reference's UI into the exported HTML (07ae242)

### Build System
- Fail the docs build on a page over 500 KB of HTML (289fea7)

## [0.15.0] - 2026-11-01

### Features
- The company's own JSON-LD nodes and a .md address per page (8185093)
- Date each page by its own sources, and show it on /faq, /compare and the networks (288b261)

### Bug Fixes
- Open payments pages with any query string and their slash form (2aaba5c)
- Link every docs page at its trailing-slash address (59b0e6c)
- Drop the HowTo JSON-LD from the guides (ad4ce06)
- Load Google Analytics on the company site's public pages only (9512a8c)

### Documentation
- Sync the API description with the server (2e0fba7)
- Robots, docs links, page dates, docs JSON-LD and analytics rules (60e022d)

### Testing
- Check every page's docs links and JSON-LD, and the docs' shared nodes (a4944a8)

## [0.14.0] - 2026-11-01

### Features
- A share card per page and language on the site and the gateway (6217923)

### Documentation
- Sync the DeFindex routes with the server (7f7d329)

## [0.13.0] - 2026-11-01

### Features
- Every page as Markdown and llms-full.txt on the site and the gateway (a6e4a68)

### Refactor
- Share the data the pages render with pure modules (118c872)

### Documentation
- Describe every operation, and no written private-payment rate (60c8661)

## [0.12.0] - 2026-11-01

### Features
- A guides hub at /learn with four guides in seven languages (9e9dc01)
- One English URL per page, page dates, one plans Product (256fe7b)
- Links keep the page's language, sticky language, /tos redirect (1649ab9)

### Bug Fixes
- Clean heading text, JSON-LD by the shared Organization, export check (64ce2b1)
- Precise custody claims, computed counts, short descriptions (f133eb9)

## [0.11.0] - 2026-11-01

### Features
- Escrow labelled coming soon, and a company About page (ea92559)

### Documentation
- Spanish voice per surface (f1c3975)

## [0.10.1] - 2026-11-01

### Miscellaneous
- Bump the minor-and-patch group across 1 directory with 3 updates (d7810a4)
- Bump the minor-and-patch group across 1 directory with 10 updates (7f776c3)

## [0.10.0] - 2026-11-01

### Features
- Descriptive page titles and h1s, and an answer-first FAQ (3f0db21)
- Company home and pricing with checkable claims only (337b311)
- Language URLs, structured data and AI discovery on the public domains (5835129)
- Pages for Stellar, Solana and Monad, and a fee comparison (db61f23)
- IndexNow key file on every domain and a sitemap submit script (fbebb1f)
- SEO, hreflang, JSON-LD, sitemap and LLM outputs for /docs (a53a4f3)

### Bug Fixes
- Name the network a private account's signature is for (ce5d23e)
- Check a merchant fee instead of throwing on it (90ce71c)
- Trust the three public domains' Host header (a37f1d1)
- Link an Authentik sign-in by email only when it is verified (c338d56)
- Cut SDK reference descriptions at a sentence or word, resolve {@link} (1d6dde5)

### Miscellaneous
- A demo for every integration option on /integrations (8043ab0)
- The integration demos in Hindi and Chinese (ee1ff03)

### Performance
- Download only the active language's catalog in the browser (48ce926)
- Make the wallet figure a fast LCP on the company home (e066f32)
- Prioritize the FAQ art and start the hero video after load (ef6d8e8)
- Load Google Analytics once the page is idle (ad5126b)

### Documentation
- Note per-language catalogs and the deferred hero video (4e41a4d)
- The company home's rules in CLAUDE.md and AGENTS.md (c07dae4)
- Document the per-language URLs, SEO endpoints and structured data (746aabf)
- The network pages and the fee comparison in CLAUDE.md and AGENTS.md (d613075)
- Sync the Payments API reference with the community server (b59436a)
- Point agents at the docs host and the OpenAPI spec (d217dc6)

## [0.9.0] - 2026-10-28

### Features
- Serve cosmospay.lat and payments.cosmospay.lat from this app, routed by domain (e99d10b)
- Landing, checkout designs and an institutional dashboard (d0966de)
- Show the product in the landing's sections (83c7e5b)
- Landing images, cleaner calculator, button inks by colour (f4a86be)
- Retire the free Community plan, Starter by default (422a0d4)
- Pay button and embedded checkout for merchant sites (5930953)
- Integration options, pinned sections and counters on the landing (ae666b0)
- Demo mode for showcases (8258a77)
- Live integration demos, pinned-section counters, navy dark mode (5070297)
- Multi-page gateway alternative (270ea25)
- Accessible nav on every device, multilingual SEO, blue interactions (9ed134d)
- Contact form in the final call (e322c4c)
- Follow the gateway reference strictly and make swaps signable (7f26056)
- Frameless shell, one filter bar, skeletons, payment links and swaps on every chain (20da2ad)
- Standard swap widget for every NEAR Intents network, one-row filters, animated popups (fd592ef)
- Search, one shape for every control, metrics beyond payments, token logos (135baf5)
- One speed for every logo row; animate tab panels and the chart tip (01e20d0)
- ZK payments as a service, Hindi and Chinese, and a fully translated dashboard (db0c4ff)
- Call ZK payments "private payments" wherever a person reads (11aaae8)
- Switch the Fiat view off for now (053951d)
- Manage the confidential account inside the private payments view (cb9a171)
- The organization's wallets, connected in Settings, chosen in payment forms (12c5d57)
- Say before signing when the swap also adds a trustline (acd9a5f)
- Private payments start from the organization's wallets, not "connect Freighter" (8e28e54)
- Public swaps and USDT0 out of Stellar; a dashboard where everything named opens (6bd2a9d)
- USD settled volume, quick links, and tables that keep their height (f33a68b)
- Ids that open and preview, accounts that link and copy, each list's own activity (33e8f41)
- Every reference copies, and previews whatever it can (da27051)
- Every row an icon and a menu, status marks, network logos, empty tables (30a9aa2)
- The plan's standing in colour on the account card (23a2c9f)
- A payment opens on a view of its own (20657f7)
- Show Cosmos Pay's commission on USDT0 transfers (3b93fc6)
- Publish every service's rate and cache logos for a year (08aeeaa)
- Customers with wallets on several networks, private accounts as a table (653d73a)
- Private accounts signed with an XDR, figures before tables (372702f)
- Add a Stellar wallet with a signed XDR, not a connected wallet (5b37c8f)
- Private accounts are customers' Stellar wallets (e6360ca)
- One customer signature, no Freighter, add account in a modal (8e61701)
- Delete private accounts from the dashboard (28fe360)
- Every list on the Payments table pattern, deletes confirmed, long forms in steps (37f8bd6)
- Pools and positions open their detail, icon actions (5056cc5)
- Every admin row ends with its menu (b5238cb)
- Team and wallets as the Payments table, figures first (4778324)
- Admin lists as the Payments table, figures first (d3d5756)
- Long forms in steps, every create in a dialog (a037954)
- Users and notifications open their detail, fiat adds in dialogs (928ceab)
- Tickets as the Payments table, the conversation in a dialog (33e02b2)
- Every rate at 75% of the competition's (343ed99)
- "Create private account" says from the contract what it creates (b711c9d)
- More than one private account per address, through sub-accounts (8d72e74)
- A payment followed live; the environment switch slides; fixes (13353e2)
- Follow the payer's wallet on a payment's progress (8dcbf40)
- Activity charts that compare outcomes (386997f)
- Private accounts on a view of their own (e57d268)
- Select several rows and delete them at once (d25550e)

### Bug Fixes
- Plan buttons name the plan, LinkedIn in the footer (d72fd32)
- Drop "Inc." from the footer and centre section heads (286632c)
- No lighter band behind the hero video (16c1b63)
- Footer copyright is just "© 2026 Cosmos Pay" (c0f486c)
- Section bar first on the home, inline calls aligned (fdf428d)
- Blue only on the 3D renders' hover (ab650fc)
- Tighter space around the repeated call, nav hover on the section bar (d850ca7)
- Even spacing, less space above the repeated call, no first astronaut (d26717e)
- Contact form limits a client cannot forge or exceed (1cffa28)
- Contact form's overall cap is a circuit breaker, not a lockout (371d661)
- Plan and role labels lose their tint as well as their padding (250eaf0)
- Refuse dot segments that survive the decode, match prover files exactly (0265af6)
- Read paths as the URL parser will, and keep rewrites inside their mount (28480ca)
- Give the browser the global Buffer the confidential-token SDK expects (cf9aa71)
- The public pages read their own records only, with the record token (f495e8f)
- One size for the page title, a slash for its breadcrumb, the environment kept (b3b9e11)
- Say what the private key signature exposes, and document it (a2f0bcb)
- List endpoints from the API's page, word log statuses (3d3d0e7)
- Clear both production dependency audits (bb865d4)
- Derive the private key from a signature on every connect (4d9768e)
- Adding a private account asks for the signatures and registers it (8918aab)
- The checkout derives from the key transaction first; say why a key does not match (be646dc)
- No empty-state text anywhere; standing rules in the agent files (ca1d8c3)
- An account already on the token is added with no signature; 24-hour times (a53c985)
- A warning with the choice, links, and who signs each transaction (21039c5)
- A reported send is not the chain's (35f1f12)
- Findings of the view-by-view sweep (5f8a069)
- Findings of the functional pass (0447589)

### Miscellaneous
- Remove every em dash from copy, code and docs (6bd2aea)
- History per view, a record's head is its route, expired payments are history (7d4cc60)
- Mark the chosen checkout design, scale the network badge to its token (b785e0f)
- Offer only what can be swapped, and mark each network in the picker (51a8395)
- An app-only build, unit tests on four processes (9b1c4ea)

### Performance
- Load in one go, read the session once per request (5bd019a)
- Modals open without a backdrop blur or a page reflow (607e4cf)

### Documentation
- Describe the platform as multi-chain (Stellar, Solana and Monad) (5dd457a)
- Document the public payment-link read (18b3d78)
- The multi-page gateway in CLAUDE.md and AGENTS.md (6ed0277)
- Regenerate the reference from the server: swap trustlines, no em dashes (6447818)
- Non-custodial, so the private key root takes no stored secret (0c773ef)

### Dependencies
- Bump the minor-and-patch group (13 updates) (7a6359a)

## [0.8.0] - 2026-10-07

### Features
- Payment rates at twice the swap rate — Starter 1%, Growth 0.2% (40527be)

## [0.7.0] - 2026-10-07

### Features
- Lower swap commissions to 0.5% → 0.03% by plan, and re-bake existing keys (df39a7c)

## [0.6.4] - 2026-10-07

### Bug Fixes
- With null in the CORS list, send every origin as an exact regex (997814d)

## [0.6.3] - 2026-10-07

### Bug Fixes
- Allow the MetaMask Snap's null origin without breaking the route sync (b4d06db)

## [0.6.2] - 2026-10-07

### Bug Fixes
- Allow X-Wallet-Session and X-Trace-Id in the gateway's CORS (6e4976d)

## [0.6.1] - 2026-10-07

### Features
- Add new endpoint for retrieving recovery shares and enhance error descriptions (e93b704)
- Add 503 response for upstream unavailability and include x-cosmos-upstream header (fd943f7)

### Bug Fixes
- Send a gateway-secret MAC as the X-Cosmos-Internal marker (97cfbec)
- Patch sharp and other runtime advisories in portal and docs (e98d9f4)

### Refactor
- Update AGENTS.md and README.md for clarity and accuracy; retire wallet provisioning references in schema.prisma (68ccbf5)

### Dependencies
- Update brace-expansion to version 1.1.21 and fast-uri to version 3.1.8 (4d3a419)

## [0.6.0] - 2026-10-04

### Features
- Add upstreamBaseUrls function for handling multiple base URLs (8780cdb)
- Add email recovery endpoint for alias management (e311da9)
- Add CrossChainSwapsView component and related API endpoints (a0e3fd4)
- Add support for cross-chain and chain swaps in admin views and API (f0d2056)
- Add recovery share endpoints for managing backup keys (06d26f7)
- Add network parameter to recovery endpoints for ledger specification (8c9cf55)

### Bug Fixes
- Update component references for backward compatibility in API documentation (ea0a8d1)

### Miscellaneous
- Regenerate API reference pages with fumadocs-openapi 12.3 (5c5f71f)

### Dependencies
- Apply Dependabot minor-and-patch bumps for portal and docs (6f55ce3)

## [0.5.0] - 2026-09-27

### Features
- Implement OAuth authentication flow for wallet sign-in (0acb506)
- Implement SEP-10 Stellar Web Authentication and SEP-30 account recovery (7d89383)
- Add AGENTS.md for API documentation and development guidelines (cb372b2)
- Implement pagination for accounts listing and add SEP-30 response handling (94886e2)
- Enhance recovery API with SEP-30 compliance and improve error handling (1c2e72f)
- Serve the two console legs the community server hands back (e31d960)
- Implement recovery code API endpoint and associated schema (670267a)
- Enhance OpenAPI spec with security definitions and public routes (409455e)
- Add AliasManager and AssetManager documentation; update Client and PaymentIntentManager with new methods (284b005)
- Update wallet auth API descriptions to clarify session token usage and email verification process (f8b1e3b)
- Update description for sealed box to clarify password and passkey usage (408a7ad)
- Enhance wallet auth API descriptions to include return URL handling and new error responses (013c4c5)

### Bug Fixes
- Await the llms.txt index (fumadocs-core 16.15.13) (b100770)

### Miscellaneous
- Bump the minor-and-patch group across 1 directory with 8 updates (d988ec9)
- Bump the minor-and-patch group across 1 directory with 5 updates (7f04b35)
- Sync ./package-lock with dev (6a1bc6c)
- Sync docs/package-lock with dev (8207db0)

### Refactor
- Update Zod imports to use extended version from openapi library (25b156b)
- Move the console legs under api/wallet/ (bec268d)
- Retire the Pollar social login (305ee5c)

### Dependencies
- Update dependencies to latest (5b0f01d)

## [0.4.1] - 2026-09-19

### Documentation
- Skill de Cosmos Pay para agentes (skills.stellar.org) (4181499)

## [0.4.0] - 2026-09-19

### Features
- Tokens, tipografia y logo de la marca nueva (c169eb2)
- Landing con los paneles, los titulares y los motivos del deck (9c2d0a7)
- La wallet primero, y la barra y el idioma que no se veian (b400ba4)

### Bug Fixes
- Correcciones de la ronda 1 de revision sobre el landing (4b28d9f)
- La promo cruzada entra en el sistema y el landing en ES pasa a voseo (c3cad78)

### Miscellaneous
- Arreglos de la ronda 2 de revision en el landing (d8ad0f7)
- Barrido de los restos de la marca vieja fuera del landing (f25390e)

## [0.3.0] - 2026-09-16

### Features
- Implement social login email verification process (e04de5a)
- Add expected_version to receiver approval process and update related schemas (cf202fb)
- Add dossierVersion and reviewedVersion properties to Receiver documentation (5aeb5a0)

## [0.2.2] - 2026-09-13

### Miscellaneous
- Bump the minor-and-patch group in /docs with 12 updates (6b197e3)
- Bump @asteasolutions/zod-to-openapi from 8.5.0 to 9.1.0 (9ea9adc)

### Refactor
- Remove deprecated admin API secrets and update proxy handling for Payments API (6e08f2c)
- Remove deprecated Payments API admin secrets from environment example (46044a0)
- Migrate search client from Orama to ZBSearch and update related functions (cf72b25)

## [0.2.1] - 2026-09-10

### Bug Fixes
- Update environment variables and improve admin proxy handling for Payments API (f232cfe)

## [0.2.0] - 2026-09-10

### Features
- Add LiquidityOperation, OfframpManager, OnrampManager, PollarManager, and Receiver documentation (babbcb2)

### Bug Fixes
- Request the openid/profile/email scopes from Authentik explicitly (e36d840)

## [0.1.5] - 2026-09-10

### Bug Fixes
- Boot the built server in CI, and install deploys from the lockfile (2607cfa)

## [0.1.4] - 2026-09-10

### Features
- Implement social login via Google/GitHub (5793d18)
- Enhance Pollar OAuth session description and add network wallet schema (2e337ff)
- Add client activity tracking and reporting endpoints (e77e213)
- Implement public asset catalog and shared API key retrieval (0c9fe26)

### Bug Fixes
- Use XLM in the first payment example (#27) (14a4a80)
- Clear every dependency advisory and unblock the better-auth 1.7 build (cb17ee2)

## [0.1.3] - 2026-07-11

### CI/CD
- Track dev as the working branch instead of fumadocs (5284276)

## [0.1.2] - 2026-07-11

### Miscellaneous
- Bump the minor-and-patch group in /docs with 10 updates (3deafd9)

## [0.1.1] - 2026-07-11

### Miscellaneous
- Bump @types/node from 25.9.4 to 26.1.1 in /docs (65b3f86)

## [0.1.0] - 2026-07-11

### Features
- Migrate to Prisma 7 (driver adapters) (3194a69)

## [0.0.2] - 2026-07-11

### CI/CD
- Add CI, Dependabot, versioning and git-cliff changelog automation (3643b2e)
- Provide build-time PUBLIC_BETTER_AUTH_URL so the CI build passes (750d606)

### Dependencies
- Update dependencies to latest (Astro 7, adapters, dotenv 17) (9fe0e88)


