import { z } from "zod";
import { auth } from "@/lib/auth";
import { jsonConflict, jsonCreated, jsonError, jsonForbidden, jsonNotFound, jsonSuccess, jsonUnauthorized, parseJson } from "@/lib/http";
import { canManageOrg, getMembership } from "@/lib/organizations";
import { createInvitation, listPendingInvitations } from "@/lib/invitations";
import { prisma } from "@/lib/prisma";
import type { APIRoute } from "astro";

const paramsSchema = z.object({ id: z.string().min(1) });

/* GET /api/organizations/:id/invitations — pending invitations (owner/admin). */
export const GET: APIRoute = async (ctx) => {
  const session = await auth.api.getSession({ headers: ctx.request.headers });
  if (!session) return jsonUnauthorized("Session required");

  const params = paramsSchema.safeParse(ctx.params);
  if (!params.success) return jsonNotFound("Organization not found");

  const membership = await getMembership(params.data.id, session.user.id).catch(() => null);
  if (!membership) return jsonNotFound("Organization not found");
  if (!canManageOrg(membership.role as never)) return jsonForbidden("You can't manage this organization");

  const invitations = await listPendingInvitations(params.data.id).catch(() => null);
  if (!invitations) return jsonError({ message: "Failed to load invitations", code: 500, status: "internal_error" });
  return jsonSuccess({ data: invitations, message: "Invitations loaded" });
};

const inviteBodySchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(["admin", "member"]).default("member"),
  permissions: z.array(z.string()).optional().default([]),
});

/* POST /api/organizations/:id/invitations — invite someone by email (owner/admin).
   Creates a 3-day magic-link token and emails it; no member is added until they accept. */
export const POST: APIRoute = async (ctx) => {
  const session = await auth.api.getSession({ headers: ctx.request.headers });
  if (!session) return jsonUnauthorized("Session required");

  const params = paramsSchema.safeParse(ctx.params);
  if (!params.success) return jsonNotFound("Organization not found");

  const membership = await getMembership(params.data.id, session.user.id).catch(() => null);
  if (!membership) return jsonNotFound("Organization not found");
  if (!canManageOrg(membership.role as never)) return jsonForbidden("You can't manage this organization");

  const body = await parseJson(ctx.request, inviteBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: "bad_request" });
  }

  const org = await prisma.organization.findUnique({ where: { id: params.data.id }, select: { name: true } }).catch(() => null);
  if (!org) return jsonNotFound("Organization not found");

  const inviterName = session.user.name || session.user.email || "A teammate";
  const result = await createInvitation(params.data.id, body.data.email, body.data.role, body.data.permissions, session.user.id, inviterName, org.name).catch(() => null);
  if (!result) return jsonError({ message: "Failed to create invitation", code: 500, status: "internal_error" });

  if (!result.ok) {
    if (result.reason === "exists") return jsonConflict("That person is already a member");
    if (result.reason === "pending") return jsonConflict("An invitation is already pending for that email");
    if (result.reason === "seat_limit") return jsonConflict("This organization has reached its plan's seat limit");
    if (result.reason === "mail_not_configured") return jsonError({ message: "Email isn't configured on the server", code: 503, status: "unavailable" });
    return jsonError({ message: "Couldn't send the invitation email", code: 502, status: "bad_gateway" });
  }
  return jsonCreated({ data: result.invitation, message: "Invitation sent" });
};
