ALTER TABLE `UserTenant`
  ADD COLUMN `payCategory` VARCHAR(191) NULL,
  ADD COLUMN `overtimeEligible` BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE `Project`
  ADD COLUMN `contactName` VARCHAR(191) NULL,
  ADD COLUMN `contactPhone` VARCHAR(191) NULL,
  ADD COLUMN `departmentExternalId` VARCHAR(191) NULL;

CREATE TABLE `AccountingDepartment` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `externalId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `number` VARCHAR(191) NULL,
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`),
  UNIQUE INDEX `AccountingDepartment_tenantId_externalId_key`(`tenantId`, `externalId`),
  INDEX `AccountingDepartment_tenantId_idx`(`tenantId`),
  CONSTRAINT `AccountingDepartment_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
