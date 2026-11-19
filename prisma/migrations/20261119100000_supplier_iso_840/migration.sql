-- ISO 9001:2015 pkt. 8.4: kommuniserte krav, styring, dokumentert vurdering og re-evaluering.

ALTER TABLE `Supplier`
  ADD COLUMN `contactName` VARCHAR(191) NULL,
  ADD COLUMN `contactEmail` VARCHAR(191) NULL,
  ADD COLUMN `contactPhone` VARCHAR(191) NULL,
  ADD COLUMN `worksOnSite` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `requirements` TEXT NULL,
  ADD COLUMN `controls` TEXT NULL;

CREATE TABLE `SupplierEvaluation` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `supplierId` VARCHAR(191) NOT NULL,
    `method` ENUM('SELF_ASSESSMENT', 'AUDIT', 'PERFORMANCE', 'DOCUMENT_REVIEW') NOT NULL,
    `outcome` ENUM('APPROVED', 'CONDITIONAL', 'REJECTED', 'SUSPENDED') NOT NULL,
    `summary` TEXT NOT NULL,
    `actions` TEXT NULL,
    `evaluatedAt` DATETIME(3) NOT NULL,
    `evaluatedById` VARCHAR(191) NOT NULL,
    `nextReviewAt` DATETIME(3) NULL,
    `assessmentId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `SupplierEvaluation_assessmentId_key`(`assessmentId`),
    INDEX `SupplierEvaluation_tenantId_idx`(`tenantId`),
    INDEX `SupplierEvaluation_supplierId_idx`(`supplierId`),
    INDEX `SupplierEvaluation_evaluatedAt_idx`(`evaluatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SupplierDocument` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `supplierId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `kind` ENUM('CERTIFICATE', 'INSURANCE', 'APPROVAL', 'COMPETENCE', 'OTHER') NOT NULL,
    `reference` VARCHAR(191) NULL,
    `expiresAt` DATETIME(3) NULL,
    `fileKey` VARCHAR(191) NULL,
    `fileName` VARCHAR(191) NULL,
    `mimeType` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SupplierDocument_tenantId_idx`(`tenantId`),
    INDEX `SupplierDocument_supplierId_idx`(`supplierId`),
    INDEX `SupplierDocument_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SupplierAssessment` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `supplierId` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `status` ENUM('SENT', 'ANSWERED', 'ACCEPTED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'SENT',
    `dueAt` DATETIME(3) NOT NULL,
    `sentAt` DATETIME(3) NOT NULL,
    `sentToEmail` VARCHAR(191) NOT NULL,
    `requirementsSnapshot` TEXT NOT NULL,
    `controlsSnapshot` TEXT NOT NULL,
    `worksOnSite` BOOLEAN NOT NULL DEFAULT false,
    `respondentName` VARCHAR(191) NULL,
    `respondentEmail` VARCHAR(191) NULL,
    `confirmsRequirements` BOOLEAN NULL,
    `competence` TEXT NULL,
    `ownControls` TEXT NULL,
    `subcontracting` TEXT NULL,
    `certifications` TEXT NULL,
    `recentDeviations` TEXT NULL,
    `acceptsMonitoring` BOOLEAN NULL,
    `coordinationContact` VARCHAR(191) NULL,
    `hmsSystem` TEXT NULL,
    `answeredAt` DATETIME(3) NULL,
    `reviewNote` TEXT NULL,
    `reviewedById` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reminderSentAt` DATETIME(3) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SupplierAssessment_token_key`(`token`),
    INDEX `SupplierAssessment_tenantId_idx`(`tenantId`),
    INDEX `SupplierAssessment_supplierId_idx`(`supplierId`),
    INDEX `SupplierAssessment_status_idx`(`status`),
    INDEX `SupplierAssessment_dueAt_idx`(`dueAt`),
    INDEX `SupplierAssessment_token_idx`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `SupplierEvaluation` ADD CONSTRAINT `SupplierEvaluation_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `SupplierEvaluation` ADD CONSTRAINT `SupplierEvaluation_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `SupplierEvaluation` ADD CONSTRAINT `SupplierEvaluation_evaluatedById_fkey` FOREIGN KEY (`evaluatedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `SupplierEvaluation` ADD CONSTRAINT `SupplierEvaluation_assessmentId_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `SupplierAssessment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `SupplierDocument` ADD CONSTRAINT `SupplierDocument_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `SupplierDocument` ADD CONSTRAINT `SupplierDocument_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `SupplierDocument` ADD CONSTRAINT `SupplierDocument_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `SupplierAssessment` ADD CONSTRAINT `SupplierAssessment_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `SupplierAssessment` ADD CONSTRAINT `SupplierAssessment_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `SupplierAssessment` ADD CONSTRAINT `SupplierAssessment_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `SupplierAssessment` ADD CONSTRAINT `SupplierAssessment_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
