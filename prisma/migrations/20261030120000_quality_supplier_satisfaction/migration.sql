-- ISO 9001:2015 pkt. 8.4 leverandørregister, pkt. 6.3 sporbar rutineendring, pkt. 9.1.2 tilfredshetsinnhenting.
-- Endringsstyring er på for alle kunder (ISO 45001 pkt. 8.1.3 og ISO 9001 pkt. 6.3).

ALTER TABLE `Tenant` MODIFY `mocModuleEnabled` BOOLEAN NOT NULL DEFAULT true;
UPDATE `Tenant` SET `mocModuleEnabled` = true;

CREATE TABLE `Supplier` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `orgNumber` VARCHAR(191) NULL,
    `scope` TEXT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'CONDITIONAL', 'REJECTED', 'SUSPENDED') NOT NULL DEFAULT 'PENDING',
    `criticality` ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL DEFAULT 'MEDIUM',
    `criteria` TEXT NULL,
    `approvedById` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `validUntil` DATETIME(3) NULL,
    `nextReviewAt` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Supplier_tenantId_idx`(`tenantId`),
    INDEX `Supplier_status_idx`(`status`),
    INDEX `Supplier_nextReviewAt_idx`(`nextReviewAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SatisfactionSurvey` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SatisfactionSurvey_tenantId_key`(`tenantId`),
    UNIQUE INDEX `SatisfactionSurvey_token_key`(`token`),
    INDEX `SatisfactionSurvey_token_idx`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Audit` ADD COLUMN `supplierId` VARCHAR(191) NULL;
CREATE INDEX `Audit_supplierId_idx` ON `Audit`(`supplierId`);

ALTER TABLE `Incident` ADD COLUMN `supplierId` VARCHAR(191) NULL;
CREATE INDEX `Incident_supplierId_idx` ON `Incident`(`supplierId`);

ALTER TABLE `RoutineVersion` ADD COLUMN `changeScope` ENUM('MINOR', 'SIGNIFICANT') NOT NULL DEFAULT 'MINOR';
ALTER TABLE `RoutineVersion` ADD COLUMN `mocId` VARCHAR(191) NULL;
CREATE INDEX `RoutineVersion_mocId_idx` ON `RoutineVersion`(`mocId`);

ALTER TABLE `Supplier` ADD CONSTRAINT `Supplier_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Supplier` ADD CONSTRAINT `Supplier_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `SatisfactionSurvey` ADD CONSTRAINT `SatisfactionSurvey_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `SatisfactionSurvey` ADD CONSTRAINT `SatisfactionSurvey_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Audit` ADD CONSTRAINT `Audit_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Incident` ADD CONSTRAINT `Incident_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `RoutineVersion` ADD CONSTRAINT `RoutineVersion_mocId_fkey` FOREIGN KEY (`mocId`) REFERENCES `ManagementOfChange`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
