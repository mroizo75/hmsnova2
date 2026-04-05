-- DocumentSignature: Digital signatur på dokumenter (IK-HMS § 5)
CREATE TABLE `DocumentSignature` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `documentId` VARCHAR(191) NOT NULL,
    `signedById` VARCHAR(191) NOT NULL,
    `role` ENUM('UTARBEIDET_AV', 'KONTROLLERT_AV', 'GODKJENT_AV') NOT NULL,
    `signatureImg` MEDIUMTEXT NOT NULL,
    `comment` TEXT NULL,
    `signedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `DocumentSignature_documentId_signedById_role_key`(`documentId`, `signedById`, `role`),
    INDEX `DocumentSignature_tenantId_idx`(`tenantId`),
    INDEX `DocumentSignature_documentId_idx`(`documentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- OrgChartNode: Organisasjonskart – hierarkisk trestruktur (AML § 3-1)
CREATE TABLE `OrgChartNode` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `parentId` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `department` VARCHAR(191) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `OrgChartNode_tenantId_idx`(`tenantId`),
    INDEX `OrgChartNode_parentId_idx`(`parentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Foreign keys
ALTER TABLE `DocumentSignature` ADD CONSTRAINT `DocumentSignature_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `DocumentSignature` ADD CONSTRAINT `DocumentSignature_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `Document`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `DocumentSignature` ADD CONSTRAINT `DocumentSignature_signedById_fkey` FOREIGN KEY (`signedById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `OrgChartNode` ADD CONSTRAINT `OrgChartNode_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `OrgChartNode` ADD CONSTRAINT `OrgChartNode_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `OrgChartNode`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
