/* Non-textual plan metadata (numbers + feature on/off flags), aligned by index to
   the catalog `pricing.plans` array and to PLAN_IDS (@/lib/plans): Starter, Essentials,
   Growth. Enterprise has its own card. Text comes from the active locale. Every feature listed
   is one the product has (plans.ts and the dashboard); an "off" one is in a higher plan. */
export const PLAN_META = [
  { ctaCls: "btn-ghost-pill", on: [1, 1, 1, 1, 1, 1, 0] },
  { featured: true, ctaCls: "btn-violet", mo: 33, ann: 27.5, on: [1, 1, 1, 1, 1] },
  { ctaCls: "btn-ghost-pill", mo: 99, ann: 82.5, from: true, on: [1, 1, 1, 1] },
];
