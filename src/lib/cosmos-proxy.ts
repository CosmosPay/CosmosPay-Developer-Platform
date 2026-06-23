/* Shared helpers for the dashboard → Cosmos API proxy routes.
   Session check, env resolution, platform-permission enforcement, and upstream
   error mapping live here so each route stays a thin pass-through. */
import { auth } from "@/lib/auth";
import { ApiStatus, jsonError, jsonForbidden, jsonNotFound, jsonUnauthorized } from "@/lib/http";
import { getMembership } from "@/lib/organizations";
import { hasOrgPermission } from "@/lib/org-permissions";
import { CosmosApiError, type CosmosEnv } from "@/lib/cosmos";

/** Resolve the signed-in user id, or a 401 Response. */
export async function getUserId(request: Request): Promise<{ userId: string } | { response: Response }> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return { response: jsonUnauthorized("Session required") };
  return { userId: session.user.id };
}

/** ?env=prod → 'prod', otherwise 'dev' (testnet). */
export function envFromQuery(url: URL): CosmosEnv {
  return url.searchParams.get("env") === "prod" ? "prod" : "dev";
}

/**
 * Enforce the platform's own org-permission for a mutating action when an `org`
 * is supplied (the dashboard tags mutations with the active workspace). Returns a
 * 403 Response to block, or null to allow. Reads use no permission.
 */
export async function enforceOrgPermission(url: URL, userId: string, permission: string): Promise<Response | null> {
  const org = url.searchParams.get("org");
  if (!org) return null;
  const membership = await getMembership(org, userId).catch(() => null);
  if (!membership) return jsonForbidden("You are not a member of this organization.");
  if (!hasOrgPermission(membership.role, membership.permissions, permission)) {
    return jsonForbidden("You don't have permission to perform this action in this organization.");
  }
  return null;
}

/** Map an upstream CosmosApiError to a matching JSON error response. */
export function cosmosErrorResponse(err: unknown): Response {
  if (err instanceof CosmosApiError) {
    if (err.status === 404) return jsonNotFound(err.message || "Not found");
    return jsonError({ message: err.message, code: err.status, status: ApiStatus.BAD_REQUEST });
  }
  return jsonError({ message: "Payments request failed", code: 500, status: ApiStatus.INTERNAL_ERROR });
}
