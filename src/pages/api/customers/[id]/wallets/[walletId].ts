import { jsonNotFound, jsonSuccess } from "@/lib/http";
import { cosmosCustomers } from "@/lib/cosmos";
import { getUserId, envFromQuery, enforceOrgPermission, cosmosErrorResponse } from "@/lib/cosmos-proxy";
import type { APIRoute } from "astro";

/* Removes one wallet from a customer: an edit of the customer, so it takes `customers:edit`. */
export const DELETE: APIRoute = async (ctx) => {
  const auth = await getUserId(ctx.request);
  if ("response" in auth) return auth.response;
  const { id, walletId } = ctx.params;
  if (!id || !walletId) return jsonNotFound("Wallet not found");

  const denied = await enforceOrgPermission(ctx.url, auth.userId, "customers:edit");
  if (denied) return denied;

  try {
    const data = await cosmosCustomers.removeWallet(auth.userId, envFromQuery(ctx.url), id, walletId);
    return jsonSuccess({ data, message: "Wallet removed successfully" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};
