/* Unlinking a Discord server, the one way every route does it: Settings' unlink
   (src/pages/api/organizations/[id]/discord/[linkId].ts), deleting the organization and removing
   the wallet a link pays to. Server-only.

   The bot is told first (best effort, naming the key the link was made with: a bot that does not
   answer, or no longer holds that link, does not stop it), then the key is revoked at the gateway,
   so whatever the bot still holds stops working, then the row goes. Fail closed: a key the gateway
   still holds after a failed revoke keeps the row, so the unlink can be asked again and no live key
   is left with nobody holding its record. With linking off on this deployment (no configuration)
   the bot cannot be reached, and the key is revoked all the same. */
import { deleteBotLink } from "@/lib/discord-http";
import { deleteDiscordLink, type StoredDiscordLink } from "@/lib/discord-links-store";
import type { DiscordConfig } from "@/lib/discord-link";
import { apiKeyPresence, deleteApiKey } from "@/utils/apisix";

/** Whether the link is gone: its key revoked (or already absent) and its row deleted. */
export async function unlinkDiscordServer(link: StoredDiscordLink, config: DiscordConfig | null): Promise<boolean> {
  if (config) {
    const bot = await deleteBotLink(config, link.guildId, link.apiKeySha256);
    if (!bot.ok) console.warn(`[discord] the bot did not confirm unlinking server ${link.guildId}: ${bot.log}`);
  } else {
    console.warn(`[discord] linking is off here: the bot was not told that server ${link.guildId} is unlinked; its key is revoked`);
  }

  // The key lives on the consumer of the member who linked the server.
  const revoked = await deleteApiKey(link.apiKeyId, link.createdById).catch(() => null);
  if (!revoked && (await apiKeyPresence(link.apiKeyId, link.createdById).catch(() => "unknown")) !== "absent") {
    console.error(`[discord] failed to revoke the key of server ${link.guildId} (${link.apiKeyId})`);
    return false;
  }

  const removed = await deleteDiscordLink(link.orgId, link.id).catch(() => null);
  if (removed === null) {
    console.error(`[discord] revoked the key of server ${link.guildId} but could not delete its link row (${link.id})`);
    return false;
  }
  return true;
}
