-- Additive migration: industry scope + routine templates/routines
-- No destructive changes, no data reset.

ALTER TABLE `FormTemplate`
  ADD COLUMN `industryScope` JSON NULL;

ALTER TABLE `InspectionTemplate`
  ADD COLUMN `industryScope` JSON NULL;

CREATE TABLE `RoutineTemplate` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `category` VARCHAR(191) NULL,
  `content` JSON NULL,
  `legalReference` VARCHAR(191) NULL,
  `isGlobal` BOOLEAN NOT NULL DEFAULT false,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `industryScope` JSON NULL,
  `createdBy` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `RoutineTemplate_tenantId_idx`(`tenantId`),
  INDEX `RoutineTemplate_isGlobal_idx`(`isGlobal`),
  INDEX `RoutineTemplate_isActive_idx`(`isActive`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Routine` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `templateId` VARCHAR(191) NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `category` VARCHAR(191) NULL,
  `content` JSON NULL,
  `legalReference` VARCHAR(191) NULL,
  `status` ENUM('ACTIVE', 'DRAFT', 'NEEDS_REVIEW', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
  `responsibleId` VARCHAR(191) NULL,
  `reviewIntervalMonths` INTEGER NOT NULL DEFAULT 12,
  `nextReviewAt` DATETIME(3) NULL,
  `createdBy` VARCHAR(191) NOT NULL,
  `updatedBy` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `Routine_tenantId_idx`(`tenantId`),
  INDEX `Routine_templateId_idx`(`templateId`),
  INDEX `Routine_status_idx`(`status`),
  INDEX `Routine_responsibleId_idx`(`responsibleId`),
  INDEX `Routine_nextReviewAt_idx`(`nextReviewAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `RoutineTemplate`
  ADD CONSTRAINT `RoutineTemplate_tenantId_fkey`
  FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Routine`
  ADD CONSTRAINT `Routine_tenantId_fkey`
  FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Routine`
  ADD CONSTRAINT `Routine_templateId_fkey`
  FOREIGN KEY (`templateId`) REFERENCES `RoutineTemplate`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Routine`
  ADD CONSTRAINT `Routine_responsibleId_fkey`
  FOREIGN KEY (`responsibleId`) REFERENCES `User`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
