import { jsonSuccess } from "@/lib/http";
import { cosmosZkPayments } from "@/lib/cosmos";
import { envFromQuery, requireOrgMember, zkErrorResponse } from "@/pages/api/zk-payments/_helpers";
import type { APIRoute } from "astro";

/* The confidential token's setup on the environment's network (contracts, RPC, the auditor id,
   the 0.01% commission and its account): what the dashboard needs to register the merchant's
   confidential account and to show the split of a payment. */
export const GET: APIRoute = async (ctx) => {
  const gate = await requireOrgMember(ctx.request, ctx.url.searchParams.get("org"));
  if (!gate.ok) return gate.response;
  try {
    const config = await cosmosZkPayments.config(gate.userId, envFromQuery(ctx.url), gate.org);
    return jsonSuccess({ data: config, message: "Private payments configuration fetched successfully" });
  } catch (err) {
    return zkErrorResponse(err);
  }
};
