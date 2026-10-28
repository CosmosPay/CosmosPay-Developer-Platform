/* An organization's plan standing, which is its owner's subscription: active, paused, payment
   overdue or suspended. Billing is not wired to a provider yet, so staff set it in the admin
   users view (a provider's webhooks will set it later). The overview's account card shows it in
   green while active, yellow when paused or a payment is overdue, red when suspended (product
   owner). Pure, tested in tests/unit/planStatus.test.ts. */

export const PLAN_STATUSES = ["active", "paused", "past_due", "suspended"] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];
export const DEFAULT_PLAN_STATUS: PlanStatus = "active";

export const isPlanStatus = (v: unknown): v is PlanStatus =>
  typeof v === "string" && (PLAN_STATUSES as readonly string[]).includes(v);

/** A stored value read back: anything unknown is the default, never trusted as is. */
export const planStatusOf = (v: unknown): PlanStatus => (isPlanStatus(v) ? v : DEFAULT_PLAN_STATUS);

/** Green, yellow or red. */
export type PlanTone = "ok" | "warn" | "bad";
export const planStatusTone = (s: PlanStatus): PlanTone => (s === "active" ? "ok" : s === "suspended" ? "bad" : "warn");
