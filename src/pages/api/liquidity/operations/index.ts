import { jsonSuccess } from "@/lib/http";
import { cosmosLiquidity } from "@/lib/cosmos";
import { cosmosErrorResponse, envFromQuery, requireOrgMember } from "../_helpers";
import type { APIRoute } from "astro";

/* List the consumer's liquidity pool operations. */
export const GET: APIRoute = async (ctx) => {
  const gate = await requireOrgMember(ctx.request, ctx.url.searchParams.get("org"));
  if (!gate.ok) return gate.response;

  const p = ctx.url.searchParams;
  try {
    const list = await cosmosLiquidity.operations(gate.userId, envFromQuery(ctx.url), gate.org, {
      kind: p.get("kind") || undefined,
      status: p.get("status") || undefined,
      take: Number(p.get("take")) || undefined,
      skip: Number(p.get("skip")) || undefined,
    });
    return jsonSuccess({ data: list, message: "Liquidity operations fetched successfully" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};
