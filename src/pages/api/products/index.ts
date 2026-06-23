import { ApiStatus, jsonCreated, jsonError, jsonSuccess, parseJson } from "@/lib/http";
import { cosmosProducts } from "@/lib/cosmos";
import { getUserId, envFromQuery, enforceOrgPermission, cosmosErrorResponse } from "@/lib/cosmos-proxy";
import { createProductBodySchema } from "@/schemas/cosmos-resources";
import type { APIRoute } from "astro";

export const GET: APIRoute = async (ctx) => {
  const auth = await getUserId(ctx.request);
  if ("response" in auth) return auth.response;
  try {
    const data = await cosmosProducts.list(auth.userId, envFromQuery(ctx.url));
    return jsonSuccess({ data, message: "Products fetched successfully" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};

export const POST: APIRoute = async (ctx) => {
  const auth = await getUserId(ctx.request);
  if ("response" in auth) return auth.response;

  const denied = await enforceOrgPermission(ctx.url, auth.userId, "products:create");
  if (denied) return denied;

  const body = await parseJson(ctx.request, createProductBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: ApiStatus.BAD_REQUEST });
  }
  try {
    const data = await cosmosProducts.create(auth.userId, envFromQuery(ctx.url), body.data);
    return jsonCreated({ data, message: "Product created successfully" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};
