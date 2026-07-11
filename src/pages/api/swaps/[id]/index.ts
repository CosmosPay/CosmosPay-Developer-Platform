import { auth } from "@/lib/auth";
import {
  ApiStatus,
  jsonError,
  jsonForbidden,
  jsonNotFound,
  jsonSuccess,
  jsonUnauthorized,
} from "@/lib/http";
import { getMembership } from "@/lib/organizations";
import { cosmosSwaps, CosmosApiError, type CosmosEnv } from "@/lib/cosmos";
import type { APIRoute } from "astro";

function envFromQuery(url: URL): CosmosEnv {
  return url.searchParams.get("env") === "prod" ? "prod" : "dev";
}

function cosmosErrorResponse(err: unknown): Response {
  if (err instanceof CosmosApiError) {
    const code = err.status === 404 ? 404 : err.status;
    const status = err.status === 404 ? ApiStatus.NOT_FOUND : ApiStatus.BAD_REQUEST;
    return jsonError({ message: err.message, code, status });
  }
  return jsonError({ message: "Swap request failed", code: 500, status: ApiStatus.INTERNAL_ERROR });
}

/* Get a single swap by id (scoped to an organization the caller belongs to). */
export const GET: APIRoute = async (ctx) => {
  const session = await auth.api.getSession({ headers: ctx.request.headers });
  if (!session) return jsonUnauthorized("Session required");

  const id = ctx.params.id;
  if (!id) return jsonNotFound("Swap not found");

  const org = ctx.url.searchParams.get("org");
  if (!org) return jsonError({ message: "An organization is required", code: 400, status: ApiStatus.BAD_REQUEST });
  const membership = await getMembership(org, session.user.id).catch(() => null);
  if (!membership) return jsonForbidden("You are not a member of this organization.");

  try {
    const swap = await cosmosSwaps.get(session.user.id, envFromQuery(ctx.url), org, id);
    return jsonSuccess({ data: swap, message: "Swap fetched successfully" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};
