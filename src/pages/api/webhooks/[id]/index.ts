import { ApiStatus, jsonError, jsonNotFound, jsonSuccess, parseJson } from "@/lib/http";
import { cosmosWebhooks } from "@/lib/cosmos";
import { getUserId, envFromQuery, enforceOrgPermission, cosmosErrorResponse } from "@/lib/cosmos-proxy";
import { updateWebhookBodySchema } from "@/schemas/cosmos-resources";
import type { APIRoute } from "astro";

export const GET: APIRoute = async (ctx) => {
  const auth = await getUserId(ctx.request);
  if ("response" in auth) return auth.response;
  const id = ctx.params.id;
  if (!id) return jsonNotFound("Webhook not found");
  try {
    const data = await cosmosWebhooks.get(auth.userId, envFromQuery(ctx.url), id);
    return jsonSuccess({ data, message: "Webhook retrieved successfully" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};

export const PATCH: APIRoute = async (ctx) => {
  const auth = await getUserId(ctx.request);
  if ("response" in auth) return auth.response;
  const id = ctx.params.id;
  if (!id) return jsonNotFound("Webhook not found");

  const denied = await enforceOrgPermission(ctx.url, auth.userId, "webhooks:edit");
  if (denied) return denied;

  const body = await parseJson(ctx.request, updateWebhookBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: ApiStatus.BAD_REQUEST });
  }
  try {
    const data = await cosmosWebhooks.update(auth.userId, envFromQuery(ctx.url), id, body.data);
    return jsonSuccess({ data, message: "Webhook updated successfully" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};

export const DELETE: APIRoute = async (ctx) => {
  const auth = await getUserId(ctx.request);
  if ("response" in auth) return auth.response;
  const id = ctx.params.id;
  if (!id) return jsonNotFound("Webhook not found");

  const denied = await enforceOrgPermission(ctx.url, auth.userId, "webhooks:delete");
  if (denied) return denied;

  try {
    const data = await cosmosWebhooks.remove(auth.userId, envFromQuery(ctx.url), id);
    return jsonSuccess({ data, message: "Webhook deleted successfully" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};
