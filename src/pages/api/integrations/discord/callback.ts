import { requestSession } from "@/lib/request-session";
import { prisma } from "@/lib/prisma";
import { discordConfig } from "@/lib/discord-env";
import {
  DISCORD_KEY_DESCRIPTION,
  DISCORD_KEY_SCOPES,
  discordKeyName,
  isInstallState,
  isSnowflake,
} from "@/lib/discord-link";
import { isBotRefusalCode, outcomeLocation, type BotRefusalCode, type LinkFailureReason } from "@/lib/discord-link-shared";
import { exchangeDiscordCode, postBotLink, readDiscordUser } from "@/lib/discord-http";
import { keyMintRefusal } from "@/lib/discord-link-guard";
import { saveDiscordLink, takeInstallRequest } from "@/lib/discord-links-store";
import { createApiKey, createConsumer, deleteApiKey } from "@/utils/apisix";
import { safeNotify } from "@/lib/notifications";
import { geoLocate } from "@/lib/geo";
import type { APIRoute } from "astro";

/* Where every answer goes: Settings, with the outcome in the address (a path on this origin;
   src/lib/discord-link-shared.ts lists the codes, and the page words each one). */
const linked = () => redirect(outcomeLocation({ linked: true }));
const failed = (reason: LinkFailureReason, detail: BotRefusalCode | null = null) => redirect(outcomeLocation({ linked: false, reason, detail }));

function redirect(location: string): Response {
  return new Response(null, { status: 302, headers: { Location: location, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}

/* GET /api/integrations/discord/callback?code&state&guild_id (or &error=access_denied): where
   Discord sends the browser once the bot was added to a server. The state names the member's
   install request (src/lib/discord-links-store.ts), used up here whatever happens next, so a replay
   finds it used. The server is the one Discord's token answer names, never the `guild_id`
   parameter. The key minted for the organization goes to the bot alone; a link that fails after
   the key was minted revokes it. Errors are logged with their cause and never a secret. */
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
    chain: wallet.chain,
    address: wallet.address,
    asset: request.asset,
    discordUserId: discordUser.id,
    discordUsername: discordUser.name,
    createdById: userId,
  }).catch((err: unknown) => {
    console.error(`[discord] org ${request.orgId}, server ${guild.id}: saving the link failed: ${(err as Error)?.message ?? err}`);
    return null;
  });
  if (!saved) {
    // The bot holds the new key: revoking it leaves that link unable to act until it is linked again.
    await revokeMinted();
    return failed("internal");
  }
  // Linked before (here or to another organization): its key is no longer the bot's. Only an admin
  // of the Discord server can add the bot (Discord requires Manage Server), so moving a server is
  // that server's decision; the member who had linked it hears about it all the same.
  if (saved.replaced && saved.replaced.apiKeyId !== key.id) {
    const old = saved.replaced;
    if (!(await deleteApiKey(old.apiKeyId, old.createdById).catch(() => null))) {
      console.warn(`[discord] could not revoke the previous key of server ${guild.id} (${old.apiKeyId})`);
    }
    if (old.orgId !== request.orgId || old.createdById !== userId) {
      safeNotify({
        userId: old.createdById,
        type: "apikey.deleted",
        title: "Discord server linked again",
        message: `An admin of the Discord server “${old.guildName}” linked it again${old.orgId !== request.orgId ? " to another organization" : ""}; the key it held was revoked.`,
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
  return linked();
};
