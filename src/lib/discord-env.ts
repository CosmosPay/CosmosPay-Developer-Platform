/* The Discord link's settings from the environment (astro.config.mjs: DISCORD_CLIENT_ID,
   DISCORD_CLIENT_SECRET, DISCORD_BOT_LINK_URL, DISCORD_BOT_LINK_SECRET; the redirect URI is the
   platform's own, PUBLIC_BETTER_AUTH_URL). Server-only. Null while linking is off: every Discord
   route then answers 503 `not_configured`, and Settings draws no Discord section. */
import { PUBLIC_BETTER_AUTH_URL } from "astro:env/client";
import { DISCORD_BOT_LINK_SECRET, DISCORD_BOT_LINK_URL, DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET } from "astro:env/server";
import { ApiStatus, jsonError } from "@/lib/http";
import { discordConfigFrom, type DiscordConfig } from "@/lib/discord-link";

export function discordConfig(): DiscordConfig | null {
  return discordConfigFrom({
    clientId: DISCORD_CLIENT_ID,
    clientSecret: DISCORD_CLIENT_SECRET,
    botUrl: DISCORD_BOT_LINK_URL,
    linkSecret: DISCORD_BOT_LINK_SECRET,
    platformUrl: PUBLIC_BETTER_AUTH_URL,
  });
}

/** The answer of every Discord route while linking is off. */
export function discordNotConfigured(): Response {
  return jsonError({ code: 503, status: ApiStatus.NOT_CONFIGURED, message: "Discord linking is not configured on this server." });
}
