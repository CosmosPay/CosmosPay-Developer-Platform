import { ApiStatus, jsonCreated, jsonError, jsonForbidden, jsonSuccess, parseJson } from "@/lib/http";
import { orgSwapContext } from "@/lib/organizations";
import { hasOrgPermission } from "@/lib/org-permissions";
import { cosmosCrossChainSwaps } from "@/lib/cosmos";
import { createCrossChainSwapBodySchema } from "@/schemas/swaps";
import { safeNotify } from "@/lib/notifications";
import { geoLocate } from "@/lib/geo";
import { cosmosErrorResponse, envFromQuery, requireOrgMember } from "./_helpers";
import type { APIRoute } from "astro";

/* List the organization's cross-chain swaps. */
export const GET: APIRoute = async (ctx) => {
  const gate = await requireOrgMember(ctx.request, ctx.url.searchParams.get("org"));
  if (!gate.ok) return gate.response;
  const status = ctx.url.searchParams.get("status") || undefined;
  const take = Number(ctx.url.searchParams.get("take")) || undefined;
  const skip = Number(ctx.url.searchParams.get("skip")) || undefined;
  try {
    const list = await cosmosCrossChainSwaps.list(gate.userId, envFromQuery(ctx.url), gate.org, { status, take, skip });
    return jsonSuccess({ data: list, message: "Cross-chain swaps fetched successfully" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};

/* Open a cross-chain swap: NEAR Intents issues the deposit address the payer funds. */
export const POST: APIRoute = async (ctx) => {
  const body = await parseJson(ctx.request, createCrossChainSwapBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: ApiStatus.BAD_REQUEST });
  }
  const { org, environment, ...input } = body.data;
  const gate = await requireOrgMember(ctx.request, org);
  if (!gate.ok) return gate.response;
  if (!hasOrgPermission(gate.membership.role, gate.membership.permissions, "payments:create")) {
    return jsonForbidden("You don't have permission to create swaps in this organization.");
  }

  const { swapFeeBps } = await orgSwapContext(org);
  try {
    const swap = await cosmosCrossChainSwaps.create(gate.userId, environment, org, swapFeeBps, input);

    const loc = await geoLocate(ctx.request.headers, ctx.clientAddress).catch(() => null);
    safeNotify({
      userId: gate.userId,
      type: "swap.created",
      title: "Cross-chain swap created",
      message: `${swap.amountIn} ${swap.originAsset} (${swap.originChain}) → ~${swap.amountOutEstimated} ${swap.destinationAsset} (${swap.destinationChain})`,
      origin: loc?.origin ?? null,
      country: loc?.country ?? null,
      region: loc?.region ?? null,
      ipAddress: loc?.ip ?? null,
      metadata: { id: swap.id, network: swap.network, feeBps: swap.feeBps, crossChain: true, city: loc?.city ?? null, publicIp: loc?.publicIp ?? null, userAgent: loc?.userAgent ?? null, local: loc?.isLocal ?? false },
    });

    return jsonCreated({ data: swap, message: "Cross-chain swap created successfully" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};
