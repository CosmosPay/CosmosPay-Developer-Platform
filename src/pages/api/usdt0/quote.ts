import { ApiStatus, jsonError, jsonSuccess, parseJson } from "@/lib/http";
import { cosmosUsdt0 } from "@/lib/cosmos";
import { usdt0QuoteBodySchema } from "@/schemas/usdt0";
import { cosmosErrorResponse, requireOrgMember } from "@/pages/api/usdt0/_helpers";
import type { APIRoute } from "astro";

/* What a USDT0 transfer out of Stellar delivers and what LayerZero charges for it (in XLM). */
export const POST: APIRoute = async (ctx) => {
  const body = await parseJson(ctx.request, usdt0QuoteBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: ApiStatus.BAD_REQUEST });
  }
  const { org, environment, ...input } = body.data;
  const gate = await requireOrgMember(ctx.request, org);
  if (!gate.ok) return gate.response;
  try {
    const quote = await cosmosUsdt0.quote(gate.userId, environment, org, input);
    return jsonSuccess({ data: quote, message: "USDT0 transfer quoted successfully" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};
