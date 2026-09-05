/* API-key scopes for the Cosmos Payments API — a permission system INDEPENDENT
   from the dashboard's own org-permissions. These map 1:1 to the actions the
   community server enforces (@RequirePermissions), e.g. `payments:write`.
   Presented as a resource × action matrix in the API-key modal. */

/* Every resource the gateway enforces today. The list was six for a long time
   while the server had grown to ten, and a resource missing here is a scope the
   dashboard cannot grant at all — the matrix IS the picker. That gap is why the
   wallet's social login could not work: `/v1/pollar/**` is scoped
   `pollar:read` / `pollar:write`, so every key minted from this dashboard (and
   every wallet-provisioned key, see wallet-provisioning.ts) was refused by the
   bridge with `insufficient_scope` before the user ever saw a consent screen.
   Keep this in step with the server's @RequirePermissions decorators. */
export const COSMOS_RESOURCES = [
  "payments",
  "swaps",
  "liquidity",
  "webhooks",
  "products",
  "customers",
  "kyc",
  "onramp",
  "offramp",
  "pollar",
] as const;
export const COSMOS_ACTIONS = ["read", "write"] as const;

export type CosmosResource = (typeof COSMOS_RESOURCES)[number];
export type CosmosAction = (typeof COSMOS_ACTIONS)[number];

export const cosmosScopeKey = (resource: string, action: string) => `${resource}:${action}`;

/* The full catalog (`payments:read`, `payments:write`, …). */
export const COSMOS_SCOPES: string[] = COSMOS_RESOURCES.flatMap((r) =>
  COSMOS_ACTIONS.map((a) => cosmosScopeKey(r, a)),
);
