/* features.ts — env-driven feature flags for plans & onboarding.
   Server-only (reads astro:env/server). The .astro pages compute a plain object
   from planFeatures() and pass it to the client islands as props, so toggling a
   flag in .env takes effect on the next request (no rebuild needed for the UI). */
import {
  ONBOARDING_ENABLED,
  PLANS_ENABLED,
  ALLOW_USER_PLAN_CHANGES,
  ENABLED_PLANS,
} from "astro:env/server";
import { PLAN_IDS } from "@/lib/plans";

const MANAGER_ROLES = ["owner", "admin"];

export function isManagerRole(role: string | null | undefined): boolean {
  return MANAGER_ROLES.includes(role ?? "user");
}

/** Plan ids offered for self-selection. Empty/invalid env → all plans. */
export function enabledPlanIds(): string[] {
  const raw = (ENABLED_PLANS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const valid = raw.filter((p) => (PLAN_IDS as readonly string[]).includes(p));
  return valid.length ? valid : [...PLAN_IDS];
}

/** The default plan a new account / disabled-plan account lands on. */
export function defaultPlanId(): string {
  return enabledPlanIds()[0] ?? "community";
}

/** May an account with this role change its own (self-service) plan? */
export function canChangeOwnPlan(role: string | null | undefined): boolean {
  if (!PLANS_ENABLED) return false;
  return ALLOW_USER_PLAN_CHANGES || isManagerRole(role);
}

/** Serializable flag bundle handed to client islands (Dashboard / Onboarding). */
export function planFeatures(role?: string | null) {
  return {
    onboardingEnabled: ONBOARDING_ENABLED,
    plansEnabled: PLANS_ENABLED,
    allowUserPlanChanges: ALLOW_USER_PLAN_CHANGES,
    enabledPlans: enabledPlanIds(),
    defaultPlan: defaultPlanId(),
    // Convenience: can the current account change its own plan?
    canChangePlan: canChangeOwnPlan(role),
  };
}

export { ONBOARDING_ENABLED, PLANS_ENABLED };
