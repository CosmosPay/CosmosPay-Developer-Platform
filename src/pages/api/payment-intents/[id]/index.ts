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
import { updatePaymentIntentBodySchema } from "@/schemas/payment-intents";
import { safeNotify } from "@/lib/notifications";
import { geoLocate } from "@/lib/geo";
import type { APIRoute } from "astro";

function envFromQuery(url: URL): CosmosEnv {
  return url.searchParams.get("env") === "prod" ? "prod" : "dev";
}

function cosmosErrorResponse(err: unknown): Response {
  if (err instanceof CosmosApiError) {
    // The upstream returns 404 for an intent that isn't the caller's — surface it cleanly.
    if (err.status === 404) return jsonNotFound("Payment intent not found");
    return jsonError({ message: err.message, code: err.status, status: ApiStatus.BAD_REQUEST });
  }
  return jsonError({ message: "Payments request failed", code: 500, status: ApiStatus.INTERNAL_ERROR });
}

export const GET: APIRoute = async (ctx) => {
  const session = await auth.api.getSession({ headers: ctx.request.headers });
  if (!session) return jsonUnauthorized("Session required");

  const id = ctx.params.id;
  if (!id) return jsonNotFound("Payment intent not found");

  try {
    const intent = await cosmos.get(session.user.id, envFromQuery(ctx.url), id);
    return jsonSuccess({ data: intent, message: "Payment intent retrieved successfully" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};

export const PATCH: APIRoute = async (ctx) => {
  const session = await auth.api.getSession({ headers: ctx.request.headers });
  if (!session) return jsonUnauthorized("Session required");

  const id = ctx.params.id;
  if (!id) return jsonNotFound("Payment intent not found");

  const body = await parseJson(ctx.request, updatePaymentIntentBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: ApiStatus.BAD_REQUEST });
  }

  try {
    const intent = await cosmos.update(session.user.id, envFromQuery(ctx.url), id, body.data);
    return jsonSuccess({ data: intent, message: "Payment intent updated successfully" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};

export const DELETE: APIRoute = async (ctx) => {
  const session = await auth.api.getSession({ headers: ctx.request.headers });
  if (!session) return jsonUnauthorized("Session required");

  const id = ctx.params.id;
  if (!id) return jsonNotFound("Payment intent not found");

  const env = envFromQuery(ctx.url);
  try {
    const result = await cosmos.remove(session.user.id, env, id);

    const loc = await geoLocate(ctx.request.headers, ctx.clientAddress).catch(() => null);
    safeNotify({
      userId: session.user.id,
      type: "payment.deleted",
      title: "Payment link deleted",
      message: `Deleted payment link ${id}`,
      origin: loc?.origin ?? null,
      country: loc?.country ?? null,
      region: loc?.region ?? null,
      ipAddress: loc?.ip ?? null,
      // Tag with the network so the dashboard only surfaces it in the matching env view.
      metadata: { id, network: env === "prod" ? "public" : "testnet", city: loc?.city ?? null, publicIp: loc?.publicIp ?? null, userAgent: loc?.userAgent ?? null, local: loc?.isLocal ?? false },
    });

    return jsonSuccess({ data: result, message: "Payment intent deleted successfully" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};
