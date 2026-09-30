import { ApiStatus, jsonError, jsonSuccess, parseJson } from "@/lib/http";
import { orgSwapContext } from "@/lib/organizations";
import { cosmosCrossChainSwaps } from "@/lib/cosmos";
import { quoteCrossChainSwapBodySchema } from "@/schemas/swaps";
import { cosmosErrorResponse, requireOrgMember } from "./_helpers";
import type { APIRoute } from "astro";

/* Price a cross-chain swap through NEAR Intents. The commission is the organization
   plan's rate (resolved here, never accepted from the caller). */
export const POST: APIRoute = async (ctx) => {
  const body = await parseJson(ctx.request, quoteCrossChainSwapBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: ApiStatus.BAD_REQUEST });
  }
  const { org, environment, ...input } = body.data;
  const gate = await requireOrgMember(ctx.request, org);
  if (!gate.ok) return gate.response;

  const { swapFeeBps } = await orgSwapContext(org);
  try {
    const quote = await cosmosCrossChainSwaps.quote(gate.userId, environment, org, swapFeeBps, input);
    return jsonSuccess({ data: quote, message: "Cross-chain swap quoted successfully" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};
