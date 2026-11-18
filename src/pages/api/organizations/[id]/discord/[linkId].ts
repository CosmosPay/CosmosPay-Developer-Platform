import { z } from "zod";
import { requestSession } from "@/lib/request-session";
import { jsonError, jsonForbidden, jsonNotFound, jsonSuccess, jsonUnauthorized } from "@/lib/http";
import { getMembership } from "@/lib/organizations";
import { hasOrgPermission } from "@/lib/org-permissions";
import { discordConfig, discordNotConfigured } from "@/lib/discord-env";
import { deleteBotLink } from "@/lib/discord-http";
import { deleteDiscordLink, findDiscordLink } from "@/lib/discord-links-store";
import { deleteApiKey, apiKeyPresence } from "@/utils/apisix";
import { safeNotify } from "@/lib/notifications";
import { geoLocate } from "@/lib/geo";
import type { APIRoute } from "astro";

const paramsSchema = z.object({ id: z.string().min(1), linkId: z.string().min(1).max(64) });

/* DELETE /api/organizations/:id/discord/:linkId: unlinks a Discord server. Its key is an API key of
   the link's environment, so it asks what revoking one asks (`apiKeysTest:delete` /
   `apiKeysLive:delete`). The bot is told first (best effort: a bot that does not answer, or no
   longer holds the link, does not stop it), then the key is revoked at the gateway, so whatever the
   bot still holds stops working, then the row goes. A key the gateway still holds after a failed
   revoke keeps the row, so the unlink can be asked again. */
export const DELETE: APIRoute = async (ctx) => {
  const session = await requestSession(ctx.request.headers);
  if (!session) return jsonUnauthorized("Session required");
  const config = discordConfig();
  if (!config) return discordNotConfigured();

  const params = paramsSchema.safeParse(ctx.params);
  if (!params.success) return jsonNotFound("Discord server not found");
  const { id: orgId, linkId } = params.data;

  const membership = await getMembership(orgId, session.user.id).catch(() => null);
  if (!membership) return jsonNotFound("Organization not found");

  const link = await findDiscordLink(orgId, linkId).catch(() => undefined);
  if (link === undefined) return jsonError({ message: "Failed to read the Discord server", code: 500, status: "internal_error" });
  if (!link) return jsonNotFound("Discord server not found");

  const resource = link.environment === "prod" ? "apiKeysLive" : "apiKeysTest";
  if (!hasOrgPermission(membership.role, membership.permissions, `${resource}:delete`)) {
    return jsonForbidden("You don't have permission to revoke this kind of API key in this organization.");
  }

  const bot = await deleteBotLink(config, link.guildId);
  if (!bot.ok) console.warn(`[discord] the bot did not confirm unlinking server ${link.guildId}: ${bot.log}`);

  // The key lives on the consumer of the member who linked the server.
  // Fail closed: the row goes only once the gateway confirms the key is gone (deleted, or a 404),
  // never when it could not be asked, or a live key would be left with nobody holding its record.
  const revoked = await deleteApiKey(link.apiKeyId, link.createdById).catch(() => null);
  if (!revoked && (await apiKeyPresence(link.apiKeyId, link.createdById)) !== "absent") {
    console.error(`[discord] failed to revoke the key of server ${link.guildId} (${link.apiKeyId})`);
    return jsonError({ message: "Failed to revoke the server's API key. Try again.", code: 500, status: "internal_error" });
  }

  const removed = await deleteDiscordLink(orgId, linkId).catch(() => null);
  if (removed === null) return jsonError({ message: "Failed to unlink the Discord server", code: 500, status: "internal_error" });

  const loc = await geoLocate(ctx.request.headers, ctx.clientAddress).catch(() => null);
  safeNotify({
    userId: session.user.id,
    type: "apikey.deleted",
    title: "API key revoked",
    message: `Unlinked the Discord server “${link.guildName}”`,
    origin: loc?.origin ?? null,
    country: loc?.country ?? null,
    region: loc?.region ?? null,
    ipAddress: loc?.ip ?? null,
    metadata: { id: link.apiKeyId, environment: link.environment, discordGuildId: link.guildId, city: loc?.city ?? null, publicIp: loc?.publicIp ?? null, userAgent: loc?.userAgent ?? null, local: loc?.isLocal ?? false },
  });

  return jsonSuccess({ data: { id: linkId, apiKeyId: link.apiKeyId }, message: "Discord server unlinked" });
};
