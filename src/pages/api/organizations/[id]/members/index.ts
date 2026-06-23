import { z } from "zod";
import { auth } from "@/lib/auth";
import { jsonError, jsonNotFound, jsonSuccess, jsonUnauthorized } from "@/lib/http";
import { getMembership, listMembers } from "@/lib/organizations";
import type { APIRoute } from "astro";

const paramsSchema = z.object({ id: z.string().min(1) });

/* GET /api/organizations/:id/members — list members (any member).
   Members are no longer added directly: invite by email instead
   (see /api/organizations/:id/invitations). */
export const GET: APIRoute = async (ctx) => {
  const session = await auth.api.getSession({ headers: ctx.request.headers });
  if (!session) return jsonUnauthorized("Session required");

  const params = paramsSchema.safeParse(ctx.params);
  if (!params.success) return jsonNotFound("Organization not found");

  const membership = await getMembership(params.data.id, session.user.id).catch(() => null);
  if (!membership) return jsonNotFound("Organization not found");

  const members = await listMembers(params.data.id).catch(() => null);
  if (!members) return jsonError({ message: "Failed to load members", code: 500, status: "internal_error" });
  return jsonSuccess({ data: members, message: "Members loaded" });
};
