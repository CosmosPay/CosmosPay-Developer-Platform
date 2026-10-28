import { ApiStatus, jsonError, jsonForbidden, jsonNotFound, jsonSuccess, parseJson } from "@/lib/http";
import { hasOrgPermission } from "@/lib/org-permissions";
import { cosmosUsdt0 } from "@/lib/cosmos";
import { usdt0SubmitBodySchema } from "@/schemas/usdt0";
import { cosmosErrorResponse, envFromQuery, requireOrgMember } from "@/pages/api/usdt0/_helpers";
import type { APIRoute } from "astro";

/* Send the transfer's signed transaction: the Payments API checks it is the one it built, submits
   it and keeps the LayerZero message's id to follow it. */
export const POST: APIRoute = async (ctx) => {
  const id = ctx.params.id;
  if (!id) return jsonNotFound("USDT0 transfer not found");
  const body = await parseJson(ctx.request, usdt0SubmitBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: ApiStatus.BAD_REQUEST });
  }
  const gate = await requireOrgMember(ctx.request, ctx.url.searchParams.get("org"));
  if (!gate.ok) return gate.response;
  if (!hasOrgPermission(gate.membership.role, gate.membership.permissions, "payments:create")) {
    return jsonForbidden("You don't have permission to move funds in this organization.");
  }
  try {
    const outcome = await cosmosUsdt0.submit(gate.userId, envFromQuery(ctx.url), gate.org, id, body.data.signedXdr);
    return jsonSuccess({ data: outcome, message: outcome.submitted ? "USDT0 transfer submitted" : "USDT0 transfer not submitted" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};
