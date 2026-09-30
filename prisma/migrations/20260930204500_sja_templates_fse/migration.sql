-- FSE § 10: strukturerte arbeidsforutsetninger og sporbar deltakerbekreftelse.
ALTER TABLE `SjaTemplate`
  ADD COLUMN `electricalWorkType` ENUM('NOT_APPLICABLE', 'DE_ENERGIZED', 'NEAR_LIVE', 'LIVE_LOW_VOLTAGE', 'HIGH_VOLTAGE') NOT NULL DEFAULT 'NOT_APPLICABLE',
  ADD COLUMN `workMethod` TEXT NULL,
  ADD COLUMN `requiredEquipment` TEXT NULL,
  ADD COLUMN `requiredPpe` TEXT NULL,
  ADD COLUMN `personnelRequirements` TEXT NULL,
  ADD COLUMN `safetyConditions` TEXT NULL,
  ADD COLUMN `requiresSecondPerson` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `requiredCourseKeys` TEXT NULL;

ALTER TABLE `SjaAnalysis`
  ADD COLUMN `templateSnapshot` LONGTEXT NULL,
  ADD COLUMN `contentVersion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ADD COLUMN `electricalWorkType` ENUM('NOT_APPLICABLE', 'DE_ENERGIZED', 'NEAR_LIVE', 'LIVE_LOW_VOLTAGE', 'HIGH_VOLTAGE') NOT NULL DEFAULT 'NOT_APPLICABLE',
  ADD COLUMN `workMethod` TEXT NULL,
  ADD COLUMN `requiredEquipment` TEXT NULL,
  ADD COLUMN `requiredPpe` TEXT NULL,
  ADD COLUMN `personnelRequirements` TEXT NULL,
  ADD COLUMN `safetyConditions` TEXT NULL,
  ADD COLUMN `fseChecklist` TEXT NULL,
  ADD COLUMN `requiresSecondPerson` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `secondPersonException` TEXT NULL;

CREATE TABLE `SjaParticipant` (
  `id` VARCHAR(191) NOT NULL,
  `sjaAnalysisId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NULL,
  `name` VARCHAR(191) NOT NULL,
  `isExternal` BOOLEAN NOT NULL DEFAULT false,
  `competenceStatus` ENUM('NOT_REQUIRED', 'VALID', 'MISSING', 'EXPIRED', 'MANUALLY_CONFIRMED') NOT NULL DEFAULT 'NOT_REQUIRED',
  `competenceSnapshot` TEXT NULL,
  `acknowledgedAt` DATETIME(3) NULL,
  `acknowledgedVersion` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `SjaParticipant_sjaAnalysisId_userId_key`(`sjaAnalysisId`, `userId`),
  INDEX `SjaParticipant_sjaAnalysisId_idx`(`sjaAnalysisId`),
  INDEX `SjaParticipant_userId_idx`(`userId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `SjaParticipant`
  ADD CONSTRAINT `SjaParticipant_sjaAnalysisId_fkey`
  FOREIGN KEY (`sjaAnalysisId`) REFERENCES `SjaAnalysis`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
