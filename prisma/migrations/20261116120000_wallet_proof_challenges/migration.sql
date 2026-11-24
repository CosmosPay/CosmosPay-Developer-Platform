-- The challenges a wallet signs to be connected to an organization (src/lib/org-wallet-challenges.ts):
-- a random nonce, single use, valid for ten minutes.

-- CreateTable
CREATE TABLE "wallet_proof_challenge" (
    "id" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "address" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "wallet_proof_challenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wallet_proof_challenge_nonce_key" ON "wallet_proof_challenge"("nonce");

-- CreateIndex
CREATE INDEX "wallet_proof_challenge_orgId_userId_idx" ON "wallet_proof_challenge"("orgId", "userId");

-- CreateIndex
CREATE INDEX "wallet_proof_challenge_expiresAt_idx" ON "wallet_proof_challenge"("expiresAt");

-- AddForeignKey
ALTER TABLE "wallet_proof_challenge" ADD CONSTRAINT "wallet_proof_challenge_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
