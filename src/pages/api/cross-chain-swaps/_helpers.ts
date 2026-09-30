/* Shared plumbing for the cross-chain swap proxy routes (underscore file — not a
   route). Same shape as the swaps and liquidity routes: session → org membership →
   forward to the Payments API, mapping CosmosApiError to a clean envelope. */
import { auth } from "@/lib/auth";
import { ApiStatus, jsonError, jsonForbidden, jsonUnauthorized } from "@/lib/http";
import { getMembership } from "@/lib/organizations";
import { CosmosApiError, type CosmosEnv } from "@/lib/cosmos";

export function envFromQuery(url: URL): CosmosEnv {
  return url.searchParams.get("env") === "prod" ? "prod" : "dev";
}

/* A 404 stays a 404 (a swap that is not this org's); anything else upstream refused is
   the caller's to fix and comes back as a 400 carrying the Payments API's message —
   including "network_unsupported" for a dev key, since NEAR Intents is mainnet only. */
export function cosmosErrorResponse(err: unknown): Response {
  if (err instanceof CosmosApiError) {
    const notFound = err.status === 404;
    return jsonError({
      message: err.message,
      code: err.status,
      status: notFound ? ApiStatus.NOT_FOUND : ApiStatus.BAD_REQUEST,
    });
  }
  return jsonError({ message: "Cross-chain swap request failed", code: 500, status: ApiStatus.INTERNAL_ERROR });
}

/* Resolves the session + verifies membership of `org`. */
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
