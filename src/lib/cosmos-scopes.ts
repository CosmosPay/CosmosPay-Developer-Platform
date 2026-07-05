/* API-key scopes for the Cosmos Payments API — a permission system INDEPENDENT
   from the dashboard's own org-permissions. These map 1:1 to the actions the
   community server enforces (@RequirePermissions), e.g. `payments:write`.
   Presented as a resource × action matrix in the API-key modal. */
export const COSMOS_RESOURCES = ["payments", "swaps", "liquidity", "webhooks", "products", "customers"] as const;
export const COSMOS_ACTIONS = ["read", "write"] as const;

export type CosmosResource = (typeof COSMOS_RESOURCES)[number];
export type CosmosAction = (typeof COSMOS_ACTIONS)[number];

export const cosmosScopeKey = (resource: string, action: string) => `${resource}:${action}`;

/* The full catalog (`payments:read`, `payments:write`, …). */
export const COSMOS_SCOPES: string[] = COSMOS_RESOURCES.flatMap((r) =>
  COSMOS_ACTIONS.map((a) => cosmosScopeKey(r, a)),
);
