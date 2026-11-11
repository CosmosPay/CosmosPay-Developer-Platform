import { z } from "zod";
import { requestSession } from "@/lib/request-session";
import { jsonError, jsonForbidden, jsonSuccess, jsonUnauthorized, parseJson } from "@/lib/http";
import { setOwnPlan, getRole } from "@/lib/profile";
import { PLAN_IDS } from "@/lib/plans";
import { ownPlanRefusal } from "@/lib/features";
import type { APIRoute } from "astro";

// Offered plans only: a legacy plan (the old free one) can't be picked again.
const planBodySchema = z.object({ plan: z.enum(PLAN_IDS as [string, ...string[]]) });

const REFUSALS = {
  disabled: "Plan changes are not available for your account.",
  // Nothing bills a plan's fee yet: such a plan comes from billing or an operator
  // (PATCH /api/admin/users/{id}), never from the account itself (src/lib/plan-change.ts).
  billed: "That plan has a fee, so our team sets it up. Write to us from Support.",
  unavailable: "That plan is not available.",
} as const;

/* PATCH /api/account/plan: change the signed-in account's own (mock) billing plan. */
export const PATCH: APIRoute = async (ctx) => {
  const session = await requestSession(ctx.request.headers);
  if (!session) return jsonUnauthorized("Session required");

  const body = await parseJson(ctx.request, planBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: "bad_request" });
  }

  // Gated by env flags + account role: regular users are blocked when
  // ALLOW_USER_PLAN_CHANGES=false (only owner/admin can), and may only move to an enabled
  // plan with no fee to bill (Starter); owner/admin may set any enabled plan.
  const role = await getRole(session.user.id).catch(() => "user");
  const refusal = ownPlanRefusal(role, body.data.plan);
  if (refusal) return jsonForbidden(REFUSALS[refusal]);

  const updated = await setOwnPlan(session.user.id, body.data.plan).catch(() => null);
  if (!updated) {
    return jsonError({ message: "Failed to update plan", code: 500, status: "internal_error" });
  }
  return jsonSuccess({ data: { plan: updated.plan }, message: "Plan updated" });
};
