/* plan-change.ts: which plan an account may put ITSELF on. Pure (no astro:env, no database),
   so the rule is unit-tested; `features.ts` feeds it the flags and the plan route applies it.

   Nothing collects a plan's fee yet: there is no billing provider, so a plan with a monthly or
   custom fee picked from the dashboard was that plan's rates and limits for free (Enterprise's
   0.07% swap commission instead of Starter's 0.65%). Such a plan comes from billing or from an
   operator (`PATCH /api/admin/users/{id}`), never from the account itself. A plan with no fixed
   fee (Starter) stays self-service, so an account can always move down to it. Managers (the
   platform's owner and admins) are operators and may set any enabled plan, their own included. */
import { isOfferedPlan, PLAN_SPECS, type PlanId } from "@/lib/plans";

const MANAGER_ROLES = ["owner", "admin"];

/** The platform roles that manage accounts (and their plans). */
export function isManagerRole(role: string | null | undefined): boolean {
  return MANAGER_ROLES.includes(role ?? "user");
}

/** A plan an account may pick for itself: offered today and with no fixed fee to bill. */
export function isSelfServicePlan(plan: unknown): plan is PlanId {
  return isOfferedPlan(plan) && !PLAN_SPECS[plan].billed;
}

/** The enabled plans this role may put its own account on. */
export function selfServicePlanIds(enabledPlans: readonly string[], role: string | null | undefined): PlanId[] {
  const enabled = enabledPlans.filter(isOfferedPlan);
  return isManagerRole(role) ? enabled : enabled.filter(isSelfServicePlan);
}

export interface PlanChangeFlags {
  plansEnabled: boolean;
  allowUserPlanChanges: boolean;
  enabledPlans: readonly string[];
}

/** May this role change its own plan at all? */
export function canChangeOwnPlanWith(flags: PlanChangeFlags, role: string | null | undefined): boolean {
  if (!flags.plansEnabled) return false;
  return flags.allowUserPlanChanges || isManagerRole(role);
}

/* Why `PATCH /api/account/plan` refuses `plan` for this role, or null when it may proceed:
   `disabled` when this account may not change its plan at all, `billed` when the plan has a fee
   only billing or an operator can put it on, `unavailable` when the plan is not enabled. */
export function ownPlanChangeRefusal(
  flags: PlanChangeFlags,
  role: string | null | undefined,
  plan: string,
): "disabled" | "billed" | "unavailable" | null {
  if (!canChangeOwnPlanWith(flags, role)) return "disabled";
  if (selfServicePlanIds(flags.enabledPlans, role).includes(plan as PlanId)) return null;
  return isOfferedPlan(plan) && flags.enabledPlans.includes(plan) ? "billed" : "unavailable";
}
