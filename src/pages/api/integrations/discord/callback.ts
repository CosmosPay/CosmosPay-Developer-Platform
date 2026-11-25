import { requestSession } from "@/lib/request-session";
import { prisma } from "@/lib/prisma";
import { discordConfig } from "@/lib/discord-env";
import {
  DISCORD_KEY_DESCRIPTION,
  DISCORD_KEY_SCOPES,
  apiKeySha256,
  discordKeyName,
  isInstallState,
  isSnowflake,
  relinkRefusal,
} from "@/lib/discord-link";
import { isBotRefusalCode, outcomeLocation, type BotRefusalCode, type LinkFailureReason } from "@/lib/discord-link-shared";
import { exchangeDiscordCode, postBotLink, readDiscordUser } from "@/lib/discord-http";
import { keyMintRefusal } from "@/lib/discord-link-guard";
import { LinkedElsewhereError, findDiscordLinkByGuild, saveDiscordLink, takeInstallRequest } from "@/lib/discord-links-store";
import { getMembership } from "@/lib/organizations";
import { hasOrgPermission } from "@/lib/org-permissions";
import { apiKeyPresence, createApiKey, createConsumer, deleteApiKey } from "@/utils/apisix";
import { safeNotify } from "@/lib/notifications";
import { geoLocate } from "@/lib/geo";
import type { APIRoute } from "astro";

/* Where every answer goes: Settings, with the outcome in the address (a path on this origin;
   src/lib/discord-link-shared.ts lists the codes, and the page words each one). */
const linked = (oldKeyKept = false) => redirect(outcomeLocation({ linked: true, warning: oldKeyKept ? "old_key_kept" : null }));
const failed = (reason: LinkFailureReason, detail: BotRefusalCode | null = null) => redirect(outcomeLocation({ linked: false, reason, detail }));

function redirect(location: string): Response {
  return new Response(null, { status: 302, headers: { Location: location, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}

/* GET /api/integrations/discord/callback?code&state&guild_id (or &error=access_denied): where
   Discord sends the browser once the bot was added to a server. The state names the member's
   install request (src/lib/discord-links-store.ts), used up here whatever happens next, so a replay
   finds it used. The server is the one Discord's token answer names, never the `guild_id`
   parameter. A server linked to another organization is refused until it is unlinked there, and
   replacing this organization's own link takes the permission to revoke its key (`relinkRefusal`),
   both before any key is minted. The key minted for the organization goes to the bot alone; a link
   that fails after the key was minted revokes it. The previous key of a replaced link is revoked,
   and when that fails the member is told (a warning on Settings and a notification) instead of the
   failure staying in the log. Errors are logged with their cause and never a secret. */
export const GET: APIRoute = async (ctx) => {
  const config = discordConfig();
  if (!config) return failed("not_configured");

  const session = await requestSession(ctx.request.headers);
  if (!session) {
    // Signed out meanwhile: the request is bound to the member, so it cannot finish. Sign in, then
    // Settings says so.
    return redirect(`/login?next=${encodeURIComponent(outcomeLocation({ linked: false, reason: "expired", detail: null }))}`);
  }
  const userId = session.user.id;
  const query = ctx.url.searchParams;

  const state = query.get("state");
  if (!isInstallState(state)) return failed(query.get("error") ? "denied" : "expired");
  const taken = await takeInstallRequest(state, userId).catch((err: unknown) => {
    console.error(`[discord] failed to read an install request: ${(err as Error)?.message ?? err}`);
    return null;
  });
  if (!taken) return failed("internal");
  if (!taken.ok) {
    if (taken.problem === "other_user") console.warn(`[discord] user ${userId} brought back another member's install request`);
    return failed(query.get("error") ? "denied" : "expired");
  }
  const request = taken.request;
  // The person cancelled on Discord (`access_denied`) or Discord refused: the request is used up.
  if (query.get("error")) return failed("denied");
  const code = query.get("code");
  if (!code || code.length > 512) return failed("discord_error");

  // The member's role or the plan may have changed while Discord was open.
  const refusal = await keyMintRefusal(request.orgId, userId, request.environment).catch(() => "error" as const);
  if (refusal === "error") return failed("internal");
  if (refusal === "not_member" || refusal === "forbidden") return failed("forbidden");
  if (refusal) return failed("key_limit");

  const wallet = await prisma.organizationWallet
    .findFirst({ where: { id: request.walletId, orgId: request.orgId }, select: { chain: true, address: true } })
    .catch(() => undefined);
  if (wallet === undefined) return failed("internal");
  if (!wallet) return failed("wallet_missing");

  const token = await exchangeDiscordCode(config, code);
  if (!token.ok) {
    console.error(`[discord] org ${request.orgId}: ${token.log}`);
    return failed("discord_error");
  }
  const guild = token.guild;
  const hinted = query.get("guild_id");
  if (hinted && isSnowflake(hinted) && hinted !== guild.id) {
    console.warn(`[discord] org ${request.orgId}: the callback named server ${hinted}, Discord's token names ${guild.id}; using Discord's`);
  }
  // A server already linked: another organization's link is never taken over, and replacing this
  // organization's own takes what revoking its key takes.
  const existing = await findDiscordLinkByGuild(guild.id).catch(() => undefined);
  if (existing === undefined) return failed("internal");
  if (existing) {
    const membership = await getMembership(request.orgId, userId).catch(() => null);
    if (!membership) return failed("forbidden");
    const refusal = relinkRefusal(existing, request.orgId, (env) =>
      hasOrgPermission(membership.role, membership.permissions, `${env === "prod" ? "apiKeysLive" : "apiKeysTest"}:delete`),
    );
    if (refusal) {
      console.warn(`[discord] org ${request.orgId}: server ${guild.id} not linked (${refusal}; linked to org ${existing.orgId})`);
      return failed(refusal);
    }
  }
  const discordUser = await readDiscordUser(token.accessToken);

  // The key the bot will hold: the organization's, in the request's environment, on this member's
  // consumer (the API keys list shows it to them as "Discord: <server>").
  const consumer = await createConsumer(userId).catch(() => null);
  const key = consumer
    ? await createApiKey(userId, request.environment, DISCORD_KEY_SCOPES, "user", discordKeyName(guild.name), DISCORD_KEY_DESCRIPTION, request.orgId).catch((err: unknown) => {
        console.error(`[discord] org ${request.orgId}: minting the key failed: ${(err as Error)?.message ?? err}`);
        return null;
      })
    : null;
  if (!key) {
    console.error(`[discord] org ${request.orgId}: could not mint the key for server ${guild.id}`);
    return failed("internal");
  }
  const revokeMinted = async () => {
    if (!(await deleteApiKey(key.id, userId).catch(() => null))) console.error(`[discord] could not revoke the key minted for server ${guild.id} (${key.id})`);
  };

  const bot = await postBotLink(config, {
    guildId: guild.id,
    apiKey: key.apiKey,
    chain: wallet.chain,
    address: wallet.address,
    asset: request.asset,
    linkedBy: { discordUserId: discordUser.id, name: discordUser.name },
  });
  if (!bot.ok) {
    console.error(`[discord] org ${request.orgId}, server ${guild.id}: the bot ${bot.log}`);
    await revokeMinted();
    return bot.reason === "bot_refused" ? failed("bot_refused", isBotRefusalCode(bot.detail) ? bot.detail : null) : failed("bot_unreachable");
  }

  const saved = await saveDiscordLink({
    orgId: request.orgId,
    guildId: guild.id,
    guildName: guild.name,
    environment: request.environment,
    apiKeyId: key.id,
    apiKeySha256: apiKeySha256(key.apiKey),
    chain: wallet.chain,
    address: wallet.address,
    asset: request.asset,
    discordUserId: discordUser.id,
    discordUsername: discordUser.name,
    createdById: userId,
  }).catch((err: unknown) => {
    if (err instanceof LinkedElsewhereError) return "elsewhere" as const;
    console.error(`[discord] org ${request.orgId}, server ${guild.id}: saving the link failed: ${(err as Error)?.message ?? err}`);
    return null;
  });
  if (saved === "elsewhere") {
    // Another organization linked the server between the check above and here. The bot already
    // took the new key, which is revoked now: that server needs linking again by its organization.
    console.error(`[discord] org ${request.orgId}: server ${guild.id} was linked to another organization meanwhile; the bot holds a revoked key until it is linked again`);
    await revokeMinted();
    return failed("linked_elsewhere");
  }
  if (!saved) {
    // The bot holds the new key: revoking it leaves that link unable to act until it is linked again.
    await revokeMinted();
    return failed("internal");
  }
  // This organization's link replaced: its key is no longer the bot's. A key the gateway still
  // holds after a failed revoke is never left silent: the member is told on Settings and in a
  // notification, and so is whoever made the old link, to revoke it in API keys.
  let oldKeyKept = false;
  if (saved.replaced && saved.replaced.apiKeyId !== key.id) {
    const old = saved.replaced;
    const revoked = await deleteApiKey(old.apiKeyId, old.createdById).catch(() => null);
    if (!revoked && (await apiKeyPresence(old.apiKeyId, old.createdById).catch(() => "unknown")) !== "absent") {
      oldKeyKept = true;
      console.error(`[discord] org ${request.orgId}: could not revoke the previous key of server ${guild.id} (${old.apiKeyId}); it is still live`);
    }
    const keptNote = `The key it held (“${discordKeyName(old.guildName)}”) could not be revoked: revoke it in API keys.`;
    if (oldKeyKept) {
      safeNotify({
        userId,
        type: "apikey.deleted",
        title: "Previous Discord key still active",
        message: `Linked the Discord server “${guild.name}” again. ${keptNote}`,
        origin: null,
        country: null,
        region: null,
        ipAddress: null,
        metadata: { id: old.apiKeyId, environment: old.environment, discordGuildId: guild.id },
      });
    }
    if (old.createdById !== userId) {
      safeNotify({
        userId: old.createdById,
        type: "apikey.deleted",
        title: "Discord server linked again",
        message: `The Discord server “${old.guildName}” was linked again in your organization. ${oldKeyKept ? keptNote : "The key it held was revoked."}`,
        origin: null,
        country: null,
        region: null,
        ipAddress: null,
        metadata: { id: old.apiKeyId, environment: old.environment, discordGuildId: guild.id },
      });
    }
  }

  const loc = await geoLocate(ctx.request.headers, ctx.clientAddress).catch(() => null);
  safeNotify({
    userId,
    type: "apikey.created",
    title: "API key created",
    message: `Linked the Discord server “${guild.name}”`,
    origin: loc?.origin ?? null,
    country: loc?.country ?? null,
    region: loc?.region ?? null,
    ipAddress: loc?.ip ?? null,
    metadata: { id: key.id, environment: request.environment, role: "user", discordGuildId: guild.id, city: loc?.city ?? null, publicIp: loc?.publicIp ?? null, userAgent: loc?.userAgent ?? null, local: loc?.isLocal ?? false },
  });
  return linked(oldKeyKept);
};
