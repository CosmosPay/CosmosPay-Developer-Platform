import { z } from "zod";
import { auth } from "@/lib/auth";
import { jsonError, jsonForbidden, jsonNotFound, jsonSuccess, jsonUnauthorized } from "@/lib/http";
import { canManageOrg, getMembership } from "@/lib/organizations";
import { revokeInvitation } from "@/lib/invitations";
import type { APIRoute } from "astro";

const paramsSchema = z.object({ id: z.string().min(1), invId: z.string().min(1) });

/* DELETE /api/organizations/:id/invitations/:invId — revoke a pending invitation (owner/admin). */
export const DELETE: APIRoute = async (ctx) => {
  const session = await auth.api.getSession({ headers: ctx.request.headers });
  if (!session) return jsonUnauthorized("Session required");

  const params = paramsSchema.safeParse(ctx.params);
  if (!params.success) return jsonNotFound("Invitation not found");

  const membership = await getMembership(params.data.id, session.user.id).catch(() => null);
  if (!membership) return jsonNotFound("Organization not found");
  if (!canManageOrg(membership.role as never)) return jsonForbidden("You can't manage this organization");

  const removed = await revokeInvitation(params.data.id, params.data.invId).catch(() => null);
  if (removed === null) return jsonError({ message: "Failed to revoke invitation", code: 500, status: "internal_error" });
  if (!removed) return jsonNotFound("Invitation not found");
  return jsonSuccess({ data: { id: params.data.invId }, message: "Invitation revoked" });
};
