-- The plan's standing (active, paused, past_due, suspended), shown on the dashboard's account card.
-- Every existing account is active, which the default gives it.

-- AlterTable
ALTER TABLE "profile" ADD COLUMN "planStatus" TEXT NOT NULL DEFAULT 'active';
