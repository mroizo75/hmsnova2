-- IK-mat varemottak/renhold og internkontroll skjenking.
-- Rører ikke Notification-enum.

CREATE TABLE `MatVaremottak` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `receivedAt` DATETIME(3) NOT NULL,
  `supplier` VARCHAR(191) NOT NULL,
  `productName` VARCHAR(191) NOT NULL,
  `batchLot` VARCHAR(191) NULL,
  `temperature` DOUBLE NULL,
  `expiryDate` DATETIME(3) NULL,
  `accepted` BOOLEAN NOT NULL DEFAULT true,
  `usedIn` VARCHAR(191) NULL,
  `discardedAt` DATETIME(3) NULL,
  `receivedBy` VARCHAR(191) NULL,
  `deviationNote` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `MatVaremottak_tenantId_idx` ON `MatVaremottak`(`tenantId`);
CREATE INDEX `MatVaremottak_receivedAt_idx` ON `MatVaremottak`(`receivedAt`);
CREATE INDEX `MatVaremottak_batchLot_idx` ON `MatVaremottak`(`batchLot`);
ALTER TABLE `MatVaremottak` ADD CONSTRAINT `MatVaremottak_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `MatRenhold` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `cleanedAt` DATETIME(3) NOT NULL,
  `area` VARCHAR(191) NOT NULL,
  `task` VARCHAR(191) NOT NULL,
  `cleanedBy` VARCHAR(191) NULL,
  `approved` BOOLEAN NOT NULL DEFAULT true,
  `note` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `MatRenhold_tenantId_idx` ON `MatRenhold`(`tenantId`);
CREATE INDEX `MatRenhold_cleanedAt_idx` ON `MatRenhold`(`cleanedAt`);
ALTER TABLE `MatRenhold` ADD CONSTRAINT `MatRenhold_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `SkjenkeBevilling` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `bevillingsnummer` VARCHAR(191) NULL,
  `kommune` VARCHAR(191) NULL,
  `gyldigFra` DATETIME(3) NULL,
  `gyldigTil` DATETIME(3) NULL,
  `styrer` VARCHAR(191) NULL,
  `stedfortreder` VARCHAR(191) NULL,
  `skjenketider` TEXT NULL,
  `internregler` TEXT NULL,
  `sistGjennomgatt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `SkjenkeBevilling_tenantId_idx` ON `SkjenkeBevilling`(`tenantId`);
ALTER TABLE `SkjenkeBevilling` ADD CONSTRAINT `SkjenkeBevilling_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `SkjenkeHendelse` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `occurredAt` DATETIME(3) NOT NULL,
  `type` VARCHAR(191) NOT NULL,
  `action` VARCHAR(191) NOT NULL,
  `beruselsesgrad` VARCHAR(191) NULL,
  `registeredBy` VARCHAR(191) NULL,
  `note` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `SkjenkeHendelse_tenantId_idx` ON `SkjenkeHendelse`(`tenantId`);
CREATE INDEX `SkjenkeHendelse_occurredAt_idx` ON `SkjenkeHendelse`(`occurredAt`);
ALTER TABLE `SkjenkeHendelse` ADD CONSTRAINT `SkjenkeHendelse_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
