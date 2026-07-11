import { ApiStatus, jsonCreated, jsonError, jsonForbidden, parseJson } from "@/lib/http";
import { hasOrgPermission } from "@/lib/org-permissions";
import { cosmosLiquidity } from "@/lib/cosmos";
import { depositLiquidityBodySchema } from "@/schemas/liquidity";
import { safeNotify } from "@/lib/notifications";
import { geoLocate } from "@/lib/geo";
import { cosmosErrorResponse, requireOrgMember } from "./_helpers";
import type { APIRoute } from "astro";

/* Build a pool deposit (unsigned XDR + tx URI + QR) for the wallet to sign. */
export const POST: APIRoute = async (ctx) => {
  const body = await parseJson(ctx.request, depositLiquidityBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: ApiStatus.BAD_REQUEST });
  }

  const { org, environment, ...rest } = body.data;
  const gate = await requireOrgMember(ctx.request, org);
  if (!gate.ok) return gate.response;
  if (!hasOrgPermission(gate.membership.role, gate.membership.permissions, "payments:create")) {
    return jsonForbidden("You don't have permission to manage liquidity in this organization.");
  }

  try {
    const op = await cosmosLiquidity.deposit(gate.userId, environment, org, {
      source: rest.source,
      assetACode: rest.assetACode,
      assetAIssuer: rest.assetAIssuer,
      assetBCode: rest.assetBCode,
      assetBIssuer: rest.assetBIssuer,
      maxAmountA: rest.maxAmountA,
      maxAmountB: rest.maxAmountB,
      slippageBps: rest.slippageBps,
      memo: rest.memo,
    });

    const loc = await geoLocate(ctx.request.headers, ctx.clientAddress).catch(() => null);
    safeNotify({
      userId: gate.userId,
      type: "liquidity.deposit.created",
      title: "Liquidity deposit created",
      message: `${op.amountA} ${op.assetA === "native" ? "XLM" : op.assetA} + ${op.amountB} ${op.assetB === "native" ? "XLM" : op.assetB} → pool ${op.poolId.slice(0, 8)}…`,
      origin: loc?.origin ?? null,
      country: loc?.country ?? null,
      region: loc?.region ?? null,
      ipAddress: loc?.ip ?? null,
      metadata: { id: op.id, network: op.network, poolId: op.poolId, city: loc?.city ?? null, publicIp: loc?.publicIp ?? null, userAgent: loc?.userAgent ?? null, local: loc?.isLocal ?? false },
    });

    return jsonCreated({ data: op, message: "Liquidity deposit created successfully" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};
