/* Mock mode's live Discord link: with the settings below, "Connect Discord" in the sample
   dashboard goes through the real Discord application and the callback hands a real API key to a
   real bot, so the whole flow can be tried on localhost with no Postgres, Authentik or APISIX.
   The rest stays sample (the organization, its wallets, the list in Settings). No key is minted
   here: COSMOS_MOCK_DISCORD_KEY is a sandbox (`dv_`) or production (`prod_`) key created on a real
   platform, and the bot checks it against the Payments API as it checks any link. Links are made
   only in that key's environment.

   On with DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_BOT_LINK_SECRET (the bot's
   LINK_SECRET), COSMOS_MOCK_DISCORD_KEY and, when the bot is elsewhere, DISCORD_BOT_LINK_URL
   (http://127.0.0.1:3800 by default), in the shell or in .env (scripts/dev-mock.mjs passes them
   on). Discord sends the browser back to http://localhost:<port>/api/integrations/discord/callback:
   the Discord application must list that redirect. */
import { discordConfigFrom, type DiscordConfig, type LinkEnvironment } from "@/lib/discord-link";

export interface MockDiscordLive {
  config: DiscordConfig;
  apiKey: string;
  environment: LinkEnvironment;
}

/* The settings mock mode links with, or null when any is missing (the sample flow then). */
export function mockDiscordLive(env: Record<string, string | undefined> = process.env): MockDiscordLive | null {
  const apiKey = (env.COSMOS_MOCK_DISCORD_KEY ?? "").trim();
  const environment: LinkEnvironment | null = apiKey.startsWith("dv_") ? "dev" : apiKey.startsWith("prod_") ? "prod" : null;
  const port = portOf(env.PUBLIC_BETTER_AUTH_URL);
  if (!environment || !port) return null;
  const config = discordConfigFrom({
    clientId: env.DISCORD_CLIENT_ID,
    clientSecret: env.DISCORD_CLIENT_SECRET,
    botUrl: env.DISCORD_BOT_LINK_URL,
    linkSecret: env.DISCORD_BOT_LINK_SECRET,
    // localhost rather than the mock's dev.cosmospay.localhost: Discord takes an http redirect
    // for localhost, and the platform answers there too.
    platformUrl: `http://localhost:${port}`,
  });
  return config ? { config, apiKey, environment } : null;
}

function portOf(origin: string | undefined): string | null {
  try {
    const url = new URL(origin ?? "");
    return url.port || (url.protocol === "https:" ? "443" : "80");
  } catch {
    return null;
  }
}
