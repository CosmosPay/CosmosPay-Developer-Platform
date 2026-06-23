/* data.js — static id lists, recommendation maps, and non-translatable plan spec values. */
export const INDUSTRY_IDS = ["saas", "market", "ecom", "fintech", "platform", "ai"];
export const GOAL_IDS = ["accept", "payout", "subs", "cross", "embed", "test"];
export const VOLUME_IDS = ["explore", "lt10", "mid", "gt100"];
export const PLAN_IDS = ["community", "starter", "growth"];
export const STEP_IDS = ["org", "goals", "plan", "review"];
export const VOL_REC = { explore: "community", lt10: "starter", mid: "growth", gt100: "growth" };
export const SUPPORT_FOR = { community: "community", starter: "standard", growth: "priority" };
export const POPULAR = "growth";

/* Org count, mainnet support and settlement come from the shared plan specs
   (@/lib/plans) so they stay in sync with the dashboard; the price formatting stays
   presentational here (the headline amount pairs with the translated `sub` label). */
import { PLAN_SPECS } from "@/lib/plans";
const orgsLabel = (n: number | null) => (n == null ? "∞" : String(n));
export const PLAN_DATA = {
  community: { amt: "Free", price: "Free", per: "", perTx: PLAN_SPECS.community.perTx, settle: PLAN_SPECS.community.settle, orgs: orgsLabel(PLAN_SPECS.community.maxOrgs), live: PLAN_SPECS.community.mainnet },
  starter: { amt: "1.5%", price: "$0", per: "/mo", perTx: PLAN_SPECS.starter.perTx, settle: PLAN_SPECS.starter.settle, orgs: orgsLabel(PLAN_SPECS.starter.maxOrgs), live: PLAN_SPECS.starter.mainnet },
  growth: { amt: "$99", price: "$99", per: "/mo", perTx: PLAN_SPECS.growth.perTx, settle: PLAN_SPECS.growth.settle, orgs: orgsLabel(PLAN_SPECS.growth.maxOrgs), live: PLAN_SPECS.growth.mainnet },
};
