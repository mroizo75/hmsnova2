-- Tripletex/feltjobb: provider, jobKind, billing og cache/outbox

ALTER TABLE `Tenant`
  ADD COLUMN `accountingProvider` ENUM('NONE', 'TRIPLETEX', 'FIKEN') NOT NULL DEFAULT 'NONE',
  ADD COLUMN `tripletexEmployeeToken` TEXT NULL,
  ADD COLUMN `tripletexCompanyId` VARCHAR(191) NULL,
  ADD COLUMN `tripletexActivityNormalId` VARCHAR(191) NULL,
  ADD COLUMN `tripletexActivityOt50Id` VARCHAR(191) NULL,
  ADD COLUMN `tripletexActivityOt100Id` VARCHAR(191) NULL,
  ADD COLUMN `tripletexProductKmId` VARCHAR(191) NULL,
  ADD COLUMN `tripletexProductMachineHoursId` VARCHAR(191) NULL,
  ADD COLUMN `accountingWebhookSecret` VARCHAR(191) NULL,
  ADD COLUMN `accountingLastPullAt` DATETIME(3) NULL;

ALTER TABLE `UserTenant`
  ADD COLUMN `externalEmployeeId` VARCHAR(191) NULL;

ALTER TABLE `Project`
  ADD COLUMN `jobKind` ENUM('SERVICE', 'HMS') NOT NULL DEFAULT 'HMS',
  ADD COLUMN `billingStatus` ENUM('OPEN', 'READY', 'INVOICED') NOT NULL DEFAULT 'OPEN',
  ADD COLUMN `externalProjectId` VARCHAR(191) NULL,
  ADD COLUMN `externalCustomerId` VARCHAR(191) NULL,
  ADD COLUMN `externalOrderId` VARCHAR(191) NULL;

CREATE INDEX `Project_billingStatus_idx` ON `Project`(`billingStatus`);
CREATE INDEX `Project_jobKind_idx` ON `Project`(`jobKind`);
CREATE INDEX `Project_externalProjectId_idx` ON `Project`(`externalProjectId`);

ALTER TABLE `TimeEntry`
  ADD COLUMN `externalId` VARCHAR(191) NULL,
  ADD COLUMN `syncStatus` ENUM('IDLE', 'PENDING', 'SYNCED', 'ERROR') NOT NULL DEFAULT 'IDLE',
  ADD COLUMN `invoicedAt` DATETIME(3) NULL;

ALTER TABLE `MileageEntry`
  ADD COLUMN `externalId` VARCHAR(191) NULL,
  ADD COLUMN `syncStatus` ENUM('IDLE', 'PENDING', 'SYNCED', 'ERROR') NOT NULL DEFAULT 'IDLE',
  ADD COLUMN `invoicedAt` DATETIME(3) NULL;

CREATE TABLE `ProjectUsageLine` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `projectId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `kind` ENUM('PRODUCT', 'MACHINE', 'KM') NOT NULL,
  `productExternalId` VARCHAR(191) NOT NULL,
  `productName` VARCHAR(191) NOT NULL,
  `quantity` DOUBLE NOT NULL,
  `unitPrice` DOUBLE NULL,
  `comment` TEXT NULL,
  `externalId` VARCHAR(191) NULL,
  `syncStatus` ENUM('IDLE', 'PENDING', 'SYNCED', 'ERROR') NOT NULL DEFAULT 'IDLE',
  `invoicedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `ProjectUsageLine_tenantId_idx` (`tenantId`),
  INDEX `ProjectUsageLine_projectId_idx` (`projectId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ProjectInvoice` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `projectId` VARCHAR(191) NOT NULL,
  `createdById` VARCHAR(191) NOT NULL,
  `externalInvoiceId` VARCHAR(191) NOT NULL,
  `invoiceNumber` VARCHAR(191) NULL,
  `amountExclVat` DOUBLE NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `ProjectInvoice_tenantId_idx` (`tenantId`),
  INDEX `ProjectInvoice_projectId_idx` (`projectId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AccountingCustomer` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `externalId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `organizationNumber` VARCHAR(191) NULL,
  `customerNumber` VARCHAR(191) NULL,
  `email` VARCHAR(191) NULL,
  `phone` VARCHAR(191) NULL,
  `isInactive` BOOLEAN NOT NULL DEFAULT false,
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `AccountingCustomer_tenantId_externalId_key` (`tenantId`, `externalId`),
  INDEX `AccountingCustomer_tenantId_idx` (`tenantId`),
  INDEX `AccountingCustomer_name_idx` (`name`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AccountingProduct` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `externalId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `number` VARCHAR(191) NULL,
  `unit` VARCHAR(191) NULL,
  `priceExclVat` DOUBLE NULL,
  `priceInclVat` DOUBLE NULL,
  `isStockItem` BOOLEAN NOT NULL DEFAULT false,
  `isInactive` BOOLEAN NOT NULL DEFAULT false,
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `AccountingProduct_tenantId_externalId_key` (`tenantId`, `externalId`),
  INDEX `AccountingProduct_tenantId_idx` (`tenantId`),
  INDEX `AccountingProduct_name_idx` (`name`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AccountingSyncJob` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `entityType` VARCHAR(191) NOT NULL,
  `entityId` VARCHAR(191) NOT NULL,
  `action` VARCHAR(191) NOT NULL,
  `payload` JSON NOT NULL,
  `attempts` INTEGER NOT NULL DEFAULT 0,
  `lastError` TEXT NULL,
  `status` ENUM('IDLE', 'PENDING', 'SYNCED', 'ERROR') NOT NULL DEFAULT 'PENDING',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `AccountingSyncJob_tenantId_status_idx` (`tenantId`, `status`),
  INDEX `AccountingSyncJob_status_createdAt_idx` (`status`, `createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ProjectUsageLine`
  ADD CONSTRAINT `ProjectUsageLine_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `ProjectUsageLine_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ProjectInvoice`
  ADD CONSTRAINT `ProjectInvoice_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `ProjectInvoice_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `ProjectInvoice_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `AccountingCustomer`
  ADD CONSTRAINT `AccountingCustomer_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `AccountingProduct`
  ADD CONSTRAINT `AccountingProduct_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `AccountingSyncJob`
  ADD CONSTRAINT `AccountingSyncJob_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
