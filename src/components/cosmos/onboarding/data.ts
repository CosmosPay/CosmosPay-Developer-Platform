/* data.js: static id lists, recommendation maps, and non-translatable plan spec values. */
export const INDUSTRY_IDS = ["saas", "market", "ecom", "fintech", "platform", "ai"];
export const GOAL_IDS = ["accept", "payout", "subs", "cross", "embed", "test"];
export const VOLUME_IDS = ["explore", "lt10", "mid", "gt100"];
/* The plans the wizard has cards for (offered plans only; the rest are picked later from
   the dashboard). Each needs an entry in PLAN_DATA, SUPPORT_FOR and the catalogs'
   `onboarding.plans`. */
export const PLAN_IDS = ["starter", "growth"];
export const STEP_IDS = ["org", "goals", "plan", "review"];
export const VOL_REC = { explore: "starter", lt10: "starter", mid: "growth", gt100: "growth" };
export const SUPPORT_FOR = { starter: "standard", growth: "priority" };
export const POPULAR = "growth";

/* Org count, mainnet support and settlement come from the shared plan specs
   (@/lib/plans) so they stay in sync with the dashboard; the price formatting stays
   presentational here (the headline amount pairs with the translated `sub` label). */
import { PLAN_SPECS, swapFeePct } from "@/lib/plans";
const orgsLabel = (n: number | null) => (n == null ? "∞" : String(n));
export const PLAN_DATA = {
  starter: { amt: "1%", price: "$0", per: "/mo", perTx: PLAN_SPECS.starter.perTx, swap: swapFeePct("starter"), settle: PLAN_SPECS.starter.settle, orgs: orgsLabel(PLAN_SPECS.starter.maxOrgs), live: PLAN_SPECS.starter.mainnet },
  growth: { amt: "$99", price: "$99", per: "/mo", perTx: PLAN_SPECS.growth.perTx, swap: swapFeePct("growth"), settle: PLAN_SPECS.growth.settle, orgs: orgsLabel(PLAN_SPECS.growth.maxOrgs), live: PLAN_SPECS.growth.mainnet },
};
