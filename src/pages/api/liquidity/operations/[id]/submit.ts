import { ApiStatus, jsonError, jsonForbidden, jsonNotFound, jsonSuccess, parseJson } from "@/lib/http";
import { hasOrgPermission } from "@/lib/org-permissions";
import { cosmosLiquidity } from "@/lib/cosmos";
import { submitLiquidityBodySchema } from "@/schemas/liquidity";
import { cosmosErrorResponse, envFromQuery, requireOrgMember } from "../../_helpers";
import type { APIRoute } from "astro";

/* Relay a signed liquidity pool transaction to the network. The Payments API
   verifies the signed envelope's hash against the operation it built. */
export const POST: APIRoute = async (ctx) => {
  const id = ctx.params.id;
  if (!id) return jsonNotFound("Liquidity operation not found");

  const body = await parseJson(ctx.request, submitLiquidityBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: ApiStatus.BAD_REQUEST });
  }

  const gate = await requireOrgMember(ctx.request, ctx.url.searchParams.get("org"));
  if (!gate.ok) return gate.response;
  if (!hasOrgPermission(gate.membership.role, gate.membership.permissions, "payments:create")) {
    return jsonForbidden("You don't have permission to manage liquidity in this organization.");
  }

  try {
    const outcome = await cosmosLiquidity.submit(gate.userId, envFromQuery(ctx.url), gate.org, id, body.data.signedXdr);
    return jsonSuccess({ data: outcome, message: "Liquidity operation submitted" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};
