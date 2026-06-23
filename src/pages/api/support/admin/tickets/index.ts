import { auth } from "@/lib/auth";
import { jsonError, jsonForbidden, jsonSuccess, jsonUnauthorized } from "@/lib/http";
import { getRole, isStaff } from "@/lib/profile";
import { listAllTickets } from "@/lib/support";
import type { APIRoute } from "astro";

/* GET /api/support/admin/tickets?status= — every ticket (optionally filtered by status).
   Staff only (owner/admin/support). */
export const GET: APIRoute = async (ctx) => {
  const session = await auth.api.getSession({ headers: ctx.request.headers });
  if (!session) return jsonUnauthorized("Session required");

  const role = await getRole(session.user.id).catch(() => "user" as const);
  if (!isStaff(role)) return jsonForbidden("Staff access required");

  const status = ctx.url.searchParams.get("status") ?? undefined;
  const tickets = await listAllTickets(status).catch(() => null);
  if (!tickets) return jsonError({ message: "Failed to load tickets", code: 500, status: "internal_error" });
  return jsonSuccess({ data: tickets, message: "Tickets loaded" });
};
