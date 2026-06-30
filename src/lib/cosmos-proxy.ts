/* Shared helpers for the dashboard → Cosmos API proxy routes.
   Session check, env resolution, platform-permission enforcement, and upstream
   error mapping live here so each route stays a thin pass-through. */
import type { APIContext } from "astro";
import { auth } from "@/lib/auth";
import { ApiStatus, jsonCreated, jsonError, jsonForbidden, jsonNotFound, jsonSuccess, jsonUnauthorized } from "@/lib/http";
import { getMembership } from "@/lib/organizations";
import { hasOrgPermission } from "@/lib/org-permissions";
import { canManageUsers, getRole } from "@/lib/profile";
import { CosmosApiError, proxyCosmosRequest, type CosmosEnv } from "@/lib/cosmos";
import { prisma } from "@/lib/prisma";
import { keyPrefix } from "@/utils/apisix";

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

/**
 * Role-derived resend cooldown for the KYC verification (terms-of-service) email, returned as
 * the trusted header the Payments service reads for internal/dashboard calls. Owners resend
 * immediately (0 ms), admins once per minute (60 s); any other role returns undefined so the
 * Payments service applies its default (24 h). The header only takes effect alongside
 * X-Cosmos-Internal (stripped from client requests by APISIX), so it can't be forged.
 */
export function tosCooldownHeaders(role: string | undefined | null): Record<string, string> | undefined {
  const ms = role === "owner" ? 0 : role === "admin" ? 60_000 : undefined;
  return ms === undefined ? undefined : { "X-Cosmos-Tos-Cooldown-Ms": String(ms) };
}

/** Map an upstream CosmosApiError to a matching JSON error response. */
export function cosmosErrorResponse(err: unknown): Response {
  if (err instanceof CosmosApiError) {
    if (err.status === 404) return jsonNotFound(err.message || "Not found");
    return jsonError({ message: err.message, code: err.status, status: ApiStatus.BAD_REQUEST });
  }
  return jsonError({ message: "Payments request failed", code: 500, status: ApiStatus.INTERNAL_ERROR });
}

/**
 * Generic dashboard → Payments proxy for an entire BlindPay feature prefix
 * (`kyc` | `onramp` | `offramp`), used by the `[...path].ts` catch-all routes. Enforces
 * session + org membership (mutations also require `payments:create`), forwards the
 * request to `/v1/<prefix>/<rest>` via proxyCosmosRequest, and wraps the upstream JSON in
 * the dashboard envelope. The swap commission rule doesn't apply here — these are fiat
 * rails, not on-chain swaps.
 */
export async function blindpayProxy(ctx: APIContext, prefix: string): Promise<Response> {
  const authed = await getUserId(ctx.request);
  if ("response" in authed) return authed.response;

  const method = ctx.request.method.toUpperCase();
  const org = ctx.url.searchParams.get("org");
  if (org) {
    const membership = await getMembership(org, authed.userId).catch(() => null);
    if (!membership) return jsonForbidden("You are not a member of this organization.");
    if (method !== "GET" && method !== "HEAD" && !hasOrgPermission(membership.role, membership.permissions, "payments:create")) {
      return jsonForbidden("You don't have permission to perform this action in this organization.");
    }
  }

  // The catch-all param: everything after /api/<prefix>/.
  const rest = Array.isArray(ctx.params.path) ? ctx.params.path.join("/") : ctx.params.path ?? "";
  const path = rest ? `${prefix}/${rest}` : prefix;

  try {
    const { status, json } = await proxyCosmosRequest({
      userId: authed.userId,
      env: envFromQuery(ctx.url),
      path,
      method,
      searchParams: ctx.url.searchParams,
      request: ctx.request,
    });
    return status === 201
      ? jsonCreated({ data: json, message: "Created" })
      : jsonSuccess({ data: json, message: "OK" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
}

/**
 * Generic dashboard → Payments proxy for the PLATFORM-ADMIN (owner) endpoints, used by
 * the `/api/admin/[...path].ts` catch-all. Only a platform owner/admin (NOT merely an org
 * member) may reach it — verified here against the account role — and it sets the trusted
 * X-Cosmos-Admin marker so the Payments service returns global, cross-consumer data.
 */
export async function adminProxy(ctx: APIContext): Promise<Response> {
  const authed = await getUserId(ctx.request);
  if ("response" in authed) return authed.response;

  const role = await getRole(authed.userId).catch(() => "user" as const);
  if (!canManageUsers(role)) {
    return jsonForbidden("Platform admin access required.");
  }

  const rest = Array.isArray(ctx.params.path)
    ? ctx.params.path.join("/")
    : ctx.params.path ?? "";
  if (!rest) return jsonNotFound("Not found");

  try {
    const { status, json } = await proxyCosmosRequest({
      userId: authed.userId,
      env: envFromQuery(ctx.url),
      path: `admin/${rest}`,
      method: ctx.request.method,
      searchParams: ctx.url.searchParams,
      request: ctx.request,
      admin: true,
    });
    // The Payments service only knows a consumer by its APISIX username (cosmos_<userId>);
    // resolve those to real account names/emails so the admin UI never shows a bare "—".
    const enriched = await enrichAdminConsumers(json);
    return status === 201
      ? jsonCreated({ data: enriched, message: "Created" })
      : jsonSuccess({ data: enriched, message: "OK" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
}

/**
 * Resolves each consumer reference in an admin payload to its ORGANIZATION(s) + owning
 * account. A payments consumer is `cosmos_<userId>` (one per developer account), so we
 * map it back to the dev-platform User and the organizations that user owns, and expose:
 *   - `displayName`   the org name (the user's primary org), so the UI shows an org, not
 *                     a bare user — falling back to the account name/email/id if none.
 *   - `organizations` [{id,name}] every org the account owns (an account can own several;
 *                     payments data is per-account, so counts span all of them).
 *   - `accountName` / `accountEmail`  the underlying developer account, shown as context.
 * Handles the consumers list (`data[].apisixUsername`) and resource lists that include the
 * owner (`data[].consumer.apisixUsername`). Best-effort: returns the payload unchanged on
 * any failure.
 */
async function enrichAdminConsumers(json: any): Promise<any> {
  try {
    const rows: any[] = Array.isArray(json?.data) ? json.data : [];
    if (!rows.length) return json;

    const usernames = new Set<string>();
    for (const row of rows) {
      if (typeof row?.apisixUsername === "string") usernames.add(row.apisixUsername);
      if (typeof row?.consumer?.apisixUsername === "string") usernames.add(row.consumer.apisixUsername);
    }
    if (!usernames.size) return json;

    const toUserId = (u: string) => (u.startsWith(keyPrefix) ? u.slice(keyPrefix.length) : u);
    const userIds = [...usernames].map(toUserId);
    const [users, orgs] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      }),
      prisma.organization.findMany({
        where: { ownerId: { in: userIds } },
        select: { id: true, name: true, ownerId: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);
    const userById = new Map(users.map((u) => [u.id, u]));
    const orgsByOwner = new Map<string, { id: string; name: string }[]>();
    for (const o of orgs) {
      const list = orgsByOwner.get(o.ownerId) ?? [];
      list.push({ id: o.id, name: o.name });
      orgsByOwner.set(o.ownerId, list);
    }

    const info = (username: string) => {
      const uid = toUserId(username);
      const u = userById.get(uid);
      const organizations = orgsByOwner.get(uid) ?? [];
      const accountName = u?.name ?? null;
      const accountEmail = u?.email ?? null;
      // Prefer the org name so the UI shows an organization, not a raw account.
      const displayName = organizations[0]?.name || accountName || accountEmail || uid;
      return { displayName, accountName, accountEmail, organizations };
    };

    for (const row of rows) {
      if (typeof row?.apisixUsername === "string") {
        const i = info(row.apisixUsername);
        row.displayName = i.displayName;
        row.accountName = i.accountName;
        row.accountEmail = i.accountEmail;
        row.organizations = i.organizations;
      }
      if (row?.consumer && typeof row.consumer.apisixUsername === "string") {
        const i = info(row.consumer.apisixUsername);
        row.consumer.displayName = i.displayName;
        row.consumer.accountName = i.accountName;
        row.consumer.organizations = i.organizations;
      }
    }
    return json;
  } catch {
    return json;
  }
}
