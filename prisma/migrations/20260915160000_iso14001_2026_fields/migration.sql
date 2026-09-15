-- ISO 14001:2026 4.1 / 6.1.2 / 6.3 / 9.3

ALTER TABLE `EnvironmentalAspect`
  ADD COLUMN `lifecycleStages` TEXT NULL,
  ADD COLUMN `contextClimate` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `contextBiodiversity` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `contextResources` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `contextPollution` BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE `ManagementReview`
  ADD COLUMN `environmentSummary` TEXT NULL;

ALTER TABLE `ManagementOfChange`
  ADD COLUMN `environmentalImpact` TEXT NULL;

CREATE TABLE `MocEnvironmentalAspectLink` (
  `id` VARCHAR(191) NOT NULL,
  `mocId` VARCHAR(191) NOT NULL,
  `environmentalAspectId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  UNIQUE INDEX `MocEnvironmentalAspectLink_mocId_environmentalAspectId_key` (`mocId`, `environmentalAspectId`),
  INDEX `MocEnvironmentalAspectLink_environmentalAspectId_idx` (`environmentalAspectId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `MocEnvironmentalAspectLink`
  ADD CONSTRAINT `MocEnvironmentalAspectLink_mocId_fkey`
  FOREIGN KEY (`mocId`) REFERENCES `ManagementOfChange`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `MocEnvironmentalAspectLink`
  ADD CONSTRAINT `MocEnvironmentalAspectLink_environmentalAspectId_fkey`
  FOREIGN KEY (`environmentalAspectId`) REFERENCES `EnvironmentalAspect`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
