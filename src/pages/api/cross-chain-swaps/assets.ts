import { jsonSuccess } from "@/lib/http";
import { cosmosCrossChainSwaps } from "@/lib/cosmos";
import { cosmosErrorResponse, envFromQuery, requireOrgMember } from "./_helpers";
import type { APIRoute } from "astro";

/* The tokens NEAR Intents can swap on Stellar, Solana and Monad. */
export const GET: APIRoute = async (ctx) => {
  const gate = await requireOrgMember(ctx.request, ctx.url.searchParams.get("org"));
  if (!gate.ok) return gate.response;
  try {
    const { data } = await cosmosCrossChainSwaps.assets(gate.userId, envFromQuery(ctx.url), gate.org);
    return jsonSuccess({ data, message: "Assets fetched successfully" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};
