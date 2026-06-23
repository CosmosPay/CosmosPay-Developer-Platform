import { jsonNotFound, jsonSuccess } from "@/lib/http";
import { cosmosWebhooks } from "@/lib/cosmos";
import { getUserId, envFromQuery, enforceOrgPermission, cosmosErrorResponse } from "@/lib/cosmos-proxy";
import type { APIRoute } from "astro";

export const POST: APIRoute = async (ctx) => {
  const auth = await getUserId(ctx.request);
  if ("response" in auth) return auth.response;
  const id = ctx.params.id;
  if (!id) return jsonNotFound("Webhook not found");

  const denied = await enforceOrgPermission(ctx.url, auth.userId, "webhooks:edit");
  if (denied) return denied;

  try {
    const data = await cosmosWebhooks.rotateSecret(auth.userId, envFromQuery(ctx.url), id);
    return jsonSuccess({ data, message: "Signing secret rotated" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};
