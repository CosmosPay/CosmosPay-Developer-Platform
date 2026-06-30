import { auth } from "@/lib/auth";
import {
  ApiStatus,
  jsonError,
  jsonForbidden,
  jsonNotFound,
  jsonSuccess,
  jsonUnauthorized,
  parseJson,
} from "@/lib/http";
import { getMembership } from "@/lib/organizations";
import { hasOrgPermission } from "@/lib/org-permissions";
import { cosmosSwaps, CosmosApiError, type CosmosEnv } from "@/lib/cosmos";
import { submitSwapBodySchema } from "@/schemas/swaps";
import type { APIRoute } from "astro";

function envFromQuery(url: URL): CosmosEnv {
  return url.searchParams.get("env") === "prod" ? "prod" : "dev";
}

function cosmosErrorResponse(err: unknown): Response {
  if (err instanceof CosmosApiError) {
    return jsonError({ message: err.message, code: err.status, status: ApiStatus.BAD_REQUEST });
  }
  return jsonError({ message: "Swap request failed", code: 500, status: ApiStatus.INTERNAL_ERROR });
}

/* Relay a signed swap transaction to the network. The Payments API verifies the
   signed envelope's hash against the swap it built before broadcasting. */
export const POST: APIRoute = async (ctx) => {
  const session = await auth.api.getSession({ headers: ctx.request.headers });
  if (!session) return jsonUnauthorized("Session required");

  const id = ctx.params.id;
  if (!id) return jsonNotFound("Swap not found");

  const body = await parseJson(ctx.request, submitSwapBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: ApiStatus.BAD_REQUEST });
  }

  const org = ctx.url.searchParams.get("org");
  if (!org) return jsonError({ message: "An organization is required", code: 400, status: ApiStatus.BAD_REQUEST });
  const membership = await getMembership(org, session.user.id).catch(() => null);
  if (!membership) return jsonForbidden("You are not a member of this organization.");
  if (!hasOrgPermission(membership.role, membership.permissions, "payments:create")) {
    return jsonForbidden("You don't have permission to submit swaps in this organization.");
  }

  try {
    const outcome = await cosmosSwaps.submit(session.user.id, envFromQuery(ctx.url), org, id, body.data.signedXdr);
    return jsonSuccess({ data: outcome, message: "Swap submitted" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};
