import { jsonNotFound, jsonSuccess } from "@/lib/http";
import { cosmosWebhooks } from "@/lib/cosmos";
import { getUserId, envFromQuery, cosmosErrorResponse } from "@/lib/cosmos-proxy";
import type { APIRoute } from "astro";

export const GET: APIRoute = async (ctx) => {
  const auth = await getUserId(ctx.request);
  if ("response" in auth) return auth.response;
  const id = ctx.params.id;
  if (!id) return jsonNotFound("Webhook not found");

  const status = ctx.url.searchParams.get("status") || undefined;
  const take = Number(ctx.url.searchParams.get("take")) || undefined;
  const skip = Number(ctx.url.searchParams.get("skip")) || undefined;

  try {
    const data = await cosmosWebhooks.deliveries(auth.userId, envFromQuery(ctx.url), id, { status, take, skip });
    return jsonSuccess({ data, message: "Deliveries fetched successfully" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};
