import { PLAN_SPECS, type PlanId } from "@/lib/plans";

/** A plan's monthly price in dollars, read from its tag in plans.ts ("$33/mo" is 33). */
export function monthlyUsd(id: PlanId): number {
  const amount = /^\$(\d+(?:\.\d+)?)\/mo$/.exec(PLAN_SPECS[id].price)?.[1];
  if (!amount) throw new Error(`plans.ts gives ${id} no monthly price: ${PLAN_SPECS[id].price}`);
  return Number(amount);
}

/* Non-textual plan metadata (numbers + feature on/off flags), aligned by index to
   the catalog `pricing.plans` array and to PLAN_IDS (@/lib/plans): Starter, Essentials,
   Growth. Enterprise has its own card. Text comes from the active locale. Every feature listed
   is one the product has (plans.ts and the dashboard); an "off" one is in a higher plan. The
   monthly prices are plans.ts's, a flat fee each; the annual ones are the yearly billing's. */
export const PLAN_META = [
  { ctaCls: "btn-ghost-pill", on: [1, 1, 1, 1, 1, 1, 0] },
  { featured: true, ctaCls: "btn-violet", mo: monthlyUsd("essentials"), ann: 27.5, on: [1, 1, 1, 1, 1] },
  { ctaCls: "btn-ghost-pill", mo: monthlyUsd("growth"), ann: 82.5, on: [1, 1, 1, 1] },
];
