/* PATCH /api/kyc/receivers/:id/access — owner/admin kill-switch for a fiat account.

   Enables or disables a receiver for onramp/offramp. Only an organization OWNER or ADMIN
   may toggle it (the per-receiver fiat on/off control). More specific than the generic
   /api/kyc/[...path] proxy, so it wins for this path. */
import { z } from "zod";
import type { APIRoute } from "astro";
import { auth } from "@/lib/auth";
import { ApiStatus, jsonError, jsonForbidden, jsonNotFound, jsonSuccess, jsonUnauthorized, parseJson } from "@/lib/http";
import { getMembership } from "@/lib/organizations";
import { isManagerRole } from "@/lib/org-permissions";
import { proxyCosmosRequest } from "@/lib/cosmos";
import { cosmosErrorResponse, envFromQuery } from "@/lib/cosmos-proxy";

const bodySchema = z.object({ disabled: z.boolean() });

export const PATCH: APIRoute = async (ctx) => {
  const session = await auth.api.getSession({ headers: ctx.request.headers });
  if (!session) return jsonUnauthorized("Session required");

  const id = ctx.params.id;
  if (!id) return jsonNotFound("Receiver not found");

  const org = ctx.url.searchParams.get("org");
  if (!org) return jsonError({ message: "An organization is required", code: 400, status: ApiStatus.BAD_REQUEST });
  const membership = await getMembership(org, session.user.id).catch(() => null);
  if (!membership) return jsonForbidden("You are not a member of this organization.");
  if (!isManagerRole(membership.role)) {
    return jsonForbidden("Only an owner or admin can enable or disable a fiat account.");
  }

  const body = await parseJson(ctx.request, bodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: ApiStatus.BAD_REQUEST });
  }

  try {
    const { json } = await proxyCosmosRequest({
      userId: session.user.id,
      env: envFromQuery(ctx.url),
      path: `kyc/receivers/${encodeURIComponent(id)}/access`,
      method: "PATCH",
      bodyJson: { disabled: body.data.disabled },
    });
    return jsonSuccess({
      data: json,
      message: body.data.disabled ? "Fiat account disabled." : "Fiat account enabled.",
    });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};
