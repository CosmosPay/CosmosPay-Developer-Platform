-- AlterTable: a social login for an email that already has an account no longer links it
-- on the provider's word alone. The Pollar session it earned is held here, sealed, until
-- the code emailed to that account proves the inbox; `kind` = 'social-link' marks those
-- rows. Nullable, so every existing row stays valid.
ALTER TABLE "wallet_registration" ADD COLUMN "sealedPayload" TEXT;
