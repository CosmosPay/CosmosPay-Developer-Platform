import { z } from "zod";
import { auth } from "@/lib/auth";
import { jsonError, jsonForbidden, jsonNotFound, jsonSuccess, jsonUnauthorized, parseJson } from "@/lib/http";
import { canManageOrg, deleteOrg, getMembership, listForUser, renameOrg } from "@/lib/organizations";
import type { APIRoute } from "astro";

const paramsSchema = z.object({ id: z.string().min(1) });
const renameSchema = z.object({ name: z.string().trim().min(1).max(60) });

/* GET /api/organizations/:id — a single org the user is a member of. */
export const GET: APIRoute = async (ctx) => {
  const session = await auth.api.getSession({ headers: ctx.request.headers });
  if (!session) return jsonUnauthorized("Session required");

  const params = paramsSchema.safeParse(ctx.params);
  if (!params.success) return jsonNotFound("Organization not found");

  const membership = await getMembership(params.data.id, session.user.id).catch(() => null);
  if (!membership) return jsonNotFound("Organization not found");

  return jsonSuccess({ data: { id: params.data.id, role: membership.role }, message: "Organization loaded" });
};

/* PATCH /api/organizations/:id — rename (org owner/admin). */
export const PATCH: APIRoute = async (ctx) => {
  const session = await auth.api.getSession({ headers: ctx.request.headers });
  if (!session) return jsonUnauthorized("Session required");

  const params = paramsSchema.safeParse(ctx.params);
  if (!params.success) return jsonNotFound("Organization not found");

  const membership = await getMembership(params.data.id, session.user.id).catch(() => null);
  if (!membership) return jsonNotFound("Organization not found");
  if (!canManageOrg(membership.role as never)) return jsonForbidden("You can't manage this organization");

  const body = await parseJson(ctx.request, renameSchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: "bad_request" });
  }

  const updated = await renameOrg(params.data.id, body.data.name).catch(() => null);
  if (!updated) return jsonError({ message: "Failed to update organization", code: 500, status: "internal_error" });
  return jsonSuccess({ data: { id: updated.id, name: updated.name }, message: "Organization updated" });
};

/* DELETE /api/organizations/:id — delete (org owner only). */
export const DELETE: APIRoute = async (ctx) => {
  const session = await auth.api.getSession({ headers: ctx.request.headers });
  if (!session) return jsonUnauthorized("Session required");

  const params = paramsSchema.safeParse(ctx.params);
  if (!params.success) return jsonNotFound("Organization not found");

  const membership = await getMembership(params.data.id, session.user.id).catch(() => null);
  if (!membership) return jsonNotFound("Organization not found");
  if (membership.role !== "owner") return jsonForbidden("Only the owner can delete this organization");

  // Every user must keep at least one organization.
  const myOrgs = await listForUser(session.user.id).catch(() => []);
  if (myOrgs.length <= 1) return jsonForbidden("You must keep at least one organization");

  const deleted = await deleteOrg(params.data.id).catch(() => null);
  if (!deleted) return jsonError({ message: "Failed to delete organization", code: 500, status: "internal_error" });
  return jsonSuccess({ data: null, message: "Organization deleted" });
};
