import { jsonNotFound, jsonSuccess } from "@/lib/http";
import { cosmosCrossChainSwaps } from "@/lib/cosmos";
import { cosmosErrorResponse, envFromQuery, requireOrgMember } from "../_helpers";
import type { APIRoute } from "astro";

/* One cross-chain swap, as the Payments API last saw it. */
export const GET: APIRoute = async (ctx) => {
  const id = ctx.params.id;
  if (!id) return jsonNotFound("Cross-chain swap not found");
  const gate = await requireOrgMember(ctx.request, ctx.url.searchParams.get("org"));
  if (!gate.ok) return gate.response;
  try {
    const swap = await cosmosCrossChainSwaps.get(gate.userId, envFromQuery(ctx.url), gate.org, id);
    return jsonSuccess({ data: swap, message: "Cross-chain swap fetched successfully" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};
