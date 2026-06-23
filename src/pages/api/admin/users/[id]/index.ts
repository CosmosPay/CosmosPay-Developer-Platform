import { z } from "zod";
import { auth } from "@/lib/auth";
import { jsonError, jsonForbidden, jsonNotFound, jsonSuccess, jsonUnauthorized, parseJson } from "@/lib/http";
import { canManageUsers, getRole, setUserRolePlan } from "@/lib/profile";
import { roleLevel } from "@/lib/account-roles";
import { PLAN_IDS } from "@/lib/plans";
import type { APIRoute } from "astro";

const paramsSchema = z.object({ id: z.string().min(1) });
const bodySchema = z.object({
  role: z.enum(["user", "support", "admin", "owner"]).optional(),
  plan: z.enum(PLAN_IDS as [string, ...string[]]).optional(),
}).refine((b) => b.role !== undefined || b.plan !== undefined, { message: "Nothing to update" });

/* PATCH /api/admin/users/:id — set a user's role and/or plan. Owner/admin only;
   only an owner may grant or modify the "owner" role. */
export const PATCH: APIRoute = async (ctx) => {
  const session = await auth.api.getSession({ headers: ctx.request.headers });
  if (!session) return jsonUnauthorized("Session required");

  const actorRole = await getRole(session.user.id).catch(() => "user" as const);
  if (!canManageUsers(actorRole)) return jsonForbidden("Admin access required");

  const params = paramsSchema.safeParse(ctx.params);
  if (!params.success) return jsonNotFound("User not found");

  const body = await parseJson(ctx.request, bodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: "bad_request" });
  }

  // Role-change guards (plan changes are unrestricted):
  if (body.data.role !== undefined) {
    const actorLevel = roleLevel(actorRole);
    // You can't change your own role.
    if (params.data.id === session.user.id) {
      return jsonForbidden("You can't change your own role.");
    }
    // You can only assign roles strictly below your own (an admin can't make someone admin).
    if (roleLevel(body.data.role) >= actorLevel) {
      return jsonForbidden("You can only assign roles below your own.");
    }
    // You can't modify a user who is at or above your own level.
    const targetRole = await getRole(params.data.id).catch(() => "user" as const);
    if (roleLevel(targetRole) >= actorLevel) {
      return jsonForbidden("You can't change this user's role.");
    }
  }

  const updated = await setUserRolePlan(params.data.id, body.data).catch(() => null);
  if (!updated) {
    return jsonError({ message: "Failed to update user", code: 500, status: "internal_error" });
  }
  return jsonSuccess({ data: { userId: params.data.id, role: updated.role, plan: updated.plan }, message: "User updated" });
};
