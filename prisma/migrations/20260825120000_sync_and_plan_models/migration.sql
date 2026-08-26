-- Synkroniser manglende tabeller og legg til nye modeller fra plan:
-- Rutinekobling, versjonering, regelverksmotor, serviceforesporsel

-- ============================================
-- 1. Synk: RiskAssessment CREATE TABLE (kun ALTER finnes fra før)
--    Tabellen er allerede opprettet via db push, så vi bruker IF NOT EXISTS-logikk
--    via CREATE TABLE ... som Prisma-format
-- ============================================

-- relatedRoutineId og areaTag på Incident (allerede i schema, mangler migrasjon)
-- Sjekk om kolonnene allerede finnes (fra db push)
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Incident' AND COLUMN_NAME = 'relatedRoutineId');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `Incident` ADD COLUMN `relatedRoutineId` VARCHAR(191) NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Incident' AND COLUMN_NAME = 'areaTag');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `Incident` ADD COLUMN `areaTag` VARCHAR(191) NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Indexes for relatedRoutineId og areaTag (idempotent)
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Incident' AND INDEX_NAME = 'Incident_relatedRoutineId_idx');
SET @sql = IF(@idx_exists = 0, 'CREATE INDEX `Incident_relatedRoutineId_idx` ON `Incident`(`relatedRoutineId`)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Incident' AND INDEX_NAME = 'Incident_areaTag_idx');
SET @sql = IF(@idx_exists = 0, 'CREATE INDEX `Incident_areaTag_idx` ON `Incident`(`areaTag`)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- 2. Synk: HMS AI tabeller (PatternCache, ImprovementSuggestion, ImprovementLog, TenantHmsScore)
-- ============================================

CREATE TABLE IF NOT EXISTS `PatternCache` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `patternType` ENUM('RECURRING_INCIDENT','INSPECTION_TREND','TRAINING_GAP','RISK_ESCALATION','MEASURE_INEFFECTIVE','COMPLIANCE_DRIFT','RUH_TREND','SJA_COVERAGE_GAP','CHEMICAL_COMPLIANCE','FIRE_SAFETY_GAP','MANAGEMENT_REVIEW_OVERDUE') NOT NULL,
    `patternKey` VARCHAR(191) NOT NULL,
    `matchCount` INTEGER NOT NULL,
    `firstSeen` DATETIME(3) NOT NULL,
    `lastSeen` DATETIME(3) NOT NULL,
    `severity` INTEGER NOT NULL,
    `linkedIncidentIds` JSON NOT NULL DEFAULT ('[]'),
    `linkedFindingIds` JSON NOT NULL DEFAULT ('[]'),
    `linkedRuhIds` JSON NOT NULL DEFAULT ('[]'),
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `resolvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `PatternCache_tenantId_patternKey_key`(`tenantId`, `patternKey`),
    INDEX `PatternCache_tenantId_isActive_idx`(`tenantId`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ImprovementSuggestion` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `patternCacheId` VARCHAR(191) NOT NULL,
    `suggestionType` ENUM('UPDATE_ROUTINE','CREATE_ROUTINE','UPDATE_HANDBOOK','ADD_TRAINING','ADD_RISK_ASSESSMENT','UPDATE_SJA_TEMPLATE','SCHEDULE_INSPECTION') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `legalBasis` VARCHAR(191) NULL,
    `targetRoutineId` VARCHAR(191) NULL,
    `targetSectionKey` VARCHAR(191) NULL,
    `priority` INTEGER NOT NULL,
    `status` ENUM('PENDING','ACCEPTED','REJECTED','IMPLEMENTED') NOT NULL DEFAULT 'PENDING',
    `decidedById` VARCHAR(191) NULL,
    `decidedAt` DATETIME(3) NULL,
    `decisionNote` TEXT NULL,
    `implementedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `ImprovementSuggestion_tenantId_status_idx`(`tenantId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ImprovementLog` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `changeType` ENUM('ROUTINE_UPDATED','ROUTINE_CREATED','TRAINING_ADDED','RISK_REASSESSED','SJA_UPDATED','INSPECTION_SCHEDULED','HANDBOOK_REVIEWED','MEASURE_ADDED') NOT NULL,
    `description` TEXT NOT NULL,
    `legalReference` VARCHAR(191) NULL,
    `suggestionId` VARCHAR(191) NULL,
    `routineId` VARCHAR(191) NULL,
    `incidentIds` JSON NOT NULL DEFAULT ('[]'),
    `beforeSnapshot` JSON NULL,
    `afterSnapshot` JSON NULL,
    `changedById` VARCHAR(191) NOT NULL,
    `changedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `followUpDate` DATETIME(3) NULL,
    `effectReviewed` BOOLEAN NOT NULL DEFAULT false,
    `effectNote` TEXT NULL,
    INDEX `ImprovementLog_tenantId_changedAt_idx`(`tenantId`, `changedAt`),
    INDEX `ImprovementLog_suggestionId_idx`(`suggestionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `TenantHmsScore` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `incidentScore` INTEGER NOT NULL,
    `routineScore` INTEGER NOT NULL,
    `inspectionScore` INTEGER NOT NULL,
    `trainingScore` INTEGER NOT NULL,
    `riskScore` INTEGER NOT NULL,
    `measureScore` INTEGER NOT NULL,
    `handbookScore` INTEGER NOT NULL,
    `overallScore` INTEGER NOT NULL,
    `trend` ENUM('IMPROVING','STABLE','DECLINING') NOT NULL,
    `scoreDate` DATETIME(3) NOT NULL,
    `openIncidents` INTEGER NOT NULL,
    `overdueMeasures` INTEGER NOT NULL,
    `expiredTraining` INTEGER NOT NULL,
    `routinesNeedReview` INTEGER NOT NULL,
    `pendingSuggestions` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `TenantHmsScore_tenantId_scoreDate_idx`(`tenantId`, `scoreDate`),
    UNIQUE INDEX `TenantHmsScore_tenantId_scoreDate_key`(`tenantId`, `scoreDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- FKs for synk-tabeller (idempotent: sjekk om constraint finnes forst)
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'PatternCache' AND CONSTRAINT_NAME = 'PatternCache_tenantId_fkey');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `PatternCache` ADD CONSTRAINT `PatternCache_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'ImprovementSuggestion' AND CONSTRAINT_NAME = 'ImprovementSuggestion_tenantId_fkey');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `ImprovementSuggestion` ADD CONSTRAINT `ImprovementSuggestion_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'ImprovementSuggestion' AND CONSTRAINT_NAME = 'ImprovementSuggestion_patternCacheId_fkey');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `ImprovementSuggestion` ADD CONSTRAINT `ImprovementSuggestion_patternCacheId_fkey` FOREIGN KEY (`patternCacheId`) REFERENCES `PatternCache`(`id`) ON DELETE CASCADE ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'ImprovementLog' AND CONSTRAINT_NAME = 'ImprovementLog_tenantId_fkey');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `ImprovementLog` ADD CONSTRAINT `ImprovementLog_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'ImprovementLog' AND CONSTRAINT_NAME = 'ImprovementLog_suggestionId_fkey');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `ImprovementLog` ADD CONSTRAINT `ImprovementLog_suggestionId_fkey` FOREIGN KEY (`suggestionId`) REFERENCES `ImprovementSuggestion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'TenantHmsScore' AND CONSTRAINT_NAME = 'TenantHmsScore_tenantId_fkey');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `TenantHmsScore` ADD CONSTRAINT `TenantHmsScore_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ============================================
-- 3. Nye Tenant-felter (NACE, subIndustry, serviceOfferDismissed)
-- ============================================

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Tenant' AND COLUMN_NAME = 'naceCode');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `Tenant` ADD COLUMN `naceCode` VARCHAR(191) NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Tenant' AND COLUMN_NAME = 'naceDescription');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `Tenant` ADD COLUMN `naceDescription` VARCHAR(191) NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Tenant' AND COLUMN_NAME = 'subIndustry');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `Tenant` ADD COLUMN `subIndustry` VARCHAR(191) NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Tenant' AND COLUMN_NAME = 'serviceOfferDismissed');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `Tenant` ADD COLUMN `serviceOfferDismissed` BOOLEAN NOT NULL DEFAULT false', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- 4. RoutineVersion (endringshistorikk for rutiner, IK-HMS § 5 nr. 7-8)
-- ============================================

CREATE TABLE IF NOT EXISTS `RoutineVersion` (
    `id` VARCHAR(191) NOT NULL,
    `routineId` VARCHAR(191) NOT NULL,
    `versionNumber` INTEGER NOT NULL,
    `changeNumber` VARCHAR(191) NOT NULL,
    `changeSummary` TEXT NOT NULL,
    `changeReason` TEXT NULL,
    `content` JSON NOT NULL,
    `legalReference` VARCHAR(191) NULL,
    `changedById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `RoutineVersion_routineId_idx`(`routineId`),
    UNIQUE INDEX `RoutineVersion_routineId_versionNumber_key`(`routineId`, `versionNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'RoutineVersion' AND CONSTRAINT_NAME = 'RoutineVersion_routineId_fkey');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `RoutineVersion` ADD CONSTRAINT `RoutineVersion_routineId_fkey` FOREIGN KEY (`routineId`) REFERENCES `Routine`(`id`) ON DELETE CASCADE ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'RoutineVersion' AND CONSTRAINT_NAME = 'RoutineVersion_changedById_fkey');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `RoutineVersion` ADD CONSTRAINT `RoutineVersion_changedById_fkey` FOREIGN KEY (`changedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ============================================
-- 5. RiskRoutineLink (kobling risiko <-> rutine)
-- ============================================

CREATE TABLE IF NOT EXISTS `RiskRoutineLink` (
    `id` VARCHAR(191) NOT NULL,
    `riskId` VARCHAR(191) NOT NULL,
    `routineId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `RiskRoutineLink_riskId_routineId_key`(`riskId`, `routineId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'RiskRoutineLink' AND CONSTRAINT_NAME = 'RiskRoutineLink_riskId_fkey');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `RiskRoutineLink` ADD CONSTRAINT `RiskRoutineLink_riskId_fkey` FOREIGN KEY (`riskId`) REFERENCES `Risk`(`id`) ON DELETE CASCADE ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'RiskRoutineLink' AND CONSTRAINT_NAME = 'RiskRoutineLink_routineId_fkey');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `RiskRoutineLink` ADD CONSTRAINT `RiskRoutineLink_routineId_fkey` FOREIGN KEY (`routineId`) REFERENCES `Routine`(`id`) ON DELETE CASCADE ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ============================================
-- 6. Mitt Regelverk: TenantActivityProfile, RegulatoryRequirement, TenantRegulatoryProfile
-- ============================================

CREATE TABLE IF NOT EXISTS `TenantActivityProfile` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `answers` JSON NOT NULL,
    `activeActivities` JSON NOT NULL,
    `completedAt` DATETIME(3) NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `TenantActivityProfile_tenantId_key`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'TenantActivityProfile' AND CONSTRAINT_NAME = 'TenantActivityProfile_tenantId_fkey');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `TenantActivityProfile` ADD CONSTRAINT `TenantActivityProfile_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS `RegulatoryRequirement` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `legalBasis` VARCHAR(191) NOT NULL,
    `sourceUrl` VARCHAR(191) NULL,
    `triggerActivities` JSON NOT NULL,
    `hmsNovaFeature` VARCHAR(191) NULL,
    `hmsNovaRoute` VARCHAR(191) NULL,
    `routineCategory` VARCHAR(191) NULL,
    `severity` VARCHAR(191) NOT NULL DEFAULT 'MANDATORY',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `TenantRegulatoryProfile` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `generatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `requirements` JSON NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `TenantRegulatoryProfile_tenantId_key`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'TenantRegulatoryProfile' AND CONSTRAINT_NAME = 'TenantRegulatoryProfile_tenantId_fkey');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `TenantRegulatoryProfile` ADD CONSTRAINT `TenantRegulatoryProfile_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ============================================
-- 7. ServiceRequest (serviceforesporsel for HMS-oppsett)
-- ============================================

CREATE TABLE IF NOT EXISTS `ServiceRequest` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `type` ENUM('FULL_SETUP','RISK_ASSESSMENT','ROUTINE_SETUP','HANDBOOK_SETUP','REGULATORY_PROFILE','CUSTOM') NOT NULL,
    `status` ENUM('PENDING','QUOTED','ACCEPTED','IN_PROGRESS','COMPLETED','CANCELLED') NOT NULL DEFAULT 'PENDING',
    `description` TEXT NULL,
    `price` INTEGER NULL,
    `notes` TEXT NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `ServiceRequest_tenantId_idx`(`tenantId`),
    INDEX `ServiceRequest_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'ServiceRequest' AND CONSTRAINT_NAME = 'ServiceRequest_tenantId_fkey');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `ServiceRequest` ADD CONSTRAINT `ServiceRequest_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
