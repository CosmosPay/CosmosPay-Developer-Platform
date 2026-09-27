-- The wallet's own sign-in (Google, GitHub, email code) and the encrypted backup it restores.
-- Replaces the Pollar-custodied social login for new wallets: the key is generated on the
-- device, and what this platform keeps is a box sealed there under the person's password.
-- See src/lib/wallet-auth.ts. Three new tables; nothing existing changes.

-- CreateTable
CREATE TABLE "wallet_auth_handshake" (
    "id" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "codeChallenge" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "email" TEXT,
    "name" TEXT,
    "avatar" TEXT,
    "subject" TEXT,
    "error" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_auth_handshake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_login_code" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatar" TEXT,
    "via" TEXT NOT NULL DEFAULT 'email',
    "claimHash" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_login_code_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_backup" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stellarAddress" TEXT NOT NULL,
    "box" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_backup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wallet_auth_handshake_state_key" ON "wallet_auth_handshake"("state");

-- CreateIndex
CREATE INDEX "wallet_auth_handshake_expiresAt_idx" ON "wallet_auth_handshake"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_login_code_claimHash_key" ON "wallet_login_code"("claimHash");

-- CreateIndex
CREATE INDEX "wallet_login_code_email_idx" ON "wallet_login_code"("email");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_backup_userId_key" ON "wallet_backup"("userId");

-- CreateIndex
CREATE INDEX "wallet_backup_stellarAddress_idx" ON "wallet_backup"("stellarAddress");

-- AddForeignKey
ALTER TABLE "wallet_backup" ADD CONSTRAINT "wallet_backup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

