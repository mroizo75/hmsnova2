-- Konkret kompetanse (AML § 4-2, IK-HMS § 5 nr. 2) og farlig avfall (avfallsforskriften kap. 11).

CREATE TABLE `CompetenceStatement` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `profileId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `dimension` ENUM('KUNNSKAP', 'FERDIGHET', 'EVNE', 'HOLDNING') NOT NULL,
    `statement` TEXT NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CompetenceStatement_tenantId_idx`(`tenantId`),
    INDEX `CompetenceStatement_profileId_idx`(`profileId`),
    INDEX `CompetenceStatement_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `EmployeeCompetenceRating` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `statementId` VARCHAR(191) NOT NULL,
    `level` ENUM('MANGLER', 'DELVIS', 'INNFRIDD') NOT NULL,
    `comment` TEXT NULL,
    `assessedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewId` VARCHAR(191) NULL,
    `assessedById` VARCHAR(191) NULL,

    UNIQUE INDEX `EmployeeCompetenceRating_userId_statementId_key`(`userId`, `statementId`),
    INDEX `EmployeeCompetenceRating_tenantId_userId_idx`(`tenantId`, `userId`),
    INDEX `EmployeeCompetenceRating_reviewId_idx`(`reviewId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `HazardousWasteDelivery` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `wasteType` ENUM('KJOLEVAESKE', 'SPILLOLJE', 'OLJEFILTER', 'BREMSEVAESKE', 'BATTERI', 'SPRAYBOKS', 'MALING_LOSEMIDDEL', 'ANNET') NOT NULL,
    `customType` VARCHAR(191) NULL,
    `amountKg` DOUBLE NOT NULL,
    `deliveredAt` DATETIME(3) NOT NULL,
    `declarationNumber` VARCHAR(191) NOT NULL,
    `recipient` VARCHAR(191) NOT NULL,
    `aspectId` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `declaredById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `HazardousWasteDelivery_tenantId_deliveredAt_idx`(`tenantId`, `deliveredAt`),
    INDEX `HazardousWasteDelivery_aspectId_idx`(`aspectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `CompetenceStatement` ADD CONSTRAINT `CompetenceStatement_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `CompetenceStatement` ADD CONSTRAINT `CompetenceStatement_profileId_fkey` FOREIGN KEY (`profileId`) REFERENCES `CompetenceProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `CompetenceStatement` ADD CONSTRAINT `CompetenceStatement_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `EmployeeCompetenceRating` ADD CONSTRAINT `EmployeeCompetenceRating_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `EmployeeCompetenceRating` ADD CONSTRAINT `EmployeeCompetenceRating_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `EmployeeCompetenceRating` ADD CONSTRAINT `EmployeeCompetenceRating_statementId_fkey` FOREIGN KEY (`statementId`) REFERENCES `CompetenceStatement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `EmployeeCompetenceRating` ADD CONSTRAINT `EmployeeCompetenceRating_reviewId_fkey` FOREIGN KEY (`reviewId`) REFERENCES `EmployeeReview`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `EmployeeCompetenceRating` ADD CONSTRAINT `EmployeeCompetenceRating_assessedById_fkey` FOREIGN KEY (`assessedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `HazardousWasteDelivery` ADD CONSTRAINT `HazardousWasteDelivery_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `HazardousWasteDelivery` ADD CONSTRAINT `HazardousWasteDelivery_aspectId_fkey` FOREIGN KEY (`aspectId`) REFERENCES `EnvironmentalAspect`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `HazardousWasteDelivery` ADD CONSTRAINT `HazardousWasteDelivery_declaredById_fkey` FOREIGN KEY (`declaredById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
