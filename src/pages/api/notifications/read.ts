import { auth } from "@/lib/auth";
import { ApiStatus, jsonError, jsonSuccess, jsonUnauthorized } from "@/lib/http";
import { markAllNotificationsRead } from "@/lib/notifications";
import type { APIRoute } from "astro";

/* POST /api/notifications/read — mark all of the signed-in user's notifications read. */
export const POST: APIRoute = async (ctx) => {
  const session = await auth.api.getSession({ headers: ctx.request.headers });
  if (!session) return jsonUnauthorized("Session required");

  const result = await markAllNotificationsRead(session.user.id).catch(() => null);
  if (!result) {
    return jsonError({ message: "Failed to mark notifications read", code: 500, status: "internal_error" });
  }
  return jsonSuccess({ data: { updated: result.count }, message: "Notifications marked read", status: ApiStatus.SUCCESS, code: 200 });
};
