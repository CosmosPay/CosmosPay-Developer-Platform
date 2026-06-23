import { z } from "zod";
import { auth } from "@/lib/auth";
import { ApiStatus, jsonCreated, jsonError, jsonForbidden, jsonSuccess, jsonUnauthorized, parseJson } from "@/lib/http";
import { createOrg, listForUser } from "@/lib/organizations";
import type { APIRoute } from "astro";

/* GET /api/organizations — the user's orgs (no auto-create; first org is made in onboarding). */
export const GET: APIRoute = async (ctx) => {
  const session = await auth.api.getSession({ headers: ctx.request.headers });
  if (!session) return jsonUnauthorized("Session required");

  const orgs = await listForUser(session.user.id).catch(() => null);
  if (!orgs) {
    return jsonError({ message: "Failed to load organizations", code: 500, status: "internal_error" });
  }
  return jsonSuccess({ data: orgs, message: "Organizations loaded", status: ApiStatus.SUCCESS, code: 200 });
};

const createBodySchema = z.object({
  name: z.string().trim().min(1).max(60),
  industry: z.string().trim().max(40).optional(),
  goals: z.array(z.string().trim().max(40)).max(12).optional(),
  volume: z.string().trim().max(40).optional(),
});

/* POST /api/organizations — create one (subject to the plan's maxOrgs limit). */
export const POST: APIRoute = async (ctx) => {
  const session = await auth.api.getSession({ headers: ctx.request.headers });
  if (!session) return jsonUnauthorized("Session required");

  const body = await parseJson(ctx.request, createBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: "bad_request" });
  }

  const { name, ...meta } = body.data;
  const metadata = (meta.industry || (meta.goals && meta.goals.length) || meta.volume) ? meta : undefined;
  const result = await createOrg(session.user.id, name, false, metadata).catch(() => null);
  if (!result) {
    return jsonError({ message: "Failed to create organization", code: 500, status: "internal_error" });
  }
  if (!result.ok) {
    return jsonForbidden("You have reached your plan's organization limit. Upgrade to create more.");
  }
  return jsonCreated({ data: result.org, message: "Organization created" });
};
