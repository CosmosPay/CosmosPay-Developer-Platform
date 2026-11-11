/* features.ts: env-driven feature flags for plans & onboarding.
   Server-only (reads astro:env/server). The .astro pages compute a plain object
   from planFeatures() and pass it to the client islands as props, so toggling a
   flag in .env takes effect on the next request (no rebuild needed for the UI). */
import {
  ONBOARDING_ENABLED,
  PLANS_ENABLED,
  ALLOW_USER_PLAN_CHANGES,
  ENABLED_PLANS,
} from "astro:env/server";
import { DEFAULT_PLAN_ID, PLAN_IDS, isOfferedPlan } from "@/lib/plans";
import {
  canChangeOwnPlanWith,
  isManagerRole,
  ownPlanChangeRefusal,
  selfServicePlanIds,
  type PlanChangeFlags,
} from "@/lib/plan-change";

export { isManagerRole };

/** Plan ids offered for self-selection. Empty/invalid env → all offered plans. A plan that
 *  is no longer offered (the legacy "community") is ignored even when the env lists it. */
export function enabledPlanIds(): string[] {
  const raw = (ENABLED_PLANS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const valid = raw.filter(isOfferedPlan);
  return valid.length ? valid : [...PLAN_IDS];
}

/** The plan onboarding preselects (the first enabled one). New accounts are created on the
 *  database default (`profile.plan`, = DEFAULT_PLAN_ID) whatever this returns. */
export function defaultPlanId(): string {
  return enabledPlanIds()[0] ?? DEFAULT_PLAN_ID;
}

function planChangeFlags(): PlanChangeFlags {
  return {
    plansEnabled: PLANS_ENABLED,
    allowUserPlanChanges: ALLOW_USER_PLAN_CHANGES,
    enabledPlans: enabledPlanIds(),
  };
}

/** May an account with this role change its own (self-service) plan? */
export function canChangeOwnPlan(role: string | null | undefined): boolean {
  return canChangeOwnPlanWith(planChangeFlags(), role);
}

/** Why this role may not put its own account on `plan`, or null (src/lib/plan-change.ts). */
export function ownPlanRefusal(role: string | null | undefined, plan: string) {
  return ownPlanChangeRefusal(planChangeFlags(), role, plan);
}

/** Serializable flag bundle handed to client islands (Dashboard / Onboarding). */
export function planFeatures(role?: string | null) {
  return {
    onboardingEnabled: ONBOARDING_ENABLED,
    plansEnabled: PLANS_ENABLED,
    allowUserPlanChanges: ALLOW_USER_PLAN_CHANGES,
    enabledPlans: enabledPlanIds(),
    // The enabled plans this account may switch itself to; the others (a plan with a fee
    // billing has to collect) are set by our team, so the pickers offer them as a request.
    selfServicePlans: selfServicePlanIds(enabledPlanIds(), role),
    defaultPlan: defaultPlanId(),
    // Convenience: can the current account change its own plan?
    canChangePlan: canChangeOwnPlan(role),
  };
}

export { ONBOARDING_ENABLED, PLANS_ENABLED };
