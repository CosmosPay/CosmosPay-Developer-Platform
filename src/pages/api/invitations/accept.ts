import { z } from "zod";
import { auth } from "@/lib/auth";
import { jsonConflict, jsonError, jsonNotFound, jsonSuccess, jsonUnauthorized, parseJson } from "@/lib/http";
import { acceptInvitationById } from "@/lib/invitations";
import type { APIRoute } from "astro";

const bodySchema = z.object({ id: z.string().min(1) });

/* POST /api/invitations/accept — accept a pending invitation from inside the dashboard.
   The invitation must be addressed to the signed-in user's email. */
export const POST: APIRoute = async (ctx) => {
  const session = await auth.api.getSession({ headers: ctx.request.headers });
  if (!session) return jsonUnauthorized("Session required");

  const body = await parseJson(ctx.request, bodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: "bad_request" });
  }

  const res = await acceptInvitationById(body.data.id, { id: session.user.id, email: session.user.email }).catch(() => null);
  if (!res) return jsonError({ message: "Failed to accept invitation", code: 500, status: "internal_error" });
  if (!res.ok) {
    if (res.reason === "invalid") return jsonNotFound("Invitation not found");
    if (res.reason === "seat_limit") return jsonConflict("This organization has reached its plan's seat limit");
    return jsonConflict(res.reason === "expired" ? "This invitation has expired" : res.reason === "mismatch" ? "This invitation was sent to a different email" : "This invitation has already been used");
  }
  return jsonSuccess({ data: { orgId: res.orgId, orgName: res.orgName }, message: "Invitation accepted" });
};
