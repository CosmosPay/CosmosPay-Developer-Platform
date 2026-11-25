import { z } from "zod";
import { requestSession } from "@/lib/request-session";
import { jsonError, jsonForbidden, jsonNotFound, jsonSuccess, jsonUnauthorized } from "@/lib/http";
import { getMembership } from "@/lib/organizations";
import { hasOrgPermission } from "@/lib/org-permissions";
import { discordConfig, discordNotConfigured } from "@/lib/discord-env";
import { findDiscordLink } from "@/lib/discord-links-store";
import { unlinkDiscordServer } from "@/lib/discord-unlink";
import { safeNotify } from "@/lib/notifications";
import { geoLocate } from "@/lib/geo";
import type { APIRoute } from "astro";

const paramsSchema = z.object({ id: z.string().min(1), linkId: z.string().min(1).max(64) });

/* DELETE /api/organizations/:id/discord/:linkId: unlinks a Discord server. Its key is an API key of
   the link's environment, so it asks what revoking one asks (`apiKeysTest:delete` /
   `apiKeysLive:delete`). src/lib/discord-unlink.ts does it: the bot is told (best effort, naming
   the key the link was made with), the key is revoked at the gateway, then the row goes; a key the
   gateway still holds after a failed revoke keeps the row, so the unlink can be asked again. */
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

  if (!(await unlinkDiscordServer(link, config))) {
    return jsonError({ message: "Failed to revoke the server's API key. Try again.", code: 500, status: "internal_error" });
  }

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
