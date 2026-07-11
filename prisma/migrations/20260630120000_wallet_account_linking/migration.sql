-- AlterTable: fields for the account-LINKING flow (link an existing account to a wallet
-- via a one-time emailed access code). `kind` defaults to 'register' so existing rows stay
-- valid; `codeHash` holds the SHA-256 of the emailed code; `attempts` caps wrong tries.
ALTER TABLE "wallet_registration" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'register';
ALTER TABLE "wallet_registration" ADD COLUMN "codeHash" TEXT;
ALTER TABLE "wallet_registration" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;
