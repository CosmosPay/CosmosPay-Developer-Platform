import { auth } from "@/lib/auth";
import {
  ApiStatus,
  jsonCreated,
  jsonError,
  jsonForbidden,
  jsonSuccess,
  jsonUnauthorized,
  parseJson,
} from "@/lib/http";
import { getMembership } from "@/lib/organizations";
import { hasOrgPermission } from "@/lib/org-permissions";
import { cosmos, CosmosApiError, type CosmosEnv } from "@/lib/cosmos";
import { createPaymentIntentBodySchema } from "@/schemas/payment-intents";
import { safeNotify } from "@/lib/notifications";
import { geoLocate } from "@/lib/geo";
import type { APIRoute } from "astro";

/** Normalize the ?env= query param to the consumer environment (defaults to dev/testnet). */
function envFromQuery(url: URL): CosmosEnv {
  return url.searchParams.get("env") === "prod" ? "prod" : "dev";
}

/** Turn an upstream CosmosApiError into a matching JSON error response. */
function cosmosErrorResponse(err: unknown): Response {
  if (err instanceof CosmosApiError) {
    return jsonError({ message: err.message, code: err.status, status: ApiStatus.BAD_REQUEST });
  }
  return jsonError({ message: "Payments request failed", code: 500, status: ApiStatus.INTERNAL_ERROR });
}

export const GET: APIRoute = async (ctx) => {
  const session = await auth.api.getSession({ headers: ctx.request.headers });
  if (!session) return jsonUnauthorized("Session required");

  // Payment intents are scoped to the signed-in user's consumer. When an org is
  // supplied, confirm membership so the dashboard can't list another workspace's view.
  const orgFilter = ctx.url.searchParams.get("org");
  if (orgFilter) {
    const membership = await getMembership(orgFilter, session.user.id).catch(() => null);
    if (!membership) return jsonForbidden("You are not a member of this organization.");
  }

  const env = envFromQuery(ctx.url);
  const status = ctx.url.searchParams.get("status") || undefined;
  const take = Number(ctx.url.searchParams.get("take")) || undefined;
  const skip = Number(ctx.url.searchParams.get("skip")) || undefined;

  try {
    const list = await cosmos.list(session.user.id, env, { status, take, skip });
    return jsonSuccess({ data: list, message: "Payment intents fetched successfully" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};

export const POST: APIRoute = async (ctx) => {
  const session = await auth.api.getSession({ headers: ctx.request.headers });
  if (!session) return jsonUnauthorized("Session required");

  const body = await parseJson(ctx.request, createPaymentIntentBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: ApiStatus.BAD_REQUEST });
  }

  // Payment links belong to an organization — the caller must be a member and hold
  // the `payments:create` permission (owners/admins implicitly have it).
  const { org, environment, kind, ...rest } = body.data;
  const membership = await getMembership(org, session.user.id).catch(() => null);
  if (!membership) return jsonForbidden("You are not a member of this organization.");
  if (!hasOrgPermission(membership.role, membership.permissions, "payments:create")) {
    return jsonForbidden("You don't have permission to create payment links in this organization.");
  }

  try {
    const intent =
      kind === "tx"
        ? await cosmos.createTx(session.user.id, environment, {
            source: rest.source!,
            destination: rest.destination,
            amount: rest.amount!,
            assetCode: rest.assetCode,
            assetIssuer: rest.assetIssuer,
            memo: rest.memo,
            msg: rest.msg,
            callback: rest.callback,
          })
        : await cosmos.createPay(session.user.id, environment, {
            destination: rest.destination,
            amount: rest.amount,
            assetCode: rest.assetCode,
            assetIssuer: rest.assetIssuer,
            memo: rest.memo,
            msg: rest.msg,
            callback: rest.callback,
          });

    // Activity notification (best-effort) — records origin + date of the action.
    const loc = await geoLocate(ctx.request.headers, ctx.clientAddress).catch(() => null);
    safeNotify({
      userId: session.user.id,
      type: "payment.created",
      title: "Payment link created",
      message: intent.amount ? `${intent.kind} link · ${intent.amount} ${intent.asset}` : `${intent.kind} link · ${intent.id}`,
      origin: loc?.origin ?? null,
      country: loc?.country ?? null,
      region: loc?.region ?? null,
      ipAddress: loc?.ip ?? null,
      metadata: { id: intent.id, kind: intent.kind, network: intent.network, city: loc?.city ?? null, publicIp: loc?.publicIp ?? null, userAgent: loc?.userAgent ?? null, local: loc?.isLocal ?? false },
    });

    return jsonCreated({ data: intent, message: "Payment intent created successfully" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};
