-- Sjekklister. Internkontrollforskriften § 5 nr. 6 og 7.

CREATE TABLE `Checklist` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `usageNote` TEXT NULL,
  `status` ENUM('DRAFT', 'ACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  `access` ENUM('ALL', 'ROLES', 'USERS', 'ROLES_AND_USERS') NOT NULL DEFAULT 'ALL',
  `allowedRoles` JSON NULL,
  `allowedUserIds` JSON NULL,
  `resultRecipientIds` JSON NULL,
  `createdById` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `Checklist_tenantId_status_idx` ON `Checklist`(`tenantId`, `status`);
CREATE INDEX `Checklist_createdById_idx` ON `Checklist`(`createdById`);
ALTER TABLE `Checklist` ADD CONSTRAINT `Checklist_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Checklist` ADD CONSTRAINT `Checklist_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE `ChecklistSection` (
  `id` VARCHAR(191) NOT NULL,
  `checklistId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `sortOrder` INTEGER NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `ChecklistSection_checklistId_sortOrder_idx` ON `ChecklistSection`(`checklistId`, `sortOrder`);
ALTER TABLE `ChecklistSection` ADD CONSTRAINT `ChecklistSection_checklistId_fkey` FOREIGN KEY (`checklistId`) REFERENCES `Checklist`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `ChecklistItem` (
  `id` VARCHAR(191) NOT NULL,
  `sectionId` VARCHAR(191) NOT NULL,
  `prompt` VARCHAR(191) NOT NULL,
  `helpText` TEXT NULL,
  `required` BOOLEAN NOT NULL DEFAULT true,
  `sortOrder` INTEGER NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `ChecklistItem_sectionId_sortOrder_idx` ON `ChecklistItem`(`sectionId`, `sortOrder`);
ALTER TABLE `ChecklistItem` ADD CONSTRAINT `ChecklistItem_sectionId_fkey` FOREIGN KEY (`sectionId`) REFERENCES `ChecklistSection`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `ChecklistRun` (
  `id` VARCHAR(191) NOT NULL,
  `checklistId` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `submittedById` VARCHAR(191) NOT NULL,
  `reference` VARCHAR(191) NOT NULL,
  `location` VARCHAR(191) NULL,
  `note` TEXT NULL,
  `okCount` INTEGER NOT NULL,
  `deviationCount` INTEGER NOT NULL,
  `notApplicableCount` INTEGER NOT NULL,
  `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE UNIQUE INDEX `ChecklistRun_tenantId_reference_key` ON `ChecklistRun`(`tenantId`, `reference`);
CREATE INDEX `ChecklistRun_checklistId_submittedAt_idx` ON `ChecklistRun`(`checklistId`, `submittedAt`);
CREATE INDEX `ChecklistRun_tenantId_submittedAt_idx` ON `ChecklistRun`(`tenantId`, `submittedAt`);
CREATE INDEX `ChecklistRun_submittedById_idx` ON `ChecklistRun`(`submittedById`);
ALTER TABLE `ChecklistRun` ADD CONSTRAINT `ChecklistRun_checklistId_fkey` FOREIGN KEY (`checklistId`) REFERENCES `Checklist`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ChecklistRun` ADD CONSTRAINT `ChecklistRun_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ChecklistRun` ADD CONSTRAINT `ChecklistRun_submittedById_fkey` FOREIGN KEY (`submittedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE `ChecklistAnswer` (
  `id` VARCHAR(191) NOT NULL,
  `runId` VARCHAR(191) NOT NULL,
  `itemId` VARCHAR(191) NULL,
  `sectionTitle` VARCHAR(191) NOT NULL,
  `prompt` TEXT NOT NULL,
  `response` ENUM('OK', 'DEVIATION', 'NOT_APPLICABLE') NOT NULL,
  `comment` TEXT NULL,
  `sortOrder` INTEGER NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `ChecklistAnswer_runId_sortOrder_idx` ON `ChecklistAnswer`(`runId`, `sortOrder`);
ALTER TABLE `ChecklistAnswer` ADD CONSTRAINT `ChecklistAnswer_runId_fkey` FOREIGN KEY (`runId`) REFERENCES `ChecklistRun`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
