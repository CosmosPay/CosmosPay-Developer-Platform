/* Shared plumbing for the liquidity pool proxy routes (underscore file — not a
   route). Mirrors the swaps routes: session → org membership → forward to the
   Payments API, mapping CosmosApiError to a clean envelope. */
import { auth } from "@/lib/auth";
import { ApiStatus, jsonError, jsonForbidden, jsonUnauthorized } from "@/lib/http";
import { getMembership } from "@/lib/organizations";
import { CosmosApiError, type CosmosEnv } from "@/lib/cosmos";

export function envFromQuery(url: URL): CosmosEnv {
  return url.searchParams.get("env") === "prod" ? "prod" : "dev";
}

export function cosmosErrorResponse(err: unknown): Response {
  if (err instanceof CosmosApiError) {
    return jsonError({ message: err.message, code: err.status, status: ApiStatus.BAD_REQUEST });
  }
  return jsonError({ message: "Liquidity request failed", code: 500, status: ApiStatus.INTERNAL_ERROR });
}

/* Resolves the session + verifies membership of `org`. Returns either the
   context needed by every route or a ready-to-return error Response. */
export async function requireOrgMember(
  request: Request,
  org: string | null,
): Promise<{ ok: true; userId: string; org: string; membership: { role: string; permissions: string[] } } | { ok: false; response: Response }> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return { ok: false, response: jsonUnauthorized("Session required") };
  if (!org) {
    return { ok: false, response: jsonError({ message: "An organization is required", code: 400, status: ApiStatus.BAD_REQUEST }) };
  }
  const membership = await getMembership(org, session.user.id).catch(() => null);
  if (!membership) return { ok: false, response: jsonForbidden("You are not a member of this organization.") };
  return { ok: true, userId: session.user.id, org, membership };
}
