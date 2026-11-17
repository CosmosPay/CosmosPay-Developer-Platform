import { requestSession } from "@/lib/request-session";
import { ApiStatus, jsonError, jsonNotFound, jsonSuccess, jsonUnauthorized } from "@/lib/http";
import { cosmos, CosmosApiError, type CosmosEnv } from "@/lib/cosmos";
import type { APIRoute } from "astro";

function envFromQuery(url: URL): CosmosEnv {
  return url.searchParams.get("env") === "prod" ? "prod" : "dev";
}

/* GET /api/payment-intents/:id/payer-emails: the emails payers gave in this link's hosted checkout,
   one per checkout session, newest first (the Payments API's `GET /v1/payment-intents/{id}/payer-emails`,
   read with the signed-in account's consumer, so another account's intent is a 404 there and here).
   Unverified: whoever opened the payment page typed them. */
export const GET: APIRoute = async (ctx) => {
  const session = await requestSession(ctx.request.headers);
  if (!session) return jsonUnauthorized("Session required");

  const id = ctx.params.id;
  if (!id) return jsonNotFound("Payment intent not found");

  try {
    const page = await cosmos.payerEmails(session.user.id, envFromQuery(ctx.url), id);
    return jsonSuccess({ data: Array.isArray(page?.data) ? page.data : [], message: "Payer emails fetched successfully" });
  } catch (err) {
    if (err instanceof CosmosApiError) {
      if (err.status === 404) return jsonNotFound("Payment intent not found");
      return jsonError({ message: err.message, code: err.status, status: ApiStatus.BAD_REQUEST });
    }
    return jsonError({ message: "Payments request failed", code: 500, status: ApiStatus.INTERNAL_ERROR });
  }
};
