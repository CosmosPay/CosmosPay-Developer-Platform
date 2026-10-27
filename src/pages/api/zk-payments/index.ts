import { ApiStatus, jsonBadRequest, jsonCreated, jsonError, jsonForbidden, jsonSuccess, parseJson } from "@/lib/http";
import { hasOrgPermission } from "@/lib/org-permissions";
import { orgHasWallet } from "@/lib/org-wallets-store";
import { cosmosCustomers, cosmosZkPayments } from "@/lib/cosmos";
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

/* Create a ZK payment: the payer pays the amount confidentially; the recipient, a customer's private
   account (product owner, 2026-10-27: private accounts are customers' wallets), receives it minus
   the 0.01% commission and the organization's own fee, if any, which goes to one of the
   organization's wallets. Both must hold a confidential account on the token (the API checks it). */
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
  // The recipient is a Stellar wallet of the customer named: never a typed address.
  const { customerId, ...payment } = input;
  const customer = await cosmosCustomers.get(gate.userId, environment, customerId).catch(() => null);
  if (!customer || !(customer.wallets || []).some((w) => w.chain === "stellar" && w.address === payment.recipient)) {
    return jsonBadRequest("The receiving account must be a Stellar wallet of one of the organization's customers.");
  }
  // The organization's own fee goes to one of its wallets, as on a payment link.
  if (payment.merchantFee && !(await orgHasWallet(org, "stellar", payment.merchantFee.wallet).catch(() => false))) {
    return jsonBadRequest("The fee must go to one of the organization's Stellar wallets. Add it in Settings first.");
  }
  try {
    const created = await cosmosZkPayments.create(gate.userId, environment, org, payment);
    return jsonCreated({ data: created, message: "Private payment created successfully" });
  } catch (err) {
    return zkErrorResponse(err);
  }
};
