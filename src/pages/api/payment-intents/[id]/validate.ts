import { auth } from "@/lib/auth";
import {
  ApiStatus,
  jsonError,
  jsonNotFound,
  jsonSuccess,
  jsonUnauthorized,
  parseJson,
} from "@/lib/http";
import { cosmos, CosmosApiError, type CosmosEnv } from "@/lib/cosmos";
import { validatePaymentIntentBodySchema } from "@/schemas/payment-intents";
import type { APIRoute } from "astro";

function envFromQuery(url: URL): CosmosEnv {
  return url.searchParams.get("env") === "prod" ? "prod" : "dev";
}

// Validate a submitted Stellar tx against the intent (success + destination + amount +
// memo); the upstream finalizes the status and fires its webhook event.
export const POST: APIRoute = async (ctx) => {
  const session = await auth.api.getSession({ headers: ctx.request.headers });
  if (!session) return jsonUnauthorized("Session required");

  const id = ctx.params.id;
  if (!id) return jsonNotFound("Payment intent not found");

  const body = await parseJson(ctx.request, validatePaymentIntentBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: ApiStatus.BAD_REQUEST });
  }

  try {
    const outcome = await cosmos.validate(session.user.id, envFromQuery(ctx.url), id, body.data.txHash);
    return jsonSuccess({ data: outcome, message: "Payment intent validated" });
  } catch (err) {
    if (err instanceof CosmosApiError) {
      if (err.status === 404) return jsonNotFound("Payment intent not found");
      return jsonError({ message: err.message, code: err.status, status: ApiStatus.BAD_REQUEST });
    }
    return jsonError({ message: "Payments request failed", code: 500, status: ApiStatus.INTERNAL_ERROR });
  }
};
