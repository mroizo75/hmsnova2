-- Arbeidsutstyr med godkjenning. FuA § 12-5, § 12-8, § 13-1 og § 13-4.

CREATE TABLE `EquipmentApproval` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `category` ENUM(
        'BILLOFTER',
        'LOFT_HENGENDE',
        'LOFTEREDSKAP',
        'LOFTE_STABLEVOGN',
        'MASSEFORFLYTTING',
        'BERGINGSVOGN',
        'PERSONLOFTER',
        'HENGESTILLAS',
        'KLATRESTILLAS',
        'SCENERIGG',
        'BYGGEPLASSHEIS',
        'TRALLEBANE',
        'TRYKKUTSTYR',
        'KALIBRERT_KONTROLLUTSTYR',
        'ANNET'
    ) NOT NULL,
    `supplierName` VARCHAR(191) NOT NULL,
    `approvalBody` VARCHAR(191) NOT NULL,
    `certificateNumber` VARCHAR(191) NULL,
    `serialNumber` VARCHAR(191) NULL,
    `location` VARCHAR(191) NULL,
    `validFrom` DATETIME(3) NOT NULL,
    `validTo` DATETIME(3) NOT NULL,
    `operationalStatus` ENUM('IN_USE', 'OUT_OF_SERVICE') NOT NULL DEFAULT 'IN_USE',
    `notes` TEXT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `EquipmentApproval_tenantId_idx`(`tenantId`),
    INDEX `EquipmentApproval_tenantId_validTo_idx`(`tenantId`, `validTo`),
    INDEX `EquipmentApproval_operationalStatus_idx`(`operationalStatus`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `EquipmentApprovalDocument` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `equipmentId` VARCHAR(191) NOT NULL,
    `fileKey` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `mime` VARCHAR(191) NOT NULL,
    `size` INTEGER NULL,
    `uploadedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EquipmentApprovalDocument_tenantId_idx`(`tenantId`),
    INDEX `EquipmentApprovalDocument_equipmentId_idx`(`equipmentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `EquipmentRoutineLink` (
    `id` VARCHAR(191) NOT NULL,
    `equipmentId` VARCHAR(191) NOT NULL,
    `routineId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `EquipmentRoutineLink_equipmentId_routineId_key`(`equipmentId`, `routineId`),
    INDEX `EquipmentRoutineLink_routineId_idx`(`routineId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `EquipmentRiskLink` (
    `id` VARCHAR(191) NOT NULL,
    `equipmentId` VARCHAR(191) NOT NULL,
    `riskId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `EquipmentRiskLink_equipmentId_riskId_key`(`equipmentId`, `riskId`),
    INDEX `EquipmentRiskLink_riskId_idx`(`riskId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Incident` ADD COLUMN `equipmentApprovalId` VARCHAR(191) NULL;
CREATE INDEX `Incident_equipmentApprovalId_idx` ON `Incident`(`equipmentApprovalId`);

ALTER TABLE `EquipmentApproval` ADD CONSTRAINT `EquipmentApproval_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `EquipmentApprovalDocument` ADD CONSTRAINT `EquipmentApprovalDocument_equipmentId_fkey` FOREIGN KEY (`equipmentId`) REFERENCES `EquipmentApproval`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `EquipmentRoutineLink` ADD CONSTRAINT `EquipmentRoutineLink_equipmentId_fkey` FOREIGN KEY (`equipmentId`) REFERENCES `EquipmentApproval`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `EquipmentRoutineLink` ADD CONSTRAINT `EquipmentRoutineLink_routineId_fkey` FOREIGN KEY (`routineId`) REFERENCES `Routine`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `EquipmentRiskLink` ADD CONSTRAINT `EquipmentRiskLink_equipmentId_fkey` FOREIGN KEY (`equipmentId`) REFERENCES `EquipmentApproval`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `EquipmentRiskLink` ADD CONSTRAINT `EquipmentRiskLink_riskId_fkey` FOREIGN KEY (`riskId`) REFERENCES `Risk`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Incident` ADD CONSTRAINT `Incident_equipmentApprovalId_fkey` FOREIGN KEY (`equipmentApprovalId`) REFERENCES `EquipmentApproval`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
