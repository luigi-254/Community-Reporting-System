-- Add status column to assignments table
-- The Prisma schema defines status AssignmentStatus @default(ASSIGNED)
-- but the column was missing from the initial migration.
ALTER TABLE "assignments" ADD COLUMN "status" "AssignmentStatus" NOT NULL DEFAULT 'ASSIGNED';
