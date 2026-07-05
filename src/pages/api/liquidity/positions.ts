import { ApiStatus, jsonError, jsonSuccess } from "@/lib/http";
import { cosmosLiquidity } from "@/lib/cosmos";
import { cosmosErrorResponse, envFromQuery, requireOrgMember } from "./_helpers";
import type { APIRoute } from "astro";

/* An account's pool share positions with redeemable amounts. */
export const GET: APIRoute = async (ctx) => {
  const gate = await requireOrgMember(ctx.request, ctx.url.searchParams.get("org"));
  if (!gate.ok) return gate.response;

  const account = ctx.url.searchParams.get("account");
  if (!account || !/^G[A-Z2-7]{55}$/.test(account)) {
    return jsonError({ message: "A valid Stellar account (G…) is required", code: 400, status: ApiStatus.BAD_REQUEST });
  }

  try {
    const positions = await cosmosLiquidity.positions(gate.userId, envFromQuery(ctx.url), gate.org, account);
    return jsonSuccess({ data: positions, message: "Liquidity positions fetched successfully" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};
