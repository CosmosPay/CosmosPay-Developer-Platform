-- The free "community" plan is no longer offered: new accounts start on "starter".
-- Only the column default changes. Existing rows keep their plan, "community" included
-- (a legacy plan the app still accepts, see src/lib/plans.ts), so nothing is migrated.

-- AlterTable
ALTER TABLE "profile" ALTER COLUMN "plan" SET DEFAULT 'starter';
