-- Discord servers linked to an organization (Settings > Discord, src/lib/discord-links-store.ts):
-- the single-use install requests (ten minutes, bound to the member) and the links themselves,
-- one per server.

-- CreateTable
CREATE TABLE "discord_install_request" (
    "state" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "discord_install_request_pkey" PRIMARY KEY ("state")
);

-- CreateTable
CREATE TABLE "discord_link" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "guildName" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "discordUserId" TEXT,
    "discordUsername" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discord_link_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "discord_install_request_orgId_userId_idx" ON "discord_install_request"("orgId", "userId");

-- CreateIndex
CREATE INDEX "discord_install_request_expiresAt_idx" ON "discord_install_request"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "discord_link_guildId_key" ON "discord_link"("guildId");

-- CreateIndex
CREATE INDEX "discord_link_orgId_idx" ON "discord_link"("orgId");

-- AddForeignKey
ALTER TABLE "discord_install_request" ADD CONSTRAINT "discord_install_request_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discord_link" ADD CONSTRAINT "discord_link_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
