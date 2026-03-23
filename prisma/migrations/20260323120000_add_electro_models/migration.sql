-- Elektro: samsvarserklæringer og instrukser per tenant
CREATE TABLE `ElectroComplianceDeclaration` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `fileKey` VARCHAR(191) NOT NULL,
    `mime` VARCHAR(191) NOT NULL DEFAULT 'application/pdf',
    `originalFileName` VARCHAR(191) NOT NULL,
    `contractorName` VARCHAR(191) NULL,
    `workCompletedAt` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ElectroComplianceDeclaration_tenantId_idx`(`tenantId`),
    INDEX `ElectroComplianceDeclaration_tenantId_createdAt_idx`(`tenantId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ElectroInstruction` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `fileKey` VARCHAR(191) NOT NULL,
    `mime` VARCHAR(191) NOT NULL DEFAULT 'application/pdf',
    `originalFileName` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ElectroInstruction_tenantId_idx`(`tenantId`),
    INDEX `ElectroInstruction_tenantId_sortOrder_idx`(`tenantId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ElectroComplianceDeclaration` ADD CONSTRAINT `ElectroComplianceDeclaration_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ElectroComplianceDeclaration` ADD CONSTRAINT `ElectroComplianceDeclaration_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `ElectroInstruction` ADD CONSTRAINT `ElectroInstruction_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ElectroInstruction` ADD CONSTRAINT `ElectroInstruction_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
