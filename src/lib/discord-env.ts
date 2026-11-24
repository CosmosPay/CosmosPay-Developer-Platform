/* The Discord link's settings from the environment (astro.config.mjs: DISCORD_CLIENT_ID,
   DISCORD_CLIENT_SECRET, DISCORD_BOT_LINK_URL, DISCORD_BOT_LINK_SECRET; the redirect URI is the
   platform's own, PUBLIC_BETTER_AUTH_URL). Server-only. Null while linking is off: every Discord
   route then answers 503 `not_configured`, and Settings draws no Discord section. A bot address
   the key may not travel to (`botLinkUrlProblem`: not https off a loopback host, or with a path)
   turns linking off the same way, and says why in the log once. */
import { PUBLIC_BETTER_AUTH_URL } from "astro:env/client";
import { DISCORD_BOT_LINK_SECRET, DISCORD_BOT_LINK_URL, DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET } from "astro:env/server";
import { ApiStatus, jsonError } from "@/lib/http";
import { DEFAULT_BOT_LINK_URL, botLinkUrlProblem, discordConfigFrom, type DiscordConfig } from "@/lib/discord-link";

const BOT_URL_PROBLEMS = {
  not_url: "is not an http(s) address of a host alone (no credentials, query or fragment)",
  not_https: "must be https unless the bot runs on this machine (a loopback host)",
  has_path: "must have no path: the bot checks the signature over its own /links path",
} as const;

let warnedFor: string | null = null;

export function discordConfig(): DiscordConfig | null {
  const botUrl = ((DISCORD_BOT_LINK_URL ?? "").trim() || DEFAULT_BOT_LINK_URL).replace(/\/+$/, "");
  const problem = botLinkUrlProblem(botUrl);
  if (problem && warnedFor !== botUrl && DISCORD_CLIENT_ID && DISCORD_CLIENT_SECRET) {
    warnedFor = botUrl;
    console.error(`[discord] linking is off: DISCORD_BOT_LINK_URL ${BOT_URL_PROBLEMS[problem]}`);
  }
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
