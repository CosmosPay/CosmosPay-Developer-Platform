-- SEP-30 account recovery: who may ask this server to co-sign a recovery transaction.
-- The signing keys themselves are derived per account (src/lib/recovery-config.ts), so
-- none of them is stored here. See src/lib/recovery.ts.

-- CreateTable
CREATE TABLE "recovery_account" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recovery_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recovery_auth_method" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "identityRole" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recovery_auth_method_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recovery_account_role_address_key" ON "recovery_account"("role", "address");

-- CreateIndex
CREATE INDEX "recovery_auth_method_accountId_idx" ON "recovery_auth_method"("accountId");

-- CreateIndex
CREATE INDEX "recovery_auth_method_type_value_idx" ON "recovery_auth_method"("type", "value");

-- AddForeignKey
ALTER TABLE "recovery_auth_method" ADD CONSTRAINT "recovery_auth_method_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "recovery_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

