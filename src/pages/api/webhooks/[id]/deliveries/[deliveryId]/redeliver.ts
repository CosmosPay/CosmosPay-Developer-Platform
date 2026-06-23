import { jsonNotFound, jsonSuccess } from "@/lib/http";
import { cosmosWebhooks } from "@/lib/cosmos";
import { getUserId, envFromQuery, enforceOrgPermission, cosmosErrorResponse } from "@/lib/cosmos-proxy";
import type { APIRoute } from "astro";

export const POST: APIRoute = async (ctx) => {
  const auth = await getUserId(ctx.request);
  if ("response" in auth) return auth.response;
  const { id, deliveryId } = ctx.params;
  if (!id || !deliveryId) return jsonNotFound("Delivery not found");

  const denied = await enforceOrgPermission(ctx.url, auth.userId, "webhooks:edit");
  if (denied) return denied;

  try {
    const data = await cosmosWebhooks.redeliver(auth.userId, envFromQuery(ctx.url), id, deliveryId);
    return jsonSuccess({ data, message: "Delivery re-sent" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};
