import { ApiStatus, jsonCreated, jsonError, jsonSuccess, parseJson } from "@/lib/http";
import { cosmosWebhooks } from "@/lib/cosmos";
import { getUserId, envFromQuery, enforceOrgPermission, cosmosErrorResponse } from "@/lib/cosmos-proxy";
import { createWebhookBodySchema } from "@/schemas/cosmos-resources";
import type { APIRoute } from "astro";

export const GET: APIRoute = async (ctx) => {
  const auth = await getUserId(ctx.request);
  if ("response" in auth) return auth.response;
  try {
    const data = await cosmosWebhooks.list(auth.userId, envFromQuery(ctx.url));
    return jsonSuccess({ data, message: "Webhooks fetched successfully" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};

export const POST: APIRoute = async (ctx) => {
  const auth = await getUserId(ctx.request);
  if ("response" in auth) return auth.response;

  const denied = await enforceOrgPermission(ctx.url, auth.userId, "webhooks:create");
  if (denied) return denied;

  const body = await parseJson(ctx.request, createWebhookBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: ApiStatus.BAD_REQUEST });
  }
  try {
    const data = await cosmosWebhooks.create(auth.userId, envFromQuery(ctx.url), body.data);
    return jsonCreated({ data, message: "Webhook created successfully" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};
