import { ApiStatus, jsonError, jsonNotFound, jsonSuccess, parseJson } from "@/lib/http";
import { cosmosProducts } from "@/lib/cosmos";
import { getUserId, envFromQuery, enforceOrgPermission, cosmosErrorResponse } from "@/lib/cosmos-proxy";
import { updateProductBodySchema } from "@/schemas/cosmos-resources";
import type { APIRoute } from "astro";

export const PATCH: APIRoute = async (ctx) => {
  const auth = await getUserId(ctx.request);
  if ("response" in auth) return auth.response;
  const id = ctx.params.id;
  if (!id) return jsonNotFound("Product not found");

  const denied = await enforceOrgPermission(ctx.url, auth.userId, "products:edit");
  if (denied) return denied;

  const body = await parseJson(ctx.request, updateProductBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: ApiStatus.BAD_REQUEST });
  }
  try {
    const data = await cosmosProducts.update(auth.userId, envFromQuery(ctx.url), id, body.data);
    return jsonSuccess({ data, message: "Product updated successfully" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};

export const DELETE: APIRoute = async (ctx) => {
  const auth = await getUserId(ctx.request);
  if ("response" in auth) return auth.response;
  const id = ctx.params.id;
  if (!id) return jsonNotFound("Product not found");

  const denied = await enforceOrgPermission(ctx.url, auth.userId, "products:delete");
  if (denied) return denied;

  try {
    const data = await cosmosProducts.remove(auth.userId, envFromQuery(ctx.url), id);
    return jsonSuccess({ data, message: "Product deleted successfully" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};
