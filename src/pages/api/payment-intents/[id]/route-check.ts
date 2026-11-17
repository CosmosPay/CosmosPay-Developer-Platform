import { requestSession } from "@/lib/request-session";
import { ApiStatus, jsonError, jsonNotFound, jsonSuccess, jsonUnauthorized } from "@/lib/http";
import { cosmos, CosmosApiError, type CosmosEnv } from "@/lib/cosmos";
import type { APIRoute } from "astro";

function envFromQuery(url: URL): CosmosEnv {
  return url.searchParams.get("env") === "prod" ? "prod" : "dev";
}

/* GET /api/payment-intents/:id/route-check: how the main origins fare for this link's amount, the
   ones that cannot pay it and why (the Payments API's `GET /v1/payment-intents/{id}/route-check`,
   read with the signed-in account's consumer, so another account's intent is a 404 there and here).
   A warning for the merchant: it never blocks the link. Empty for a link without an amount or one
   that cannot be paid from another network. */
export const GET: APIRoute = async (ctx) => {
  const session = await requestSession(ctx.request.headers);
  if (!session) return jsonUnauthorized("Session required");

  const id = ctx.params.id;
  if (!id) return jsonNotFound("Payment intent not found");

  try {
    const page = await cosmos.routeCheck(session.user.id, envFromQuery(ctx.url), id);
    return jsonSuccess({ data: Array.isArray(page?.data) ? page.data : [], message: "Route check fetched successfully" });
  } catch (err) {
    if (err instanceof CosmosApiError) {
      if (err.status === 404) return jsonNotFound("Payment intent not found");
      if (err.status === 429) return jsonError({ message: "Too many route checks, try again in a minute", code: 429 });
      return jsonError({ message: err.message, code: err.status, status: ApiStatus.BAD_REQUEST });
    }
    return jsonError({ message: "Payments request failed", code: 500, status: ApiStatus.INTERNAL_ERROR });
  }
};
