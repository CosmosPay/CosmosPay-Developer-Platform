import { z } from "zod";
import { requestSession } from "@/lib/request-session";
import { jsonError, jsonForbidden, jsonNotFound, jsonSuccess, jsonUnauthorized, parseJson } from "@/lib/http";
import { getMembership } from "@/lib/organizations";
import { hasOrgPermission } from "@/lib/org-permissions";
import { removeOrgWallet, renameOrgWallet } from "@/lib/org-wallets-store";
import { discordConfig } from "@/lib/discord-env";
import { discordLinksToWallet } from "@/lib/discord-links-store";
import { unlinkDiscordServer } from "@/lib/discord-unlink";
import { prisma } from "@/lib/prisma";
import { renameWalletBodySchema } from "@/schemas/org-wallets";
import type { APIRoute } from "astro";

const paramsSchema = z.object({ id: z.string().min(1), walletId: z.string().min(1).max(64) });

/* PATCH /api/organizations/:id/wallets/:walletId: rename a wallet (`wallets:edit`). */
export const PATCH: APIRoute = async (ctx) => {
  const session = await requestSession(ctx.request.headers);
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
   links already created keep their address; new ones can no longer choose it. A Discord server
   linked to pay into it is unlinked first (the bot told, its key revoked:
   src/lib/discord-unlink.ts), so the bot stops charging into a wallet the organization dropped;
   that takes the delete permission of the link's key environment too, and without it the wallet
   stays (409, the dashboard says why). */
export const DELETE: APIRoute = async (ctx) => {
  const session = await requestSession(ctx.request.headers);
  if (!session) return jsonUnauthorized("Session required");

  const params = paramsSchema.safeParse(ctx.params);
  if (!params.success) return jsonNotFound("Wallet not found");

  const membership = await getMembership(params.data.id, session.user.id).catch(() => null);
  if (!membership) return jsonNotFound("Organization not found");
  if (!hasOrgPermission(membership.role, membership.permissions, "wallets:delete")) {
    return jsonForbidden("You don't have permission to remove this organization's wallets.");
  }

  const wallet = await prisma.organizationWallet
    .findFirst({ where: { id: params.data.walletId, orgId: params.data.id }, select: { chain: true, address: true } })
    .catch(() => undefined);
  if (wallet === undefined) return jsonError({ message: "Failed to remove the wallet", code: 500, status: "internal_error" });
  if (!wallet) return jsonNotFound("Wallet not found");
  const links = await discordLinksToWallet(params.data.id, wallet.chain, wallet.address).catch(() => null);
  if (links === null) return jsonError({ message: "Failed to remove the wallet", code: 500, status: "internal_error" });
  if (links.some((l) => !hasOrgPermission(membership.role, membership.permissions, `${l.environment === "prod" ? "apiKeysLive" : "apiKeysTest"}:delete`))) {
    return jsonError({
      message: "A linked Discord server pays into this wallet, and unlinking it needs permission to revoke its API key.",
      code: 409,
      status: "conflict",
    });
  }
  if (links.length) {
    const config = discordConfig();
    for (const link of links) {
      if (!(await unlinkDiscordServer(link, config))) {
        return jsonError({ message: "Failed to revoke the API key of a linked Discord server. Try again.", code: 500, status: "internal_error" });
      }
    }
  }

  const removed = await removeOrgWallet(params.data.id, params.data.walletId).catch(() => null);
  if (removed === null) return jsonError({ message: "Failed to remove the wallet", code: 500, status: "internal_error" });
  if (!removed) return jsonNotFound("Wallet not found");
  return jsonSuccess({ data: { id: params.data.walletId, discordUnlinked: links.map((l) => l.id) }, message: "Wallet removed" });
};
