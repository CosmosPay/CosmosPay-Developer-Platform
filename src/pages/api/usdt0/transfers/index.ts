import { ApiStatus, jsonCreated, jsonError, jsonForbidden, jsonSuccess, parseJson } from "@/lib/http";
import { hasOrgPermission } from "@/lib/org-permissions";
import { cosmosUsdt0 } from "@/lib/cosmos";
import { usdt0TransferBodySchema } from "@/schemas/usdt0";
import { cosmosErrorResponse, envFromQuery, requireOrgMember } from "@/pages/api/usdt0/_helpers";
import type { APIRoute } from "astro";

/* The organization's USDT0 transfers out of Stellar. */
export const GET: APIRoute = async (ctx) => {
  const gate = await requireOrgMember(ctx.request, ctx.url.searchParams.get("org"));
  if (!gate.ok) return gate.response;
  const status = ctx.url.searchParams.get("status") || undefined;
  const take = Number(ctx.url.searchParams.get("take")) || undefined;
  const skip = Number(ctx.url.searchParams.get("skip")) || undefined;
  try {
    const list = await cosmosUsdt0.list(gate.userId, envFromQuery(ctx.url), gate.org, { status, take, skip });
    return jsonSuccess({ data: list, message: "USDT0 transfers fetched successfully" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};

/* Build a USDT0 transfer: the unsigned Soroban transaction the source signs in its wallet. */
export const POST: APIRoute = async (ctx) => {
  const body = await parseJson(ctx.request, usdt0TransferBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: ApiStatus.BAD_REQUEST });
  }
  const { org, environment, ...input } = body.data;
  const gate = await requireOrgMember(ctx.request, org);
  if (!gate.ok) return gate.response;
  if (!hasOrgPermission(gate.membership.role, gate.membership.permissions, "payments:create")) {
    return jsonForbidden("You don't have permission to move funds in this organization.");
  }
  try {
    const transfer = await cosmosUsdt0.create(gate.userId, environment, org, input);
    return jsonCreated({ data: transfer, message: "USDT0 transfer created successfully" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};
