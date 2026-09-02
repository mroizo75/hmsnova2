-- AlterTable
ALTER TABLE `Tenant` ADD COLUMN `contractAcceptedUa` TEXT NULL,
    ADD COLUMN `contractDocumentVersion` VARCHAR(191) NULL,
    ADD COLUMN `withdrawalDeadlineAt` DATETIME(3) NULL,
    ADD COLUMN `bindingStartsAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `ContractAcceptance` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `acceptedAt` DATETIME(3) NOT NULL,
    `source` VARCHAR(191) NOT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` TEXT NULL,
    `companyName` VARCHAR(191) NOT NULL,
    `orgNumber` VARCHAR(191) NOT NULL,
    `contactPerson` VARCHAR(191) NOT NULL,
    `contactEmail` VARCHAR(191) NOT NULL,
    `documentVersion` VARCHAR(191) NOT NULL,
    `withdrawalLabel` TEXT NOT NULL,
    `bindingLabel` TEXT NOT NULL,
    `termsLabel` TEXT NOT NULL,
    `acceptedWithdrawal` BOOLEAN NOT NULL,
    `acceptedBinding` BOOLEAN NOT NULL,
    `acceptedTerms` BOOLEAN NOT NULL,
    `withdrawalDeadlineAt` DATETIME(3) NOT NULL,
    `bindingStartsAt` DATETIME(3) NOT NULL,
    `yearlyPrice` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ContractAcceptance_tenantId_idx`(`tenantId`),
    INDEX `ContractAcceptance_acceptedAt_idx`(`acceptedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ContractAcceptance` ADD CONSTRAINT `ContractAcceptance_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
