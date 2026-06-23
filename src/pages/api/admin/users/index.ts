import { auth } from "@/lib/auth";
import { ApiStatus, jsonError, jsonForbidden, jsonSuccess, jsonUnauthorized } from "@/lib/http";
import { canManageUsers, getRole, listUsersWithProfile } from "@/lib/profile";
import type { APIRoute } from "astro";

/* GET /api/admin/users — list all accounts with role + plan. Owner/admin only. */
export const GET: APIRoute = async (ctx) => {
  const session = await auth.api.getSession({ headers: ctx.request.headers });
  if (!session) return jsonUnauthorized("Session required");

  const role = await getRole(session.user.id).catch(() => "user" as const);
  if (!canManageUsers(role)) return jsonForbidden("Admin access required");

  const users = await listUsersWithProfile().catch(() => null);
  if (!users) {
    return jsonError({ message: "Failed to load users", code: 500, status: "internal_error" });
  }
  return jsonSuccess({ data: users, message: "Users loaded", status: ApiStatus.SUCCESS, code: 200 });
};
