import { ApiStatus, jsonCreated, jsonError, jsonForbidden, parseJson } from "@/lib/http";
import { hasOrgPermission } from "@/lib/org-permissions";
import { cosmosLiquidity } from "@/lib/cosmos";
import { withdrawLiquidityBodySchema } from "@/schemas/liquidity";
import { safeNotify } from "@/lib/notifications";
import { geoLocate } from "@/lib/geo";
import { cosmosErrorResponse, requireOrgMember } from "./_helpers";
import type { APIRoute } from "astro";

/* Build a pool withdrawal (unsigned XDR + tx URI + QR) for the wallet to sign. */
export const POST: APIRoute = async (ctx) => {
  const body = await parseJson(ctx.request, withdrawLiquidityBodySchema).catch(() => null);
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
    const op = await cosmosLiquidity.withdraw(gate.userId, environment, org, {
      source: rest.source,
      poolId: rest.poolId,
      shares: rest.shares,
      slippageBps: rest.slippageBps,
      memo: rest.memo,
    });

    const loc = await geoLocate(ctx.request.headers, ctx.clientAddress).catch(() => null);
    safeNotify({
      userId: gate.userId,
      type: "liquidity.withdraw.created",
      title: "Liquidity withdrawal created",
      message: `${op.shares ?? "?"} shares of pool ${op.poolId.slice(0, 8)}…`,
      origin: loc?.origin ?? null,
      country: loc?.country ?? null,
      region: loc?.region ?? null,
      ipAddress: loc?.ip ?? null,
      metadata: { id: op.id, network: op.network, poolId: op.poolId, city: loc?.city ?? null, publicIp: loc?.publicIp ?? null, userAgent: loc?.userAgent ?? null, local: loc?.isLocal ?? false },
    });

    return jsonCreated({ data: op, message: "Liquidity withdrawal created successfully" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};
