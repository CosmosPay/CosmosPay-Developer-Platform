# Changelog

All notable changes to the Cosmos Pay Developer Platform are documented here.
Generated from [Conventional Commits](https://www.conventionalcommits.org) by [git-cliff](https://git-cliff.org).
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


