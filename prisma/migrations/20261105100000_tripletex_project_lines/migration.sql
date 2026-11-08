ALTER TABLE `Tenant`
  ADD COLUMN `tripletexSalaryNormalId` VARCHAR(191) NULL,
  ADD COLUMN `tripletexSalaryOt50Id` VARCHAR(191) NULL,
  ADD COLUMN `tripletexSalaryOt100Id` VARCHAR(191) NULL,
  ADD COLUMN `tripletexMileageRateTypeId` VARCHAR(191) NULL,
  ADD COLUMN `tripletexTemplateProjectExternalId` VARCHAR(191) NULL;

ALTER TABLE `AccountingProduct`
  ADD COLUMN `imageDocumentId` VARCHAR(191) NULL;

ALTER TABLE `ProjectUsageLine`
  ADD COLUMN `fromAddress` VARCHAR(191) NULL,
  ADD COLUMN `toAddress` VARCHAR(191) NULL,
  ADD COLUMN `travelExternalId` VARCHAR(191) NULL;

CREATE TABLE `AccountingActivity` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `externalId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `number` VARCHAR(191) NULL,
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `AccountingActivity_tenantId_externalId_key` (`tenantId`, `externalId`),
  INDEX `AccountingActivity_tenantId_idx` (`tenantId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AccountingProductGroup` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `externalId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `parentExternalId` VARCHAR(191) NULL,
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `AccountingProductGroup_tenantId_externalId_key` (`tenantId`, `externalId`),
  INDEX `AccountingProductGroup_tenantId_idx` (`tenantId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AccountingProductGroupMember` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `productExternalId` VARCHAR(191) NOT NULL,
  `groupExternalId` VARCHAR(191) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `AcctProductGroupMember_tenant_product_group_key` (`tenantId`, `productExternalId`, `groupExternalId`),
  INDEX `AcctProductGroupMember_tenantId_groupExternalId_idx` (`tenantId`, `groupExternalId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `AccountingActivity`
  ADD CONSTRAINT `AccountingActivity_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `AccountingProductGroup`
  ADD CONSTRAINT `AccountingProductGroup_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `AccountingProductGroupMember`
  ADD CONSTRAINT `AcctProductGroupMember_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
