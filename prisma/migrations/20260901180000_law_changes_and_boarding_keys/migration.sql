-- Lovendringer (IK-HMS § 5 nr. 1 og nr. 2, ISO 45001:2018 6.1.3)
-- og kilde-nøkler for synk av onboarding-maler.

CREATE TABLE `LawChange` (
    `id` VARCHAR(191) NOT NULL,
    `source` VARCHAR(191) NOT NULL,
    `externalId` VARCHAR(191) NOT NULL,
    `title` TEXT NOT NULL,
    `summary` TEXT NULL,
    `sourceUrl` TEXT NOT NULL,
    `publishedAt` DATETIME(3) NULL,
    `matchedKeywords` JSON NOT NULL,
    `affectedIndustries` JSON NOT NULL,
    `legalReferenceIds` JSON NOT NULL,
    `requirementIds` JSON NOT NULL,
    `status` ENUM('DETECTED', 'PUBLISHED', 'DISMISSED') NOT NULL DEFAULT 'DETECTED',
    `customerSummary` TEXT NULL,
    `notifiedAt` DATETIME(3) NULL,
    `notifiedById` VARCHAR(191) NULL,
    `notifiedTenantCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `LawChange_source_externalId_key`(`source`, `externalId`),
    INDEX `LawChange_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `LawChangeScan` (
    `id` VARCHAR(191) NOT NULL,
    `startedAt` DATETIME(3) NOT NULL,
    `finishedAt` DATETIME(3) NOT NULL,
    `fetched` INTEGER NOT NULL DEFAULT 0,
    `matched` INTEGER NOT NULL DEFAULT 0,
    `created` INTEGER NOT NULL DEFAULT 0,
    `error` TEXT NULL,

    INDEX `LawChangeScan_startedAt_idx`(`startedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `BoardingTemplate` ADD COLUMN `sourceKey` VARCHAR(191) NULL;
CREATE INDEX `BoardingTemplate_tenantId_sourceKey_idx` ON `BoardingTemplate`(`tenantId`, `sourceKey`);

ALTER TABLE `BoardingTemplateTask` ADD COLUMN `sourceKey` VARCHAR(191) NULL;
CREATE INDEX `BoardingTemplateTask_templateId_sourceKey_idx` ON `BoardingTemplateTask`(`templateId`, `sourceKey`);
