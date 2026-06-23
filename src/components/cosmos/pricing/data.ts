/* Non-textual plan metadata (numbers + feature on/off flags), aligned by index to
   the catalog `pricing.plans` array. Text comes from the active locale. */
export const PLAN_META = [
  { ctaCls: "btn-ghost-pill", tag: true, on: [1, 1, 1, 1, 0, 0, 0] },
  { ctaCls: "btn-ghost-pill", on: [1, 1, 1, 1, 1, 0, 0] },
  { featured: true, ctaCls: "btn-violet", mo: 33, ann: 27.5, on: [1, 1, 1, 1, 1, 1, 0] },
  { ctaCls: "btn-ghost-pill", mo: 99, ann: 82.5, from: true, on: [1, 1, 1, 1, 1, 1, 1] },
];
