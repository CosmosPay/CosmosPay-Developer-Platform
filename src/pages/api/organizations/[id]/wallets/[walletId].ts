import { z } from "zod";
import { auth } from "@/lib/auth";
import { jsonError, jsonForbidden, jsonNotFound, jsonSuccess, jsonUnauthorized, parseJson } from "@/lib/http";
import { getMembership } from "@/lib/organizations";
import { hasOrgPermission } from "@/lib/org-permissions";
import { removeOrgWallet, renameOrgWallet } from "@/lib/org-wallets-store";
import { renameWalletBodySchema } from "@/schemas/org-wallets";
import type { APIRoute } from "astro";

const paramsSchema = z.object({ id: z.string().min(1), walletId: z.string().min(1).max(64) });

/* PATCH /api/organizations/:id/wallets/:walletId: rename a wallet (`wallets:edit`). */
export const PATCH: APIRoute = async (ctx) => {
  const session = await auth.api.getSession({ headers: ctx.request.headers });
  if (!session) return jsonUnauthorized("Session required");

  const params = paramsSchema.safeParse(ctx.params);
  if (!params.success) return jsonNotFound("Wallet not found");

  const membership = await getMembership(params.data.id, session.user.id).catch(() => null);
  if (!membership) return jsonNotFound("Organization not found");
  if (!hasOrgPermission(membership.role, membership.permissions, "wallets:edit")) {
    return jsonForbidden("You don't have permission to rename this organization's wallets.");
  }

  const body = await parseJson(ctx.request, renameWalletBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: "bad_request" });
  }
  const wallet = await renameOrgWallet(params.data.id, params.data.walletId, body.data.label).catch(() => undefined);
  if (wallet === undefined) return jsonError({ message: "Failed to rename the wallet", code: 500, status: "internal_error" });
  if (!wallet) return jsonNotFound("Wallet not found");
  return jsonSuccess({ data: wallet, message: "Wallet renamed" });
};

/* DELETE /api/organizations/:id/wallets/:walletId: remove a wallet (`wallets:delete`). Payment
   links already created keep their address; new ones can no longer choose it. */
export const DELETE: APIRoute = async (ctx) => {
  const session = await auth.api.getSession({ headers: ctx.request.headers });
  if (!session) return jsonUnauthorized("Session required");

  const params = paramsSchema.safeParse(ctx.params);
  if (!params.success) return jsonNotFound("Wallet not found");

  const membership = await getMembership(params.data.id, session.user.id).catch(() => null);
  if (!membership) return jsonNotFound("Organization not found");
  if (!hasOrgPermission(membership.role, membership.permissions, "wallets:delete")) {
    return jsonForbidden("You don't have permission to remove this organization's wallets.");
  }

  const removed = await removeOrgWallet(params.data.id, params.data.walletId).catch(() => null);
  if (removed === null) return jsonError({ message: "Failed to remove the wallet", code: 500, status: "internal_error" });
  if (!removed) return jsonNotFound("Wallet not found");
  return jsonSuccess({ data: { id: params.data.walletId }, message: "Wallet removed" });
};
