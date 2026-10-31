-- The wallets an organization receives payments in (Settings, src/lib/org-wallets.ts).

-- CreateTable
CREATE TABLE "organization_wallet" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "label" TEXT,
    "provider" TEXT,
    "addedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_wallet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "organization_wallet_orgId_idx" ON "organization_wallet"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_wallet_orgId_chain_address_key" ON "organization_wallet"("orgId", "chain", "address");

-- AddForeignKey
ALTER TABLE "organization_wallet" ADD CONSTRAINT "organization_wallet_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
