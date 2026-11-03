-- Fix Escalation.status column type
-- The Prisma schema defines status as EscalationStatus enum but the
-- database column was created as text. Convert it to the enum type.
ALTER TABLE "escalations" ALTER COLUMN "status" TYPE "EscalationStatus" USING "status"::"EscalationStatus";
