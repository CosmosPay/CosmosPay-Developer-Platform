-- The SHA-256 of the key a Discord link was made with (src/lib/discord-link.ts apiKeySha256): the
-- bot's DELETE /links/{guildId} names the link by it, so it unlinks only the link this platform
-- made. The key itself is never stored. Null on links stored before this column.

-- AlterTable
ALTER TABLE "discord_link" ADD COLUMN "apiKeySha256" TEXT;
