/* plans.ts — THE single source of truth for plan specs (mock billing).
   Pure data (no server-only imports) so it can be used on both server and client.
   Edit PLAN_SPECS here and every surface (dashboard plan comparison, account & settings,
   onboarding spec panel, API limits) updates from it. `null` limit = unlimited / custom.
   The translated marketing copy on /pricing mirrors these numbers — keep it in sync. */
export type PlanId = "community" | "starter" | "essentials" | "growth" | "enterprise";

export const PLAN_IDS: PlanId[] = ["community", "starter", "essentials", "growth", "enterprise"];

/* Full spec for a plan: the hard limits the app enforces + the locale-independent
   display facts (price tag, per-transaction fee, settlement speed). */
export type ApiLevel = "notifications" | "partial" | "full";

export interface PlanSpec {
  id: PlanId;
  maxApiKeys: number | null;
  maxOrgs: number | null; // organizations the owner may create (null = unlimited / custom)
  maxSeats: number | null; // members allowed per organization (null = unlimited)
  mainnet: boolean; // may create production (mainnet) API keys / take live payments
  api: ApiLevel; // which API surface the plan unlocks (community = simple payment-notifications API)
  price: string; // headline price tag, e.g. "Free", "$33/mo", "Custom"
  perTx: string; // per-transaction fee
  settle: string; // settlement speed
}

export const PLAN_SPECS: Record<PlanId, PlanSpec> = {
  community:  { id: "community",  maxApiKeys: 2,    maxOrgs: 1,    maxSeats: 1,    mainnet: true, api: "notifications", price: "Free",         perTx: "—",             settle: "~5 sec" },
  starter:    { id: "starter",    maxApiKeys: 2,    maxOrgs: 1,    maxSeats: 2,    mainnet: true, api: "partial",       price: "1.5% + 0.25¢", perTx: "1.5% + 0.25¢",  settle: "~5 sec" },
  essentials: { id: "essentials", maxApiKeys: null, maxOrgs: 3,    maxSeats: 10,   mainnet: true, api: "full",          price: "$33/mo",       perTx: "0.5% + 10¢",    settle: "~5 sec" },
  growth:     { id: "growth",     maxApiKeys: null, maxOrgs: 10,   maxSeats: null, mainnet: true, api: "full",          price: "$99/mo",       perTx: "0.35% + 5¢",    settle: "~5 sec" },
  enterprise: { id: "enterprise", maxApiKeys: null, maxOrgs: null, maxSeats: null, mainnet: true, api: "full",          price: "Custom",       perTx: "Custom",        settle: "~5 sec" },
};

/* The restrictions enforced across the app, derived from the specs above. */
export interface PlanLimits {
  maxApiKeys: number | null;
  maxOrgs: number | null;
  maxSeats: number | null;
  allowLive: boolean; // may create production ("prod") API keys
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = PLAN_IDS.reduce((acc, id) => {
  const s = PLAN_SPECS[id];
  acc[id] = { maxApiKeys: s.maxApiKeys, maxOrgs: s.maxOrgs, maxSeats: s.maxSeats, allowLive: s.mainnet };
  return acc;
}, {} as Record<PlanId, PlanLimits>);

/* Headline price tag per plan (mock billing) — derived from the specs. */
export const PLAN_PRICE: Record<PlanId, string> = PLAN_IDS.reduce((acc, id) => {
  acc[id] = PLAN_SPECS[id].price;
  return acc;
}, {} as Record<PlanId, string>);

export function normalizePlan(plan: unknown): PlanId {
  return PLAN_IDS.includes(plan as PlanId) ? (plan as PlanId) : "community";
}

export function planSpec(plan: unknown): PlanSpec {
  return PLAN_SPECS[normalizePlan(plan)];
}

export function planLimits(plan: unknown): PlanLimits {
  return PLAN_LIMITS[normalizePlan(plan)];
}

/* true when adding one more would exceed the plan's limit (null = unlimited). */
export function atLimit(limit: number | null, count: number): boolean {
  return limit !== null && count >= limit;
}
