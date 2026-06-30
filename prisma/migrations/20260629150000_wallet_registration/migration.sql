-- CreateTable
CREATE TABLE "wallet_registration" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "stellarAddress" TEXT NOT NULL,
    "verifyToken" TEXT NOT NULL,
    "claimHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "userId" TEXT,
    "organizationId" TEXT,
    "credentialId" TEXT,
    "environment" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_registration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wallet_registration_verifyToken_key" ON "wallet_registration"("verifyToken");

-- CreateIndex
CREATE INDEX "wallet_registration_email_idx" ON "wallet_registration"("email");

-- CreateIndex
CREATE INDEX "wallet_registration_stellarAddress_idx" ON "wallet_registration"("stellarAddress");

-- CreateIndex
CREATE INDEX "wallet_registration_claimHash_idx" ON "wallet_registration"("claimHash");
