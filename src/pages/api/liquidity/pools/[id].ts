import { jsonNotFound, jsonSuccess } from "@/lib/http";
import { cosmosLiquidity } from "@/lib/cosmos";
import { cosmosErrorResponse, envFromQuery, requireOrgMember } from "../_helpers";
import type { APIRoute } from "astro";

/* One liquidity pool by id (Horizon proxy via the Payments API). */
export const GET: APIRoute = async (ctx) => {
  const id = ctx.params.id;
  if (!id) return jsonNotFound("Liquidity pool not found");

  const gate = await requireOrgMember(ctx.request, ctx.url.searchParams.get("org"));
  if (!gate.ok) return gate.response;

  try {
    const pool = await cosmosLiquidity.pool(gate.userId, envFromQuery(ctx.url), gate.org, id);
    return jsonSuccess({ data: pool, message: "Liquidity pool fetched successfully" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};
