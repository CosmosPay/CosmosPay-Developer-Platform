import { z } from "zod";
import { auth } from "@/lib/auth";
import { jsonError, jsonForbidden, jsonSuccess, jsonUnauthorized, parseJson } from "@/lib/http";
import { setOwnPlan, getRole } from "@/lib/profile";
import { PLAN_IDS } from "@/lib/plans";
import { canChangeOwnPlan, enabledPlanIds, isManagerRole } from "@/lib/features";
import type { APIRoute } from "astro";

const planBodySchema = z.object({ plan: z.enum(PLAN_IDS as [string, ...string[]]) });

/* PATCH /api/account/plan — change the signed-in account's own (mock) billing plan. */
export const PATCH: APIRoute = async (ctx) => {
  const session = await auth.api.getSession({ headers: ctx.request.headers });
  if (!session) return jsonUnauthorized("Session required");

  const body = await parseJson(ctx.request, planBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: "bad_request" });
  }

  // Gated by env flags + account role: regular users are blocked when
  // ALLOW_USER_PLAN_CHANGES=false (only owner/admin can), and non-managers can only
  // pick a plan from ENABLED_PLANS.
  const role = await getRole(session.user.id).catch(() => "user");
  if (!canChangeOwnPlan(role)) {
    return jsonForbidden("Plan changes are not available for your account.");
  }
  if (!isManagerRole(role) && !enabledPlanIds().includes(body.data.plan)) {
    return jsonForbidden("That plan is not available.");
  }

  const updated = await setOwnPlan(session.user.id, body.data.plan).catch(() => null);
  if (!updated) {
    return jsonError({ message: "Failed to update plan", code: 500, status: "internal_error" });
  }
  return jsonSuccess({ data: { plan: updated.plan }, message: "Plan updated" });
};
