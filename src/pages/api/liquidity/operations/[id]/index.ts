import { jsonNotFound, jsonSuccess } from "@/lib/http";
import { cosmosLiquidity } from "@/lib/cosmos";
import { cosmosErrorResponse, envFromQuery, requireOrgMember } from "../../_helpers";
import type { APIRoute } from "astro";

/* One liquidity pool operation by id (includes the QR/URI/XDR to sign). */
export const GET: APIRoute = async (ctx) => {
  const id = ctx.params.id;
  if (!id) return jsonNotFound("Liquidity operation not found");

  const gate = await requireOrgMember(ctx.request, ctx.url.searchParams.get("org"));
  if (!gate.ok) return gate.response;

  try {
    const op = await cosmosLiquidity.operation(gate.userId, envFromQuery(ctx.url), gate.org, id);
    return jsonSuccess({ data: op, message: "Liquidity operation fetched successfully" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};
