-- Manual migration for production: 2026-09-04
-- Run this on production database before deploying the latest code
-- These columns are required by the updated Prisma client

-- 1. InspectionFinding -> Incident link (vernerunde-funn kobling)
ALTER TABLE `InspectionFinding` ADD COLUMN IF NOT EXISTS `linkedIncidentId` VARCHAR(191) NULL;
CREATE INDEX IF NOT EXISTS `InspectionFinding_linkedIncidentId_idx` ON `InspectionFinding`(`linkedIncidentId`);
-- Note: MySQL < 8.0.16 does not support IF NOT EXISTS for ALTER TABLE ADD COLUMN
-- If you get an error, the column may already exist

-- 2. HandbookSection toggle + external reference
ALTER TABLE `HandbookSection` ADD COLUMN IF NOT EXISTS `isEnabled` BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE `HandbookSection` ADD COLUMN IF NOT EXISTS `externalRef` TEXT NULL;
