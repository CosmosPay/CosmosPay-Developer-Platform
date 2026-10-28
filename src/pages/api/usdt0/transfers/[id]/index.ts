import { jsonNotFound, jsonSuccess } from "@/lib/http";
import { cosmosUsdt0 } from "@/lib/cosmos";
import { cosmosErrorResponse, envFromQuery, requireOrgMember } from "@/pages/api/usdt0/_helpers";
import type { APIRoute } from "astro";

/* One USDT0 transfer; while it travels, the Payments API refreshes it from LayerZero Scan. */
export const GET: APIRoute = async (ctx) => {
  const id = ctx.params.id;
  if (!id) return jsonNotFound("USDT0 transfer not found");
  const gate = await requireOrgMember(ctx.request, ctx.url.searchParams.get("org"));
  if (!gate.ok) return gate.response;
  try {
    const transfer = await cosmosUsdt0.get(gate.userId, envFromQuery(ctx.url), gate.org, id);
    return jsonSuccess({ data: transfer, message: "USDT0 transfer fetched successfully" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};
