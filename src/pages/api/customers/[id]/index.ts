import { ApiStatus, jsonError, jsonNotFound, jsonSuccess, parseJson } from "@/lib/http";
import { cosmosCustomers } from "@/lib/cosmos";
import { getUserId, envFromQuery, enforceOrgPermission, cosmosErrorResponse } from "@/lib/cosmos-proxy";
import { updateCustomerBodySchema } from "@/schemas/cosmos-resources";
import type { APIRoute } from "astro";

export const PATCH: APIRoute = async (ctx) => {
  const auth = await getUserId(ctx.request);
  if ("response" in auth) return auth.response;
  const id = ctx.params.id;
  if (!id) return jsonNotFound("Customer not found");

  const denied = await enforceOrgPermission(ctx.url, auth.userId, "customers:edit");
  if (denied) return denied;

  const body = await parseJson(ctx.request, updateCustomerBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: ApiStatus.BAD_REQUEST });
  }
  try {
    const data = await cosmosCustomers.update(auth.userId, envFromQuery(ctx.url), id, body.data);
    return jsonSuccess({ data, message: "Customer updated successfully" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};

export const DELETE: APIRoute = async (ctx) => {
  const auth = await getUserId(ctx.request);
  if ("response" in auth) return auth.response;
  const id = ctx.params.id;
  if (!id) return jsonNotFound("Customer not found");

  const denied = await enforceOrgPermission(ctx.url, auth.userId, "customers:delete");
  if (denied) return denied;

  try {
    const data = await cosmosCustomers.remove(auth.userId, envFromQuery(ctx.url), id);
    return jsonSuccess({ data, message: "Customer deleted successfully" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};
