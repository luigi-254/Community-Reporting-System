-- Expand Role enum with research-required roles
ALTER TYPE "Role" ADD VALUE 'FIELD_OFFICER';
ALTER TYPE "Role" ADD VALUE 'TECHNICAL_SUPERVISOR';
ALTER TYPE "Role" ADD VALUE 'TECHNICAL_HEAD';
ALTER TYPE "Role" ADD VALUE 'CHIEF_OFFICER';
ALTER TYPE "Role" ADD VALUE 'CECM';
ALTER TYPE "Role" ADD VALUE 'GOVERNOR';
ALTER TYPE "Role" ADD VALUE 'WARD_ADMIN';
ALTER TYPE "Role" ADD VALUE 'SUBCOUNTY_ADMIN';
ALTER TYPE "Role" ADD VALUE 'DISASTER_MANAGER';
ALTER TYPE "Role" ADD VALUE 'ENFORCEMENT_OFFICER';
ALTER TYPE "Role" ADD VALUE 'DEPARTMENTAL_ADMIN';

-- Expand ReportStatus enum with research-required statuses
ALTER TYPE "ReportStatus" ADD VALUE 'DRAFT';
ALTER TYPE "ReportStatus" ADD VALUE 'NEEDS_MORE_INFO';
ALTER TYPE "ReportStatus" ADD VALUE 'VERIFIED';
ALTER TYPE "ReportStatus" ADD VALUE 'ASSIGNED';
ALTER TYPE "ReportStatus" ADD VALUE 'ACKNOWLEDGED';
ALTER TYPE "ReportStatus" ADD VALUE 'INSPECTION_IN_PROGRESS';
ALTER TYPE "ReportStatus" ADD VALUE 'AWAITING_EXTERNAL_AGENCY';
ALTER TYPE "ReportStatus" ADD VALUE 'RESOLUTION_SUBMITTED';
ALTER TYPE "ReportStatus" ADD VALUE 'AWAITING_CITIZEN_VERIFICATION';
ALTER TYPE "ReportStatus" ADD VALUE 'CLOSED';
ALTER TYPE "ReportStatus" ADD VALUE 'REOPENED';
ALTER TYPE "ReportStatus" ADD VALUE 'DUPLICATE';
ALTER TYPE "ReportStatus" ADD VALUE 'CANCELLED';

-- Expand ResolutionStatus enum
ALTER TYPE "ResolutionStatus" ADD VALUE 'PARTIAL';

-- Create missing enum types not covered by initial migration
CREATE TYPE "VerificationOutcome" AS ENUM ('CONFIRMED', 'REJECTED', 'PARTIAL', 'TIMED_OUT');
CREATE TYPE "EscalationStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');
CREATE TYPE "AssignmentStatus" AS ENUM ('ASSIGNED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REASSIGNED');
CREATE TYPE "FollowUpType" AS ENUM ('NOTE', 'FLAG_INACTIVITY', 'FLAG_ROUTING', 'FLAG_DEADLINE', 'ESCALATION_REQUEST');
CREATE TYPE "OfficialType" AS ENUM ('GOVERNOR', 'CECM', 'CHIEF_OFFICER', 'TECHNICAL_HEAD', 'MP', 'MCA', 'OTHER');

-- Create ReportStatusHistory table
CREATE TABLE "report_status_history" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "fromStatus" "ReportStatus",
    "toStatus" "ReportStatus" NOT NULL,
    "notes" TEXT,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "report_status_history_pkey" PRIMARY KEY ("id")
);

-- Create FieldInspection table
CREATE TABLE "field_inspections" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "officerId" TEXT NOT NULL,
    "findings" TEXT,
    "actionTaken" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "field_inspections_pkey" PRIMARY KEY ("id")
);

-- Create WorkUpdate table
CREATE TABLE "work_updates" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "officerId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "work_updates_pkey" PRIMARY KEY ("id")
);

-- Create ResolutionSubmission table
CREATE TABLE "resolution_submissions" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "status" "ResolutionStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "mediaUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "resolution_submissions_pkey" PRIMARY KEY ("id")
);

-- Create CitizenVerification table
CREATE TABLE "citizen_verifications" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "officerId" TEXT,
    "outcome" "VerificationOutcome" NOT NULL DEFAULT 'CONFIRMED',
    "evidence" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "citizen_verifications_pkey" PRIMARY KEY ("id")
);

-- Create ReportFollowUp table
CREATE TABLE "report_follow_ups" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "type" "FollowUpType" NOT NULL DEFAULT 'NOTE',
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "report_follow_ups_pkey" PRIMARY KEY ("id")
);

-- Create InternalNote table
CREATE TABLE "internal_notes" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'INTERNAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "internal_notes_pkey" PRIMARY KEY ("id")
);

-- Create NotificationDelivery table
CREATE TABLE "notification_deliveries" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'IN_APP',
    "recipientId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- Create UserNotificationPreference table
CREATE TABLE "user_notification_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'IN_APP',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_notification_preferences_pkey" PRIMARY KEY ("id")
);

-- Create SlaPolicy table
CREATE TABLE "sla_policies" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetHours" INTEGER NOT NULL DEFAULT 48,
    "escalateToOfficialId" TEXT,
    "createdById" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sla_policies_pkey" PRIMARY KEY ("id")
);

-- Create Official table
CREATE TABLE "officials" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT,
    "name" TEXT NOT NULL,
    "officialType" "OfficialType" NOT NULL DEFAULT 'OTHER',
    "positionId" TEXT,
    "userId" TEXT,
    "county" TEXT,
    "subCounty" TEXT,
    "ward" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "officials_pkey" PRIMARY KEY ("id")
);

-- Create OrganizationalPosition table
CREATE TABLE "organizational_positions" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "reportsToPositionId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "organizational_positions_pkey" PRIMARY KEY ("id")
);

-- Create OrganizationalAssignment table
CREATE TABLE "organizational_assignments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "positionId" TEXT,
    "countyId" TEXT,
    "subCountyId" TEXT,
    "wardId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "organizational_assignments_pkey" PRIMARY KEY ("id")
);

-- Create DuplicateLink table
CREATE TABLE "duplicate_links" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "duplicateOfId" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "duplicate_links_pkey" PRIMARY KEY ("id")
);

-- Create ReportAttachment table
CREATE TABLE "report_attachments" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "report_attachments_pkey" PRIMARY KEY ("id")
);

-- Conditional column additions for users
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'countyId') THEN
        ALTER TABLE "users" ADD COLUMN "countyId" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'subCountyId') THEN
        ALTER TABLE "users" ADD COLUMN "subCountyId" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'wardId') THEN
        ALTER TABLE "users" ADD COLUMN "wardId" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'departmentId') THEN
        ALTER TABLE "users" ADD COLUMN "departmentId" TEXT;
    END IF;
END $$;

-- Conditional column additions for reports
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'countyId') THEN
        ALTER TABLE "reports" ADD COLUMN "countyId" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'subCountyId') THEN
        ALTER TABLE "reports" ADD COLUMN "subCountyId" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'wardId') THEN
        ALTER TABLE "reports" ADD COLUMN "wardId" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'categoryId') THEN
        ALTER TABLE "reports" ADD COLUMN "categoryId" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'subcategoryId') THEN
        ALTER TABLE "reports" ADD COLUMN "subcategoryId" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'departmentId') THEN
        ALTER TABLE "reports" ADD COLUMN "departmentId" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'resolutionNotes') THEN
        ALTER TABLE "reports" ADD COLUMN "resolutionNotes" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'resolutionMediaUrls') THEN
        ALTER TABLE "reports" ADD COLUMN "resolutionMediaUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'resolvedAt') THEN
        ALTER TABLE "reports" ADD COLUMN "resolvedAt" TIMESTAMP(3);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'resolutionStatus') THEN
        ALTER TABLE "reports" ADD COLUMN "resolutionStatus" "ResolutionStatus";
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'citizenFeedback') THEN
        ALTER TABLE "reports" ADD COLUMN "citizenFeedback" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'rejectionReason') THEN
        ALTER TABLE "reports" ADD COLUMN "rejectionReason" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'referenceCode') THEN
        ALTER TABLE "reports" ADD COLUMN "referenceCode" TEXT;
    END IF;
END $$;

-- Conditional column additions for categories
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'departmentId') THEN
        ALTER TABLE "categories" ADD COLUMN "departmentId" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'icon') THEN
        ALTER TABLE "categories" ADD COLUMN "icon" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'displayOrder') THEN
        ALTER TABLE "categories" ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;

-- Conditional column additions for subcategories
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subcategories' AND column_name = 'code') THEN
        ALTER TABLE "subcategories" ADD COLUMN "code" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subcategories' AND column_name = 'description') THEN
        ALTER TABLE "subcategories" ADD COLUMN "description" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subcategories' AND column_name = 'isOther') THEN
        ALTER TABLE "subcategories" ADD COLUMN "isOther" BOOLEAN NOT NULL DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subcategories' AND column_name = 'displayOrder') THEN
        ALTER TABLE "subcategories" ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subcategories' AND column_name = 'defaultPriority') THEN
        ALTER TABLE "subcategories" ADD COLUMN "defaultPriority" "ReportPriority" NOT NULL DEFAULT 'MEDIUM';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subcategories' AND column_name = 'slaHours') THEN
        ALTER TABLE "subcategories" ADD COLUMN "slaHours" INTEGER NOT NULL DEFAULT 48;
    END IF;
END $$;

-- Add unique constraints (conditional - check both pg_constraint and pg_indexes)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'categories' AND indexname = 'categories_code_key') THEN
        ALTER TABLE "categories" ADD CONSTRAINT "categories_code_key" UNIQUE ("code");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'subcategories' AND indexname = 'subcategories_code_key') THEN
        ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_code_key" UNIQUE ("code");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'subcategories' AND indexname = 'subcategories_categoryId_name_key') THEN
        ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_categoryId_name_key" UNIQUE ("categoryId", "name");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'reports' AND indexname = 'reports_referenceCode_key') THEN
        ALTER TABLE "reports" ADD CONSTRAINT "reports_referenceCode_key" UNIQUE ("referenceCode");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'sla_policies' AND indexname = 'sla_policies_code_key') THEN
        ALTER TABLE "sla_policies" ADD CONSTRAINT "sla_policies_code_key" UNIQUE ("code");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'organizational_positions' AND indexname = 'organizational_positions_code_key') THEN
        ALTER TABLE "organizational_positions" ADD CONSTRAINT "organizational_positions_code_key" UNIQUE ("code");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'user_notification_preferences' AND indexname = 'user_notification_preferences_userId_channel_key') THEN
        ALTER TABLE "user_notification_preferences" ADD CONSTRAINT "user_notification_preferences_userId_channel_key" UNIQUE ("userId", "channel");
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS "report_status_history_reportId_createdAt_idx" ON "report_status_history"("reportId", "createdAt");
CREATE INDEX IF NOT EXISTS "field_inspections_reportId_idx" ON "field_inspections"("reportId");
CREATE INDEX IF NOT EXISTS "work_updates_reportId_idx" ON "work_updates"("reportId");
CREATE INDEX IF NOT EXISTS "resolution_submissions_reportId_idx" ON "resolution_submissions"("reportId");
CREATE INDEX IF NOT EXISTS "citizen_verifications_reportId_idx" ON "citizen_verifications"("reportId");
CREATE INDEX IF NOT EXISTS "report_follow_ups_reportId_idx" ON "report_follow_ups"("reportId");
CREATE INDEX IF NOT EXISTS "internal_notes_reportId_idx" ON "internal_notes"("reportId");
CREATE INDEX IF NOT EXISTS "notification_deliveries_notificationId_idx" ON "notification_deliveries"("notificationId");
CREATE INDEX IF NOT EXISTS "sla_policies_code_idx" ON "sla_policies"("code");
CREATE INDEX IF NOT EXISTS "officials_departmentId_idx" ON "officials"("departmentId");
CREATE INDEX IF NOT EXISTS "officials_positionId_idx" ON "officials"("positionId");
CREATE INDEX IF NOT EXISTS "officials_county_subCounty_ward_idx" ON "officials"("county", "subCounty", "ward");
CREATE INDEX IF NOT EXISTS "organizational_positions_departmentId_idx" ON "organizational_positions"("departmentId");
CREATE INDEX IF NOT EXISTS "organizational_assignments_userId_idx" ON "organizational_assignments"("userId");
CREATE INDEX IF NOT EXISTS "duplicate_links_reportId_idx" ON "duplicate_links"("reportId");
CREATE INDEX IF NOT EXISTS "duplicate_links_duplicateOfId_idx" ON "duplicate_links"("duplicateOfId");
CREATE INDEX IF NOT EXISTS "report_attachments_reportId_idx" ON "report_attachments"("reportId");

-- Add foreign keys (conditional)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'report_status_history_reportId_fkey') THEN
        ALTER TABLE "report_status_history" ADD CONSTRAINT "report_status_history_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'report_status_history_actorId_fkey') THEN
        ALTER TABLE "report_status_history" ADD CONSTRAINT "report_status_history_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'field_inspections_reportId_fkey') THEN
        ALTER TABLE "field_inspections" ADD CONSTRAINT "field_inspections_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'field_inspections_officerId_fkey') THEN
        ALTER TABLE "field_inspections" ADD CONSTRAINT "field_inspections_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'work_updates_reportId_fkey') THEN
        ALTER TABLE "work_updates" ADD CONSTRAINT "work_updates_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'work_updates_officerId_fkey') THEN
        ALTER TABLE "work_updates" ADD CONSTRAINT "work_updates_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'resolution_submissions_reportId_fkey') THEN
        ALTER TABLE "resolution_submissions" ADD CONSTRAINT "resolution_submissions_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'resolution_submissions_submittedById_fkey') THEN
        ALTER TABLE "resolution_submissions" ADD CONSTRAINT "resolution_submissions_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'citizen_verifications_reportId_fkey') THEN
        ALTER TABLE "citizen_verifications" ADD CONSTRAINT "citizen_verifications_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'citizen_verifications_officerId_fkey') THEN
        ALTER TABLE "citizen_verifications" ADD CONSTRAINT "citizen_verifications_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'report_follow_ups_reportId_fkey') THEN
        ALTER TABLE "report_follow_ups" ADD CONSTRAINT "report_follow_ups_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'report_follow_ups_createdById_fkey') THEN
        ALTER TABLE "report_follow_ups" ADD CONSTRAINT "report_follow_ups_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'internal_notes_reportId_fkey') THEN
        ALTER TABLE "internal_notes" ADD CONSTRAINT "internal_notes_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'internal_notes_authorId_fkey') THEN
        ALTER TABLE "internal_notes" ADD CONSTRAINT "internal_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'notification_deliveries_notificationId_fkey') THEN
        ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_notification_preferences_userId_fkey') THEN
        ALTER TABLE "user_notification_preferences" ADD CONSTRAINT "user_notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'sla_policies_escalateToOfficialId_fkey') THEN
        ALTER TABLE "sla_policies" ADD CONSTRAINT "sla_policies_escalateToOfficialId_fkey" FOREIGN KEY ("escalateToOfficialId") REFERENCES "officials"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'sla_policies_createdById_fkey') THEN
        ALTER TABLE "sla_policies" ADD CONSTRAINT "sla_policies_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'officials_departmentId_fkey') THEN
        ALTER TABLE "officials" ADD CONSTRAINT "officials_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'officials_positionId_fkey') THEN
        ALTER TABLE "officials" ADD CONSTRAINT "officials_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "organizational_positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'officials_userId_fkey') THEN
        ALTER TABLE "officials" ADD CONSTRAINT "officials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'organizational_positions_departmentId_fkey') THEN
        ALTER TABLE "organizational_positions" ADD CONSTRAINT "organizational_positions_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'organizational_positions_reportsToPositionId_fkey') THEN
        ALTER TABLE "organizational_positions" ADD CONSTRAINT "organizational_positions_reportsToPositionId_fkey" FOREIGN KEY ("reportsToPositionId") REFERENCES "organizational_positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'organizational_assignments_userId_fkey') THEN
        ALTER TABLE "organizational_assignments" ADD CONSTRAINT "organizational_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'organizational_assignments_positionId_fkey') THEN
        ALTER TABLE "organizational_assignments" ADD CONSTRAINT "organizational_assignments_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "organizational_positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'organizational_assignments_countyId_fkey') THEN
        ALTER TABLE "organizational_assignments" ADD CONSTRAINT "organizational_assignments_countyId_fkey" FOREIGN KEY ("countyId") REFERENCES "counties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'organizational_assignments_subCountyId_fkey') THEN
        ALTER TABLE "organizational_assignments" ADD CONSTRAINT "organizational_assignments_subCountyId_fkey" FOREIGN KEY ("subCountyId") REFERENCES "sub_counties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'organizational_assignments_wardId_fkey') THEN
        ALTER TABLE "organizational_assignments" ADD CONSTRAINT "organizational_assignments_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "wards"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'duplicate_links_reportId_fkey') THEN
        ALTER TABLE "duplicate_links" ADD CONSTRAINT "duplicate_links_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'duplicate_links_duplicateOfId_fkey') THEN
        ALTER TABLE "duplicate_links" ADD CONSTRAINT "duplicate_links_duplicateOfId_fkey" FOREIGN KEY ("duplicateOfId") REFERENCES "reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'report_attachments_reportId_fkey') THEN
        ALTER TABLE "report_attachments" ADD CONSTRAINT "report_attachments_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'users_countyId_fkey') THEN
        ALTER TABLE "users" ADD CONSTRAINT "users_countyId_fkey" FOREIGN KEY ("countyId") REFERENCES "counties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'users_subCountyId_fkey') THEN
        ALTER TABLE "users" ADD CONSTRAINT "users_subCountyId_fkey" FOREIGN KEY ("subCountyId") REFERENCES "sub_counties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'users_wardId_fkey') THEN
        ALTER TABLE "users" ADD CONSTRAINT "users_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "wards"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'users_departmentId_fkey') THEN
        ALTER TABLE "users" ADD CONSTRAINT "users_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'reports_countyId_fkey') THEN
        ALTER TABLE "reports" ADD CONSTRAINT "reports_countyId_fkey" FOREIGN KEY ("countyId") REFERENCES "counties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'reports_subCountyId_fkey') THEN
        ALTER TABLE "reports" ADD CONSTRAINT "reports_subCountyId_fkey" FOREIGN KEY ("subCountyId") REFERENCES "sub_counties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'reports_wardId_fkey') THEN
        ALTER TABLE "reports" ADD CONSTRAINT "reports_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "wards"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'reports_categoryId_fkey') THEN
        ALTER TABLE "reports" ADD CONSTRAINT "reports_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'reports_subcategoryId_fkey') THEN
        ALTER TABLE "reports" ADD CONSTRAINT "reports_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "subcategories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'reports_departmentId_fkey') THEN
        ALTER TABLE "reports" ADD CONSTRAINT "reports_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'categories_departmentId_fkey') THEN
        ALTER TABLE "categories" ADD CONSTRAINT "categories_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'subcategories_categoryId_fkey') THEN
        ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
