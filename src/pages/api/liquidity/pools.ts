import { jsonSuccess } from "@/lib/http";
import { cosmosLiquidity } from "@/lib/cosmos";
import { cosmosErrorResponse, envFromQuery, requireOrgMember } from "./_helpers";
import type { APIRoute } from "astro";

/* Browse on-chain liquidity pools (Horizon proxy via the Payments API). */
export const GET: APIRoute = async (ctx) => {
  const gate = await requireOrgMember(ctx.request, ctx.url.searchParams.get("org"));
  if (!gate.ok) return gate.response;

  const p = ctx.url.searchParams;
  try {
    const pools = await cosmosLiquidity.pools(gate.userId, envFromQuery(ctx.url), gate.org, {
      assetACode: p.get("assetACode") || undefined,
      assetAIssuer: p.get("assetAIssuer") || undefined,
      assetBCode: p.get("assetBCode") || undefined,
      assetBIssuer: p.get("assetBIssuer") || undefined,
      account: p.get("account") || undefined,
      cursor: p.get("cursor") || undefined,
      limit: Number(p.get("limit")) || undefined,
    });
    return jsonSuccess({ data: pools, message: "Liquidity pools fetched successfully" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};
