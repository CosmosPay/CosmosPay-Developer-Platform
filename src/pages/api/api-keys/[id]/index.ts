import { auth } from "@/lib/auth";
import {
  ApiStatus,
  jsonError,
  jsonNotFound,
  jsonSuccess,
  jsonUnauthorized,
  parseJson,
} from "@/lib/http";
import {
  apiKeyIdParamSchema,
  updateApiKeyBodySchema,
  type ApiKeyIdData,
} from "@/schemas/api-keys";
import {
  deleteApiKey,
  getApiKey,
  parseApiKeyEnv,
  parseApiKeyRole,
  parseLabelString,
  parsePermissionsLabel,
  updateApiKey,
} from "@/utils/apisix";
import { safeNotify } from "@/lib/notifications";
import { geoLocate } from "@/lib/geo";
import { getMembership } from "@/lib/organizations";
import { hasOrgPermission } from "@/lib/org-permissions";
import { jsonForbidden } from "@/lib/http";
import type { APIRoute } from "astro";

/* Mutating a key requires the matching per-action API-key permission in the key's
   organization (owners/admins implicitly have it). `action` is "edit" or "delete".
   Returns a 403 Response to block, or null to allow. */
async function denyIfMember(apiKey: { value?: { labels?: { org?: string } } }, userId: string, action: "edit" | "delete"): Promise<Response | null> {
  const orgId = apiKey?.value?.labels?.org;
  if (!orgId) return null;
  const membership = await getMembership(orgId, userId).catch(() => null);
  if (!membership) return null;
  const allowed =
    hasOrgPermission(membership.role, membership.permissions, `apiKeysTest:${action}`) ||
    hasOrgPermission(membership.role, membership.permissions, `apiKeysLive:${action}`);
  if (!allowed) return jsonForbidden("You don't have permission to manage API keys in this organization.");
  return null;
}

export const GET: APIRoute = async (ctx) => {

  const session = await auth.api.getSession({
    headers: ctx.request.headers,
  });

  if (!session) {
    return jsonUnauthorized("Session required");
  }

  const idResult = apiKeyIdParamSchema.safeParse(ctx.params);

  if (!idResult.success) {
    return jsonNotFound("API key not found");
  }

  const { id } = idResult.data;

  const apiKey = await getApiKey(id, session.user.id).catch(err => {
    return null
  });


  if (!apiKey) {
    return jsonNotFound("API key not found");
  }

  return jsonSuccess<ApiKeyIdData>({
    data: {
      id,
      createdAt: apiKey.value.create_time,
      updatedAt: apiKey.value.update_time,
      permissions: parsePermissionsLabel(apiKey.value.labels?.permissions),
      role: parseApiKeyRole(apiKey.value.labels?.role),
      environment: parseApiKeyEnv(apiKey.value.labels?.env),
      name: parseLabelString(apiKey.value.name),
      description: parseLabelString(apiKey.value.desc),
    },
    message: "API key retrieved successfully",
  });
};




export const DELETE: APIRoute = async (ctx) => {


  const session = await auth.api.getSession({
    headers: ctx.request.headers,
  });

  if (!session) {
    return jsonUnauthorized("Session required");
  }

  const idResult = apiKeyIdParamSchema.safeParse(ctx.params);

  if (!idResult.success) {
    return jsonNotFound("API key not found");
  }

  const { id } = idResult.data;

  const apiKey = await getApiKey(id, session.user.id).catch(err => {
    return null
  });

  if (!apiKey) {
    return jsonNotFound("API key not found");
  }

  const deniedDelete = await denyIfMember(apiKey, session.user.id, "delete");
  if (deniedDelete) return deniedDelete;

  const result = await deleteApiKey(id, session.user.id).catch(err => {
    return null
  });

  if (!result) {
    return jsonError({
      message: "Failed to delete API key",
      status: "internal_error",
      code: 500
    });
  }

  const delLoc = await geoLocate(ctx.request.headers, ctx.clientAddress).catch(() => null);
  safeNotify({
    userId: session.user.id,
    type: "apikey.deleted",
    title: "API key revoked",
    message: `Revoked key ${id}`,
    origin: delLoc?.origin ?? null,
    country: delLoc?.country ?? null,
    region: delLoc?.region ?? null,
    ipAddress: delLoc?.ip ?? null,
    metadata: { id, city: delLoc?.city ?? null, publicIp: delLoc?.publicIp ?? null, userAgent: delLoc?.userAgent ?? null, local: delLoc?.isLocal ?? false },
  });

  return jsonSuccess({
    data: null,
    message: "API key deleted successfully",
    status: ApiStatus.SUCCESS,
    code: 200
  });
};


export const PATCH: APIRoute = async (ctx) => {

  const session = await auth.api.getSession({
    headers: ctx.request.headers,
  });

  if (!session) {
    return jsonUnauthorized("Session required");
  }

  const idResult = apiKeyIdParamSchema.safeParse(ctx.params);

  if (!idResult.success) {
    return jsonNotFound("API key not found");
  }

  const { id } = idResult.data;

  const apiKey = await getApiKey(id, session.user.id).catch(err => {
    return null
  });

  if (!apiKey) {
    return jsonNotFound("API key not found");
  }

  const deniedPatch = await denyIfMember(apiKey, session.user.id, "edit");
  if (deniedPatch) return deniedPatch;

  const body = await parseJson(ctx.request, updateApiKeyBodySchema).catch(err => {
    return null
  });

  if (!body || !body.ok) {
    return body?.response ?? jsonError({
      message: "Invalid request",
      code: 400,
      status: "bad_request"
    });
  }

  const result = await updateApiKey(id, session.user.id, body.data.permissions, body.data.role, body.data.name, body.data.description).catch(err => {
    return null
  });


  if (!result) {
    return jsonError({
      message: "Failed to update API key",
      code: 500,
      status: "internal_error"
    });
  }

  const patchLoc = await geoLocate(ctx.request.headers, ctx.clientAddress).catch(() => null);
  safeNotify({
    userId: session.user.id,
    type: "apikey.updated",
    title: "API key updated",
    message: result.name ? `Updated “${result.name}”` : `Updated key ${id}`,
    origin: patchLoc?.origin ?? null,
    country: patchLoc?.country ?? null,
    region: patchLoc?.region ?? null,
    ipAddress: patchLoc?.ip ?? null,
    metadata: { id, role: result.role, permissions: result.permissions, city: patchLoc?.city ?? null, publicIp: patchLoc?.publicIp ?? null, userAgent: patchLoc?.userAgent ?? null, local: patchLoc?.isLocal ?? false },
  });

  return jsonSuccess<ApiKeyIdData>({
    data: {
      id,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      permissions: result.permissions ?? [],
      role: result.role as 'admin' | 'user' ?? 'user',
      environment: result.environment ?? parseApiKeyEnv(apiKey.value.labels?.env),
      name: result.name,
      description: result.description,
    },
    message: "API key updated successfully",
  });

}