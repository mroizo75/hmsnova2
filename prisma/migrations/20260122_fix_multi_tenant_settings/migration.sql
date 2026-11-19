-- Migration: Fix multi-tenant settings
-- Problem: Varslingsinnstillinger på User-tabellen overskriver hverandre på tvers av tenants
-- Løsning: Flytt tenant-spesifikke innstillinger fra User til UserTenant

-- Legg til nye kolonner på UserTenant
ALTER TABLE `UserTenant` 
  ADD COLUMN `displayName` VARCHAR(191) NULL AFTER `department`,
  ADD COLUMN `phone` VARCHAR(191) NULL,
  ADD COLUMN `notifyByEmail` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `notifyBySms` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `reminderDaysBefore` INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN `notifyMeetings` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `notifyInspections` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `notifyAudits` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `notifyMeasures` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `notifyIncidents` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `notifyDocuments` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `notifyTraining` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `notifyRisks` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `dailyDigest` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `weeklyDigest` BOOLEAN NOT NULL DEFAULT true;

-- Varslingsfeltene fantes ikke på User i migrasjonshistorikken.
-- UserTenant-kolonnene over har samme standardverdier, så kopien trenger bare navn og telefon.
UPDATE `UserTenant` ut
INNER JOIN `User` u ON ut.userId = u.id
SET
  ut.displayName = u.name,
  ut.phone = u.phone;

-- OBS: Vi beholder kolonnene på User-tabellen for nå for bakoverkompatibilitet
-- De kan fjernes i en senere migrasjon når all kode er oppdatert
