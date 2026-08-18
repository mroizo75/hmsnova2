-- HMS Nova Safety Intelligence Platform
-- Anonymisert datamotor for bransjestatistikk, benchmarks og prediktiv risikoscoring

CREATE TABLE `IntelligenceConsent` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `optedIn` BOOLEAN NOT NULL DEFAULT false,
    `optedInAt` DATETIME(3) NULL,
    `optedOutAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `IntelligenceConsent_tenantId_key`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `IndustrySnapshot` (
    `id` VARCHAR(191) NOT NULL,
    `industry` VARCHAR(191) NOT NULL,
    `period` VARCHAR(191) NOT NULL,
    `periodType` VARCHAR(191) NOT NULL,
    `tenantCount` INTEGER NOT NULL,
    `employeeCount` INTEGER NOT NULL,
    `incidentCount` INTEGER NOT NULL,
    `incidentsByType` JSON NOT NULL,
    `incidentsBySeverity` JSON NOT NULL,
    `avgMttr` DOUBLE NULL,
    `trir` DOUBLE NULL,
    `ltir` DOUBLE NULL,
    `avgRiskScore` DOUBLE NULL,
    `risksByCategory` JSON NOT NULL,
    `risksOpenCount` INTEGER NOT NULL,
    `measuresTotal` INTEGER NOT NULL,
    `measuresCompleted` INTEGER NOT NULL,
    `avgMeasureTime` DOUBLE NULL,
    `trainingComplianceRate` DOUBLE NULL,
    `expiredTrainingCount` INTEGER NOT NULL,
    `inspectionCount` INTEGER NOT NULL,
    `findingsAvgSeverity` DOUBLE NULL,
    `highRiskChemicalCount` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `IndustrySnapshot_industry_idx`(`industry`),
    INDEX `IndustrySnapshot_periodType_period_idx`(`periodType`, `period`),
    UNIQUE INDEX `IndustrySnapshot_industry_period_periodType_key`(`industry`, `period`, `periodType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TenantIntelligenceScore` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `period` VARCHAR(191) NOT NULL,
    `overallScore` DOUBLE NOT NULL,
    `riskScore` DOUBLE NOT NULL,
    `complianceScore` DOUBLE NOT NULL,
    `trendDirection` VARCHAR(191) NOT NULL,
    `incidentScore` DOUBLE NOT NULL,
    `trainingScore` DOUBLE NOT NULL,
    `measureScore` DOUBLE NOT NULL,
    `inspectionScore` DOUBLE NOT NULL,
    `industryPercentile` INTEGER NULL,
    `factors` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TenantIntelligenceScore_tenantId_idx`(`tenantId`),
    INDEX `TenantIntelligenceScore_period_idx`(`period`),
    UNIQUE INDEX `TenantIntelligenceScore_tenantId_period_key`(`tenantId`, `period`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TrendDataPoint` (
    `id` VARCHAR(191) NOT NULL,
    `industry` VARCHAR(191) NULL,
    `metric` VARCHAR(191) NOT NULL,
    `period` VARCHAR(191) NOT NULL,
    `value` DOUBLE NOT NULL,
    `prevValue` DOUBLE NULL,
    `changePercent` DOUBLE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TrendDataPoint_metric_period_idx`(`metric`, `period`),
    UNIQUE INDEX `TrendDataPoint_industry_metric_period_key`(`industry`, `metric`, `period`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `IntelligenceApiKey` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `hashedKey` VARCHAR(191) NOT NULL,
    `permissions` JSON NOT NULL,
    `rateLimit` INTEGER NOT NULL DEFAULT 100,
    `expiresAt` DATETIME(3) NULL,
    `lastUsedAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `IntelligenceApiKey_hashedKey_key`(`hashedKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `IntelligenceApiLog` (
    `id` VARCHAR(191) NOT NULL,
    `apiKeyId` VARCHAR(191) NOT NULL,
    `endpoint` VARCHAR(191) NOT NULL,
    `params` JSON NULL,
    `responseMs` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `IntelligenceApiLog_apiKeyId_idx`(`apiKeyId`),
    INDEX `IntelligenceApiLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `IntelligenceConsent` ADD CONSTRAINT `IntelligenceConsent_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `TenantIntelligenceScore` ADD CONSTRAINT `TenantIntelligenceScore_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `IntelligenceApiLog` ADD CONSTRAINT `IntelligenceApiLog_apiKeyId_fkey` FOREIGN KEY (`apiKeyId`) REFERENCES `IntelligenceApiKey`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
