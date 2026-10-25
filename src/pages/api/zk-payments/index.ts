import { ApiStatus, jsonBadRequest, jsonCreated, jsonError, jsonForbidden, jsonSuccess, parseJson } from "@/lib/http";
import { hasOrgPermission } from "@/lib/org-permissions";
import { orgHasWallet } from "@/lib/org-wallets-store";
import { cosmosZkPayments } from "@/lib/cosmos";
import { createZkPaymentBodySchema } from "@/schemas/zk-payments";
import { envFromQuery, requireOrgMember, zkErrorResponse } from "@/pages/api/zk-payments/_helpers";
import type { APIRoute } from "astro";

/* List the organization's ZK payments. */
export const GET: APIRoute = async (ctx) => {
  const gate = await requireOrgMember(ctx.request, ctx.url.searchParams.get("org"));
  if (!gate.ok) return gate.response;
  const status = ctx.url.searchParams.get("status") || undefined;
  const take = Number(ctx.url.searchParams.get("take")) || undefined;
  const skip = Number(ctx.url.searchParams.get("skip")) || undefined;
  try {
    const list = await cosmosZkPayments.list(gate.userId, envFromQuery(ctx.url), gate.org, { status, take, skip });
    return jsonSuccess({ data: list, message: "Private payments fetched successfully" });
  } catch (err) {
    return zkErrorResponse(err);
  }
};

/* Create a ZK payment: the payer pays the amount confidentially; the merchant receives it minus
   the 0.01% commission. The recipient must hold a confidential account on the token. */
export const POST: APIRoute = async (ctx) => {
  const body = await parseJson(ctx.request, createZkPaymentBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: ApiStatus.BAD_REQUEST });
  }
  const { org, environment, ...input } = body.data;
  const gate = await requireOrgMember(ctx.request, org);
  if (!gate.ok) return gate.response;
  if (!hasOrgPermission(gate.membership.role, gate.membership.permissions, "payments:create")) {
    return jsonForbidden("You don't have permission to create payments in this organization.");
  }
  // As for payment links: the recipient is one of the organization's Stellar wallets.
  if (!(await orgHasWallet(org, "stellar", input.recipient).catch(() => false))) {
    return jsonBadRequest("The receiving account must be one of the organization's wallets. Connect it in Settings first.");
  }
  try {
    const payment = await cosmosZkPayments.create(gate.userId, environment, org, input);
    return jsonCreated({ data: payment, message: "Private payment created successfully" });
  } catch (err) {
    return zkErrorResponse(err);
  }
};
