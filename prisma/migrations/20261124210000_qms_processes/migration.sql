-- ISO 9001:2015 pkt. 4.4: prosesser, samspill og dokumentert informasjon.

CREATE TABLE `QmsProcess` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `sourceKey` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `kind` ENUM('STYRENDE', 'HOVED', 'STOTTE') NOT NULL,
    `status` ENUM('DRAFT', 'ACTIVE', 'OUT_OF_SCOPE', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `purpose` TEXT NULL,
    `inputs` TEXT NULL,
    `outputs` TEXT NULL,
    `criteria` TEXT NULL,
    `resources` TEXT NULL,
    `risksAndOpportunities` TEXT NULL,
    `scopeReason` TEXT NULL,
    `evaluationNote` TEXT NULL,
    `lastEvaluatedAt` DATETIME(3) NULL,
    `nextReviewAt` DATETIME(3) NULL,
    `ownerId` VARCHAR(191) NULL,
    `routineId` VARCHAR(191) NULL,
    `moduleHref` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `updatedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `QmsProcess_tenantId_sourceKey_key`(`tenantId`, `sourceKey`),
    INDEX `QmsProcess_tenantId_idx`(`tenantId`),
    INDEX `QmsProcess_ownerId_idx`(`ownerId`),
    INDEX `QmsProcess_routineId_idx`(`routineId`),
    INDEX `QmsProcess_status_idx`(`status`),
    INDEX `QmsProcess_nextReviewAt_idx`(`nextReviewAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `QmsProcessStep` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `processId` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,

    INDEX `QmsProcessStep_tenantId_idx`(`tenantId`),
    INDEX `QmsProcessStep_processId_idx`(`processId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `QmsProcessLink` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `fromProcessId` VARCHAR(191) NOT NULL,
    `toProcessId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `QmsProcessLink_fromProcessId_toProcessId_key`(`fromProcessId`, `toProcessId`),
    INDEX `QmsProcessLink_tenantId_idx`(`tenantId`),
    INDEX `QmsProcessLink_toProcessId_idx`(`toProcessId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `QmsProcess` ADD CONSTRAINT `QmsProcess_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `QmsProcess` ADD CONSTRAINT `QmsProcess_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `QmsProcess` ADD CONSTRAINT `QmsProcess_routineId_fkey` FOREIGN KEY (`routineId`) REFERENCES `Routine`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `QmsProcess` ADD CONSTRAINT `QmsProcess_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `QmsProcess` ADD CONSTRAINT `QmsProcess_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `QmsProcessStep` ADD CONSTRAINT `QmsProcessStep_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `QmsProcessStep` ADD CONSTRAINT `QmsProcessStep_processId_fkey` FOREIGN KEY (`processId`) REFERENCES `QmsProcess`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `QmsProcessLink` ADD CONSTRAINT `QmsProcessLink_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `QmsProcessLink` ADD CONSTRAINT `QmsProcessLink_fromProcessId_fkey` FOREIGN KEY (`fromProcessId`) REFERENCES `QmsProcess`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `QmsProcessLink` ADD CONSTRAINT `QmsProcessLink_toProcessId_fkey` FOREIGN KEY (`toProcessId`) REFERENCES `QmsProcess`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
