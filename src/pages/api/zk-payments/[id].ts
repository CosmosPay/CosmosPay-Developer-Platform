import { jsonNotFound, jsonSuccess } from "@/lib/http";
import { cosmosZkPayments } from "@/lib/cosmos";
import { envFromQuery, requireOrgMember, zkErrorResponse } from "@/pages/api/zk-payments/_helpers";
import type { APIRoute } from "astro";

/* One ZK payment, as the Payments API last saw it. */
export const GET: APIRoute = async (ctx) => {
  const id = ctx.params.id;
  if (!id) return jsonNotFound("ZK payment not found");
  const gate = await requireOrgMember(ctx.request, ctx.url.searchParams.get("org"));
  if (!gate.ok) return gate.response;
  try {
    const payment = await cosmosZkPayments.get(gate.userId, envFromQuery(ctx.url), gate.org, id);
    return jsonSuccess({ data: payment, message: "ZK payment fetched successfully" });
  } catch (err) {
    return zkErrorResponse(err);
  }
};
