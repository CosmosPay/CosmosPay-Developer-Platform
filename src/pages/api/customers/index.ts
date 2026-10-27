import { ApiStatus, jsonCreated, jsonError, jsonSuccess, parseJson } from "@/lib/http";
import { cosmosCustomers } from "@/lib/cosmos";
import { getUserId, envFromQuery, enforceOrgPermission, cosmosErrorResponse } from "@/lib/cosmos-proxy";
import { createCustomerBodySchema } from "@/schemas/cosmos-resources";
import type { APIRoute } from "astro";

export const GET: APIRoute = async (ctx) => {
  const auth = await getUserId(ctx.request);
  if ("response" in auth) return auth.response;
  try {
    // A page of at most 100 (the API's bound); without `take`, the API's default page.
    const take = Math.min(100, Math.max(0, Math.trunc(Number(ctx.url.searchParams.get("take")) || 0))) || undefined;
    const skip = Math.max(0, Math.trunc(Number(ctx.url.searchParams.get("skip")) || 0)) || undefined;
    const data = await cosmosCustomers.list(auth.userId, envFromQuery(ctx.url), { take, skip });
    return jsonSuccess({ data, message: "Customers fetched successfully" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};

export const POST: APIRoute = async (ctx) => {
  const auth = await getUserId(ctx.request);
  if ("response" in auth) return auth.response;

  const denied = await enforceOrgPermission(ctx.url, auth.userId, "customers:create");
  if (denied) return denied;

  const body = await parseJson(ctx.request, createCustomerBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: ApiStatus.BAD_REQUEST });
  }
  try {
    const data = await cosmosCustomers.create(auth.userId, envFromQuery(ctx.url), body.data);
    return jsonCreated({ data, message: "Customer created successfully" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};
