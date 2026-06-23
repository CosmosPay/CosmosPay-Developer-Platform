import { z } from "zod";
import { auth } from "@/lib/auth";
import { jsonError, jsonForbidden, jsonNotFound, jsonSuccess, jsonUnauthorized, parseJson } from "@/lib/http";
import { canManageOrg, getMembership, removeMember, updateMember } from "@/lib/organizations";
import { sanitizePermissions } from "@/lib/org-permissions";
import type { APIRoute } from "astro";

const paramsSchema = z.object({ id: z.string().min(1), userId: z.string().min(1) });

const patchBodySchema = z.object({
  role: z.enum(["admin", "member"]).optional(),
  permissions: z.array(z.string()).optional(),
});

/* PATCH /api/organizations/:id/members/:userId — update a member's role + per-action
   permissions (owner/admin only; the owner can't be changed). */
export const PATCH: APIRoute = async (ctx) => {
  const session = await auth.api.getSession({ headers: ctx.request.headers });
  if (!session) return jsonUnauthorized("Session required");

  const params = paramsSchema.safeParse(ctx.params);
  if (!params.success) return jsonNotFound("Member not found");
  const { id, userId } = params.data;

  const membership = await getMembership(id, session.user.id).catch(() => null);
  if (!membership) return jsonNotFound("Organization not found");
  if (!canManageOrg(membership.role as never)) return jsonForbidden("You can't manage this organization");

  const target = await getMembership(id, userId).catch(() => null);
  if (!target) return jsonNotFound("Member not found");
  if (target.role === "owner") return jsonForbidden("The organization owner can't be changed");

  const body = await parseJson(ctx.request, patchBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: "bad_request" });
  }

  const data: { role?: "admin" | "member"; permissions?: string[] } = {};
  if (body.data.role !== undefined) data.role = body.data.role;
  if (body.data.permissions !== undefined) data.permissions = sanitizePermissions(body.data.permissions);

  const updated = await updateMember(id, userId, data).catch(() => null);
  if (!updated) return jsonError({ message: "Failed to update member", code: 500, status: "internal_error" });
  return jsonSuccess({ data: { userId, role: updated.role, permissions: updated.permissions }, message: "Member updated" });
};

/* DELETE /api/organizations/:id/members/:userId — remove a member (owner/admin; never the owner). */
export const DELETE: APIRoute = async (ctx) => {
  const session = await auth.api.getSession({ headers: ctx.request.headers });
  if (!session) return jsonUnauthorized("Session required");

  const params = paramsSchema.safeParse(ctx.params);
  if (!params.success) return jsonNotFound("Member not found");
  const { id, userId } = params.data;

  const membership = await getMembership(id, session.user.id).catch(() => null);
  if (!membership) return jsonNotFound("Organization not found");
  if (!canManageOrg(membership.role as never)) return jsonForbidden("You can't manage this organization");

  const target = await getMembership(id, userId).catch(() => null);
  if (!target) return jsonNotFound("Member not found");
  if (target.role === "owner") return jsonForbidden("The organization owner can't be removed");

  const removed = await removeMember(id, userId).catch(() => null);
  if (!removed) return jsonError({ message: "Failed to remove member", code: 500, status: "internal_error" });
  return jsonSuccess({ data: null, message: "Member removed" });
};
