import { auth } from "@/lib/auth";
import {
  ApiStatus,
  jsonError,
  jsonForbidden,
  jsonSuccess,
  jsonUnauthorized,
  parseJson,
} from "@/lib/http";
import { getMembership, orgSwapContext } from "@/lib/organizations";
import { cosmosSwaps, CosmosApiError } from "@/lib/cosmos";
import { quoteSwapBodySchema } from "@/schemas/swaps";
import type { APIRoute } from "astro";

/** Turn an upstream CosmosApiError into a matching JSON error response. */
function cosmosErrorResponse(err: unknown): Response {
  if (err instanceof CosmosApiError) {
    return jsonError({ message: err.message, code: err.status, status: ApiStatus.BAD_REQUEST });
  }
  return jsonError({ message: "Swap request failed", code: 500, status: ApiStatus.INTERNAL_ERROR });
}

/* Price a swap. The commission shown is the organization plan's rate (resolved here,
   never accepted from the caller), so the quote reflects exactly what will be charged. */
export const POST: APIRoute = async (ctx) => {
  const session = await auth.api.getSession({ headers: ctx.request.headers });
  if (!session) return jsonUnauthorized("Session required");

  const body = await parseJson(ctx.request, quoteSwapBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: ApiStatus.BAD_REQUEST });
  }

  const { org, environment, ...rest } = body.data;
  const membership = await getMembership(org, session.user.id).catch(() => null);
  if (!membership) return jsonForbidden("You are not a member of this organization.");

  // The fee is the org plan's rate — resolved server-side, never from the body.
  const { swapFeeBps } = await orgSwapContext(org);

  try {
    const quote = await cosmosSwaps.quote(session.user.id, environment, org, swapFeeBps, {
      amount: rest.amount,
      sourceAssetCode: rest.sourceAssetCode,
      sourceAssetIssuer: rest.sourceAssetIssuer,
      destAssetCode: rest.destAssetCode,
      destAssetIssuer: rest.destAssetIssuer,
      slippageBps: rest.slippageBps,
    });
    return jsonSuccess({ data: quote, message: "Swap quoted successfully" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};
