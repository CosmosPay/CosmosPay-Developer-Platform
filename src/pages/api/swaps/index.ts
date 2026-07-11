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
import { getMembership, orgSwapContext } from "@/lib/organizations";
import { hasOrgPermission } from "@/lib/org-permissions";
import { cosmosSwaps, CosmosApiError, type CosmosEnv } from "@/lib/cosmos";
import { createSwapBodySchema } from "@/schemas/swaps";
import { safeNotify } from "@/lib/notifications";
import { geoLocate } from "@/lib/geo";
import type { APIRoute } from "astro";

function envFromQuery(url: URL): CosmosEnv {
  return url.searchParams.get("env") === "prod" ? "prod" : "dev";
}

function cosmosErrorResponse(err: unknown): Response {
  if (err instanceof CosmosApiError) {
    return jsonError({ message: err.message, code: err.status, status: ApiStatus.BAD_REQUEST });
  }
  return jsonError({ message: "Swap request failed", code: 500, status: ApiStatus.INTERNAL_ERROR });
}

/* List the consumer's swaps (scoped to an organization the caller belongs to). */
export const GET: APIRoute = async (ctx) => {
  const session = await auth.api.getSession({ headers: ctx.request.headers });
  if (!session) return jsonUnauthorized("Session required");

  const org = ctx.url.searchParams.get("org");
  if (!org) return jsonError({ message: "An organization is required", code: 400, status: ApiStatus.BAD_REQUEST });
  const membership = await getMembership(org, session.user.id).catch(() => null);
  if (!membership) return jsonForbidden("You are not a member of this organization.");

  const env = envFromQuery(ctx.url);
  const status = ctx.url.searchParams.get("status") || undefined;
  const take = Number(ctx.url.searchParams.get("take")) || undefined;
  const skip = Number(ctx.url.searchParams.get("skip")) || undefined;

  try {
    const list = await cosmosSwaps.list(session.user.id, env, org, { status, take, skip });
    return jsonSuccess({ data: list, message: "Swaps fetched successfully" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};

/* Build a swap (unsigned XDR + tx URI + QR) for the customer's wallet to sign. The
   commission is the org plan's rate — resolved here and never taken from the body. */
export const POST: APIRoute = async (ctx) => {
  const session = await auth.api.getSession({ headers: ctx.request.headers });
  if (!session) return jsonUnauthorized("Session required");

  const body = await parseJson(ctx.request, createSwapBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: ApiStatus.BAD_REQUEST });
  }

  const { org, environment, ...rest } = body.data;
  const membership = await getMembership(org, session.user.id).catch(() => null);
  if (!membership) return jsonForbidden("You are not a member of this organization.");
  if (!hasOrgPermission(membership.role, membership.permissions, "payments:create")) {
    return jsonForbidden("You don't have permission to create swaps in this organization.");
  }

  const { swapFeeBps } = await orgSwapContext(org);

  try {
    const swap = await cosmosSwaps.create(session.user.id, environment, org, swapFeeBps, {
      amount: rest.amount,
      sourceAssetCode: rest.sourceAssetCode,
      sourceAssetIssuer: rest.sourceAssetIssuer,
      destAssetCode: rest.destAssetCode,
      destAssetIssuer: rest.destAssetIssuer,
      slippageBps: rest.slippageBps,
      source: rest.source,
      destination: rest.destination,
      memo: rest.memo,
    });

    const loc = await geoLocate(ctx.request.headers, ctx.clientAddress).catch(() => null);
    safeNotify({
      userId: session.user.id,
      type: "swap.created",
      title: "Swap created",
      message: `${swap.sendAmount} ${swap.sendAsset === "native" ? "XLM" : swap.sendAsset} → ~${swap.destEstimated} ${swap.destAsset}`,
      origin: loc?.origin ?? null,
      country: loc?.country ?? null,
      region: loc?.region ?? null,
      ipAddress: loc?.ip ?? null,
      metadata: { id: swap.id, network: swap.network, feeBps: swap.feeBps, city: loc?.city ?? null, publicIp: loc?.publicIp ?? null, userAgent: loc?.userAgent ?? null, local: loc?.isLocal ?? false },
    });

    return jsonCreated({ data: swap, message: "Swap created successfully" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};
