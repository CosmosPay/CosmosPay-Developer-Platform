import { auth } from "@/lib/auth";
import {
  ApiStatus,
  jsonCreated,
  jsonError,
  jsonForbidden,
  jsonSuccess,
  jsonUnauthorized,
  parseJson,
} from "@/lib/http";
import { getMembership, orgOwnerPlanLimits } from "@/lib/organizations";
import { hasOrgPermission } from "@/lib/org-permissions";
import { atLimit } from "@/lib/plans";
import {
  createApiKeyBodySchema,
  type ApiKeyData,
  type ApiKeyListData,
} from "@/schemas/api-keys";

import {
  createApiKey,
  createConsumer,
  createRoute,
  listUserApiKeys,
  parseApiKeyRole,
  parseLabelString,
  parsePermissionsLabel,
} from "@/utils/apisix";
import { safeNotify } from "@/lib/notifications";
import { geoLocate } from "@/lib/geo";
import type { APIRoute } from "astro";
import { APISSIX_ROUTE_ID, COSMOS_API_URL, COSMOS_API_ENTRY } from "astro:env/server";

export const GET: APIRoute = async (ctx) => {
  const session = await auth.api.getSession({
    headers: ctx.request.headers,
  });

  if (!session) {
    return jsonUnauthorized("Session required");
  }

  // API keys are scoped per organization. The caller passes ?org=<id> to list a
  // single workspace's keys; without it we fall back to every key the user owns.
  const orgFilter = ctx.url.searchParams.get("org");
  if (orgFilter) {
    const membership = await getMembership(orgFilter, session.user.id).catch(() => null);
    if (!membership) {
      return jsonForbidden("You are not a member of this organization.");
    }
  }

  const route = await createRoute(APISSIX_ROUTE_ID, COSMOS_API_ENTRY, COSMOS_API_URL);

  if (!route) {
    return jsonError({
      message: "Failed to get route",
      code: 500,
      status: "internal_error"
    });
  }

  const consumer = await createConsumer(session.user.id).catch(err => {
    return null
  });

  if (!consumer) {
    return jsonError({
      message: "Failed to create consumer",
      code: 500,
      status: "internal_error"
    });
  }



  const userApiKeys = await listUserApiKeys(session.user.id).catch(err => {
    return null
  });

  if (!userApiKeys) {
    return jsonError({
      message: "Failed to get user API keys",
      code: 500,
      status: "internal_error"
    });
  }

  const scopedKeys = orgFilter
    ? userApiKeys.filter((data: { value: { labels?: { org?: string } } }) => data.value.labels?.org === orgFilter)
    : userApiKeys;

  const apiKeys = scopedKeys.map((data: { value: { id: string; create_time: string; update_time: string; name?: string; desc?: string; labels?: { permissions?: string; role?: string; org?: string } } }) => ({
    id: data.value.id,
    createdAt: data.value.create_time,
    updatedAt: data.value.update_time,
    permissions: parsePermissionsLabel(data.value.labels?.permissions),
    role: parseApiKeyRole(data.value.labels?.role),
    name: parseLabelString(data.value.name),
    description: parseLabelString(data.value.desc),
  }));



  return jsonSuccess<ApiKeyListData[]>({
    data: apiKeys,
    message: "API keys fetched successfully",
    status: ApiStatus.SUCCESS,
    code: 200
  });


};

export const POST: APIRoute = async (ctx) => {

  const session = await auth.api.getSession({
    headers: ctx.request.headers,
  });

  if (!session) {
    return jsonUnauthorized("Session required");
  }

  const body = await parseJson(ctx.request, createApiKeyBodySchema).catch(err => {
    return null
  });

  if (!body || !body.ok) {
    return body?.response ?? jsonError({
      message: "Invalid request",
      code: 400,
      status: "bad_request"
    });
  }

  // API keys belong to an organization — the caller must be a member of it, and must hold
  // the matching per-action permission (owners/admins implicitly have all). Production and
  // test keys are gated separately so a collaborator can be limited to test keys only.
  const orgId = body.data.org;
  const membership = await getMembership(orgId, session.user.id).catch(() => null);
  if (!membership) {
    return jsonForbidden("You are not a member of this organization.");
  }
  const keyResource = body.data.environment === "prod" ? "apiKeysLive" : "apiKeysTest";
  if (!hasOrgPermission(membership.role, membership.permissions, `${keyResource}:create`)) {
    return jsonForbidden("You don't have permission to create this kind of API key in this organization.");
  }

  // Plan restrictions (mock billing): production-key access + max API keys.
  // Keys belong to the ORGANIZATION, so the limits come from the org OWNER's plan
  // (per organization), not the acting user's account.
  const limits = await orgOwnerPlanLimits(orgId);
  if (body.data.environment === "prod" && !limits.allowLive) {
    return jsonForbidden("Your plan does not allow production (live) API keys. Upgrade to create one.");
  }
  const existingKeys = await listUserApiKeys(session.user.id).catch(() => []);
  const orgKeyCount = Array.isArray(existingKeys)
    ? existingKeys.filter((k: { value?: { labels?: { org?: string } } }) => k.value?.labels?.org === orgId).length
    : 0;
  if (atLimit(limits.maxApiKeys, orgKeyCount)) {
    return jsonForbidden("You have reached your plan's API key limit for this organization. Upgrade to create more.");
  }

  const route = await createRoute(APISSIX_ROUTE_ID, COSMOS_API_ENTRY, COSMOS_API_URL).catch(err => {
    return null
  });

  if (!route) {
    return jsonError({
      message: "Failed to create route",
      code: 500,
      status: "internal_error"
    });
  }

  const consumer = await createConsumer(session.user.id).catch(err => {
    return null
  });

  if (!consumer) {
    return jsonError({
      message: "Failed to create consumer",
      code: 500,
      status: "internal_error"
    });
  }


  const result = await createApiKey(
    session.user.id,
    body.data.environment,
    body.data.permissions ?? [],
    body.data.role,
    body.data.name,
    body.data.description,
    orgId,
  ).catch(err => {
    return null
  });

  if (!result) {
    return jsonError({
      message: "Failed to create API key",
      code: 500,
      status: "internal_error"
    });
  }

  // Activity notification (best-effort) — records origin + date of the action.
  const loc = await geoLocate(ctx.request.headers, ctx.clientAddress).catch(() => null);
  safeNotify({
    userId: session.user.id,
    type: "apikey.created",
    title: "API key created",
    message: result.name ? `Created “${result.name}”` : `Created key ${result.id}`,
    origin: loc?.origin ?? null,
    country: loc?.country ?? null,
    region: loc?.region ?? null,
    ipAddress: loc?.ip ?? null,
    metadata: { id: result.id, environment: body.data.environment, role: result.role, permissions: result.permissions, city: loc?.city ?? null, publicIp: loc?.publicIp ?? null, userAgent: loc?.userAgent ?? null, local: loc?.isLocal ?? false },
  });

  return jsonCreated<ApiKeyData>({
    data: {
      username: result.username,
      apiKey: result.apiKey,
      id: result.id,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      permissions: result.permissions ?? [],
      role: result.role as 'admin' | 'user' ?? 'user',
      name: result.name,
      description: result.description,
    },
    message: "API key created successfully",
  });
};
