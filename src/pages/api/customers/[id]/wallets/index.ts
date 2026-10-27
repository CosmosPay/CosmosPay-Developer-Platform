import { ApiStatus, jsonCreated, jsonError, jsonNotFound, parseJson } from "@/lib/http";
import { cosmosCustomers } from "@/lib/cosmos";
import { getUserId, envFromQuery, enforceOrgPermission, cosmosErrorResponse } from "@/lib/cosmos-proxy";
import { customerWalletBodySchema } from "@/schemas/cosmos-resources";
import type { APIRoute } from "astro";

/* Adds a wallet to a customer: an edit of the customer, so it takes `customers:edit`. */
export const POST: APIRoute = async (ctx) => {
  const auth = await getUserId(ctx.request);
  if ("response" in auth) return auth.response;
  const id = ctx.params.id;
  if (!id) return jsonNotFound("Customer not found");

  const denied = await enforceOrgPermission(ctx.url, auth.userId, "customers:edit");
  if (denied) return denied;

  const body = await parseJson(ctx.request, customerWalletBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: ApiStatus.BAD_REQUEST });
  }
  try {
    const data = await cosmosCustomers.addWallet(auth.userId, envFromQuery(ctx.url), id, body.data);
    return jsonCreated({ data, message: "Wallet added successfully" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};
