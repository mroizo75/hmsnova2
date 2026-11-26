-- Utleieoppdrag for bemanningsbyrå. AML § 2-2 og § 3-2.

CREATE TABLE `ClientWorkplace` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `orgNumber` VARCHAR(191) NULL,
    `contactName` VARCHAR(191) NULL,
    `contactPhone` VARCHAR(191) NULL,
    `contactEmail` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `industry` VARCHAR(191) NULL,
    `siteLeaderName` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ClientWorkplace_tenantId_idx`(`tenantId`),
    INDEX `ClientWorkplace_tenantId_name_idx`(`tenantId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Assignment` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NULL,
    `clientWorkplaceId` VARCHAR(191) NOT NULL,
    `competenceProfileId` VARCHAR(191) NULL,
    `roleTitle` VARCHAR(191) NULL,
    `status` ENUM('PLANLAGT', 'KLAR', 'UTPLASSERT', 'AVSLUTTET') NOT NULL DEFAULT 'PLANLAGT',
    `startDate` DATE NOT NULL,
    `endDate` DATE NULL,
    `induction` JSON NULL,
    `inductionCompletedAt` DATETIME(3) NULL,
    `coordinationNoted` BOOLEAN NOT NULL DEFAULT false,
    `coordinationAt` DATETIME(3) NULL,
    `coordinationContact` VARCHAR(191) NULL,
    `clientRiskReceived` BOOLEAN NOT NULL DEFAULT false,
    `notes` TEXT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Assignment_tenantId_status_idx`(`tenantId`, `status`),
    INDEX `Assignment_userId_idx`(`userId`),
    INDEX `Assignment_projectId_idx`(`projectId`),
    INDEX `Assignment_clientWorkplaceId_idx`(`clientWorkplaceId`),
    INDEX `Assignment_competenceProfileId_idx`(`competenceProfileId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Incident` ADD COLUMN `assignmentId` VARCHAR(191) NULL;
CREATE INDEX `Incident_assignmentId_idx` ON `Incident`(`assignmentId`);

ALTER TABLE `SjaAnalysis` ADD COLUMN `assignmentId` VARCHAR(191) NULL;
CREATE INDEX `SjaAnalysis_assignmentId_idx` ON `SjaAnalysis`(`assignmentId`);

ALTER TABLE `ClientWorkplace` ADD CONSTRAINT `ClientWorkplace_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Assignment` ADD CONSTRAINT `Assignment_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Assignment` ADD CONSTRAINT `Assignment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Assignment` ADD CONSTRAINT `Assignment_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Assignment` ADD CONSTRAINT `Assignment_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Assignment` ADD CONSTRAINT `Assignment_clientWorkplaceId_fkey` FOREIGN KEY (`clientWorkplaceId`) REFERENCES `ClientWorkplace`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Assignment` ADD CONSTRAINT `Assignment_competenceProfileId_fkey` FOREIGN KEY (`competenceProfileId`) REFERENCES `CompetenceProfile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Incident` ADD CONSTRAINT `Incident_assignmentId_fkey` FOREIGN KEY (`assignmentId`) REFERENCES `Assignment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `SjaAnalysis` ADD CONSTRAINT `SjaAnalysis_assignmentId_fkey` FOREIGN KEY (`assignmentId`) REFERENCES `Assignment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
