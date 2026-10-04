import { ApiStatus, jsonError, jsonForbidden, jsonNotFound, jsonSuccess, parseJson } from "@/lib/http";
import { hasOrgPermission } from "@/lib/org-permissions";
import { cosmosCrossChainSwaps } from "@/lib/cosmos";
import { reportDepositBodySchema } from "@/schemas/swaps";
import { cosmosErrorResponse, envFromQuery, requireOrgMember } from "../_helpers";
import type { APIRoute } from "astro";

/* Report the transaction that paid the deposit address, so NEAR Intents starts without
   waiting for its indexer. It verifies the transaction on-chain itself. */
export const POST: APIRoute = async (ctx) => {
  const id = ctx.params.id;
  if (!id) return jsonNotFound("Cross-chain swap not found");
  const body = await parseJson(ctx.request, reportDepositBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: ApiStatus.BAD_REQUEST });
  }
  const gate = await requireOrgMember(ctx.request, ctx.url.searchParams.get("org"));
  if (!gate.ok) return gate.response;
  if (!hasOrgPermission(gate.membership.role, gate.membership.permissions, "payments:create")) {
    return jsonForbidden("You don't have permission to manage swaps in this organization.");
  }
  try {
    const swap = await cosmosCrossChainSwaps.reportDeposit(gate.userId, envFromQuery(ctx.url), gate.org, id, body.data.txHash);
    return jsonSuccess({ data: swap, message: "Deposit reported" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};
