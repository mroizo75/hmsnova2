-- Time/prosjekt/ressursplan: tre spor, underprosjekt, godkjenning, timebank

ALTER TABLE `Tenant`
  ADD COLUMN `dayStartHour` DOUBLE NOT NULL DEFAULT 7,
  ADD COLUMN `dayEndHour` DOUBLE NOT NULL DEFAULT 15.5,
  ADD COLUMN `overtime50CapHours` DOUBLE NOT NULL DEFAULT 4.5,
  ADD COLUMN `saturdayOt50UntilHour` DOUBLE NOT NULL DEFAULT 12,
  ADD COLUMN `timeCommentPresets` JSON NULL,
  ADD COLUMN `absenceProjectId` VARCHAR(191) NULL;

ALTER TABLE `Project`
  ADD COLUMN `parentId` VARCHAR(191) NULL,
  ADD COLUMN `contactExternalId` VARCHAR(191) NULL,
  ADD COLUMN `isAbsenceProject` BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX `Project_parentId_idx` ON `Project`(`parentId`);
ALTER TABLE `Project` ADD CONSTRAINT `Project_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `TimeEntry`
  ADD COLUMN `clockFrom` VARCHAR(191) NULL,
  ADD COLUMN `clockTo` VARCHAR(191) NULL,
  ADD COLUMN `lunchMinutes` INTEGER NULL,
  ADD COLUMN `billingActivityId` VARCHAR(191) NULL,
  ADD COLUMN `salaryTypeId` VARCHAR(191) NULL,
  ADD COLUMN `approvalStatus` ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'SYNCED', 'SYNC_ERROR') NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN `approvedById` VARCHAR(191) NULL,
  ADD COLUMN `approvedAt` DATETIME(3) NULL;

CREATE INDEX `TimeEntry_approvalStatus_idx` ON `TimeEntry`(`approvalStatus`);
ALTER TABLE `TimeEntry` ADD CONSTRAINT `TimeEntry_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `AccountingProduct`
  ADD COLUMN `categoryExternalId` VARCHAR(191) NULL,
  ADD COLUMN `categoryName` VARCHAR(191) NULL;

ALTER TABLE `Absence`
  ADD COLUMN `projectId` VARCHAR(191) NULL,
  ADD COLUMN `salaryTypeExternalId` VARCHAR(191) NULL,
  ADD COLUMN `externalId` VARCHAR(191) NULL,
  ADD COLUMN `syncStatus` ENUM('IDLE', 'PENDING', 'SYNCED', 'ERROR') NOT NULL DEFAULT 'IDLE';

ALTER TABLE `Absence` ADD CONSTRAINT `Absence_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `AccountingContact` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `customerExternalId` VARCHAR(191) NOT NULL,
  `externalId` VARCHAR(191) NOT NULL,
  `firstName` VARCHAR(191) NULL,
  `lastName` VARCHAR(191) NULL,
  `email` VARCHAR(191) NULL,
  `phone` VARCHAR(191) NULL,
  `isInactive` BOOLEAN NOT NULL DEFAULT false,
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `AccountingContact_tenantId_externalId_key` (`tenantId`, `externalId`),
  INDEX `AccountingContact_tenantId_customerExternalId_idx` (`tenantId`, `customerExternalId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `AccountingContact` ADD CONSTRAINT `AccountingContact_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `AccountingSalaryType` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `externalId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `number` VARCHAR(191) NULL,
  `isInactive` BOOLEAN NOT NULL DEFAULT false,
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `AccountingSalaryType_tenantId_externalId_key` (`tenantId`, `externalId`),
  INDEX `AccountingSalaryType_tenantId_idx` (`tenantId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `AccountingSalaryType` ADD CONSTRAINT `AccountingSalaryType_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `ResourceAssignment` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `projectId` VARCHAR(191) NOT NULL,
  `startDate` DATE NOT NULL,
  `endDate` DATE NOT NULL,
  `plannedHours` DOUBLE NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `ResourceAssignment_tenantId_startDate_idx` (`tenantId`, `startDate`),
  INDEX `ResourceAssignment_userId_startDate_idx` (`userId`, `startDate`),
  INDEX `ResourceAssignment_projectId_idx` (`projectId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ResourceAssignment` ADD CONSTRAINT `ResourceAssignment_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ResourceAssignment` ADD CONSTRAINT `ResourceAssignment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ResourceAssignment` ADD CONSTRAINT `ResourceAssignment_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `TimeBankRule` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `salaryTypeId` VARCHAR(191) NULL,
  `timeType` ENUM('NORMAL', 'OVERTIME_50', 'OVERTIME_40', 'OVERTIME_100', 'WEEKEND', 'TRAVEL', 'SICK_LEAVE') NULL,
  `factor` DOUBLE NOT NULL DEFAULT 1,
  `appliesToUserIds` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `TimeBankRule_tenantId_idx` (`tenantId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `TimeBankRule` ADD CONSTRAINT `TimeBankRule_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `TimeBankLedger` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `kind` ENUM('EARN', 'TAKE', 'PAYOUT', 'CORRECTION') NOT NULL,
  `hours` DOUBLE NOT NULL,
  `balanceAfter` DOUBLE NOT NULL,
  `timeEntryId` VARCHAR(191) NULL,
  `reason` TEXT NOT NULL,
  `correctedById` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `TimeBankLedger_tenantId_userId_idx` (`tenantId`, `userId`),
  INDEX `TimeBankLedger_userId_createdAt_idx` (`userId`, `createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `TimeBankLedger` ADD CONSTRAINT `TimeBankLedger_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `TimeBankLedger` ADD CONSTRAINT `TimeBankLedger_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `TimeBankLedger` ADD CONSTRAINT `TimeBankLedger_correctedById_fkey` FOREIGN KEY (`correctedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
