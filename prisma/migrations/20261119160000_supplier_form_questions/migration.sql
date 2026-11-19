-- Selvevalueringsskjema med spørsmål kunden definerer selv.
-- Utsendte skjema lagrer spørsmål og svar slik de var på sendetidspunktet.

ALTER TABLE `SupplierAssessment`
  ADD COLUMN `questionsSnapshot` TEXT NULL,
  ADD COLUMN `answersSnapshot` TEXT NULL;

CREATE TABLE `SupplierFormTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL DEFAULT 'Selvevaluering',
    `updatedById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SupplierFormTemplate_tenantId_key`(`tenantId`),
    INDEX `SupplierFormTemplate_updatedById_idx`(`updatedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SupplierFormQuestion` (
    `id` VARCHAR(191) NOT NULL,
    `templateId` VARCHAR(191) NOT NULL,
    `label` VARCHAR(300) NOT NULL,
    `helpText` TEXT NULL,
    `fieldType` ENUM('TEXT', 'TEXTAREA', 'YES_NO') NOT NULL,
    `required` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL,

    INDEX `SupplierFormQuestion_templateId_sortOrder_idx`(`templateId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `SupplierFormTemplate` ADD CONSTRAINT `SupplierFormTemplate_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `SupplierFormTemplate` ADD CONSTRAINT `SupplierFormTemplate_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `SupplierFormQuestion` ADD CONSTRAINT `SupplierFormQuestion_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `SupplierFormTemplate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
