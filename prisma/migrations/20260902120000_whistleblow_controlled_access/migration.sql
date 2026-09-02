-- Kontrollert sakbasert tilgang i varslingsmodulen
-- AML kap. 2 A / GDPR art. 5, 9 og 32 / POL § 16

ALTER TABLE `User`
  ADD COLUMN `totpSecret` TEXT NULL,
  ADD COLUMN `totpEnabledAt` DATETIME(3) NULL;

CREATE TABLE `WhistleblowIdentity` (
  `id` VARCHAR(191) NOT NULL,
  `whistleblowingId` VARCHAR(191) NOT NULL,
  `reporterName` VARCHAR(191) NULL,
  `reporterEmail` VARCHAR(191) NULL,
  `reporterPhone` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `WhistleblowIdentity_whistleblowingId_key` (`whistleblowingId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `WhistleblowIdentity` (`id`, `whistleblowingId`, `reporterName`, `reporterEmail`, `reporterPhone`, `createdAt`, `updatedAt`)
SELECT CONCAT('wid_', `id`), `id`, `reporterName`, `reporterEmail`, `reporterPhone`, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM `Whistleblowing`
WHERE `reporterName` IS NOT NULL OR `reporterEmail` IS NOT NULL OR `reporterPhone` IS NOT NULL;

ALTER TABLE `Whistleblowing`
  DROP COLUMN `reporterName`,
  DROP COLUMN `reporterEmail`,
  DROP COLUMN `reporterPhone`;

CREATE TABLE `WhistleblowParty` (
  `id` VARCHAR(191) NOT NULL,
  `whistleblowingId` VARCHAR(191) NOT NULL,
  `role` ENUM('ACCUSED', 'WITNESS', 'MENTIONED') NOT NULL,
  `userId` VARCHAR(191) NULL,
  `displayName` VARCHAR(191) NULL,
  `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `WhistleblowParty_whistleblowingId_idx` (`whistleblowingId`),
  INDEX `WhistleblowParty_userId_idx` (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `WhistleblowAccessGrant` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `whistleblowingId` VARCHAR(191) NOT NULL,
  `granteeId` VARCHAR(191) NOT NULL,
  `grantedById` VARCHAR(191) NOT NULL,
  `type` ENUM('ASSIGN', 'ASSIST', 'MEASURE', 'STATEMENT', 'BREAK_GLASS') NOT NULL,
  `objects` TEXT NOT NULL,
  `purpose` TEXT NOT NULL,
  `impartialityConfirmedAt` DATETIME(3) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `revokedAt` DATETIME(3) NULL,
  `revokedById` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `WhistleblowAccessGrant_tenantId_idx` (`tenantId`),
  INDEX `WhistleblowAccessGrant_whistleblowingId_idx` (`whistleblowingId`),
  INDEX `WhistleblowAccessGrant_granteeId_idx` (`granteeId`),
  INDEX `WhistleblowAccessGrant_expiresAt_idx` (`expiresAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `WhistleblowMeasure` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `whistleblowingId` VARCHAR(191) NOT NULL,
  `grantId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NOT NULL,
  `dueAt` DATETIME(3) NULL,
  `status` ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  `completedAt` DATETIME(3) NULL,
  `completionNote` TEXT NULL,
  `createdById` VARCHAR(191) NOT NULL,
  `assigneeId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `WhistleblowMeasure_grantId_key` (`grantId`),
  INDEX `WhistleblowMeasure_tenantId_idx` (`tenantId`),
  INDEX `WhistleblowMeasure_assigneeId_idx` (`assigneeId`),
  INDEX `WhistleblowMeasure_whistleblowingId_idx` (`whistleblowingId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `WhistleblowStatement` (
  `id` VARCHAR(191) NOT NULL,
  `whistleblowingId` VARCHAR(191) NOT NULL,
  `grantId` VARCHAR(191) NOT NULL,
  `summary` TEXT NOT NULL,
  `dueAt` DATETIME(3) NULL,
  `status` ENUM('PENDING', 'SUBMITTED', 'CLOSED') NOT NULL DEFAULT 'PENDING',
  `response` TEXT NULL,
  `submittedAt` DATETIME(3) NULL,
  `createdById` VARCHAR(191) NOT NULL,
  `assigneeId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `WhistleblowStatement_grantId_key` (`grantId`),
  INDEX `WhistleblowStatement_whistleblowingId_idx` (`whistleblowingId`),
  INDEX `WhistleblowStatement_assigneeId_idx` (`assigneeId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `WhistleblowAuditLog` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `whistleblowingId` VARCHAR(191) NULL,
  `userId` VARCHAR(191) NOT NULL,
  `action` ENUM(
    'VIEW',
    'DOWNLOAD',
    'PRINT',
    'GRANT',
    'REVOKE',
    'EDIT',
    'IDENTITY_VIEW',
    'BREAK_GLASS_REQUEST',
    'BREAK_GLASS_APPROVE',
    'BREAK_GLASS_DENY',
    'BREAK_GLASS_REVOKE',
    'GDPR_ACCESS_ASSESSMENT',
    'STEP_UP'
  ) NOT NULL,
  `object` VARCHAR(191) NULL,
  `metadata` TEXT NULL,
  `ipAddress` VARCHAR(191) NULL,
  `userAgent` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `WhistleblowAuditLog_tenantId_idx` (`tenantId`),
  INDEX `WhistleblowAuditLog_whistleblowingId_idx` (`whistleblowingId`),
  INDEX `WhistleblowAuditLog_userId_idx` (`userId`),
  INDEX `WhistleblowAuditLog_createdAt_idx` (`createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `WhistleblowBreakGlassRequest` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `whistleblowingId` VARCHAR(191) NULL,
  `requesterId` VARCHAR(191) NOT NULL,
  `purpose` TEXT NOT NULL,
  `requestedHours` INTEGER NOT NULL DEFAULT 4,
  `status` ENUM('PENDING', 'APPROVED', 'DENIED', 'EXPIRED', 'REVOKED') NOT NULL DEFAULT 'PENDING',
  `decidedById` VARCHAR(191) NULL,
  `decidedAt` DATETIME(3) NULL,
  `decisionNote` TEXT NULL,
  `grantId` VARCHAR(191) NULL,
  `expiresAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `WhistleblowBreakGlassRequest_tenantId_idx` (`tenantId`),
  INDEX `WhistleblowBreakGlassRequest_status_idx` (`status`),
  INDEX `WhistleblowBreakGlassRequest_requesterId_idx` (`requesterId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `WhistleblowGdprAssessment` (
  `id` VARCHAR(191) NOT NULL,
  `whistleblowingId` VARCHAR(191) NOT NULL,
  `assessedById` VARCHAR(191) NOT NULL,
  `decision` ENUM('WITHHOLD', 'DISCLOSE', 'PARTIAL') NOT NULL,
  `legalBasis` VARCHAR(191) NOT NULL,
  `rationale` TEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `WhistleblowGdprAssessment_whistleblowingId_idx` (`whistleblowingId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `WhistleblowIdentity`
  ADD CONSTRAINT `WhistleblowIdentity_whistleblowingId_fkey`
  FOREIGN KEY (`whistleblowingId`) REFERENCES `Whistleblowing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `WhistleblowParty`
  ADD CONSTRAINT `WhistleblowParty_whistleblowingId_fkey`
  FOREIGN KEY (`whistleblowingId`) REFERENCES `Whistleblowing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `WhistleblowParty`
  ADD CONSTRAINT `WhistleblowParty_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `WhistleblowAccessGrant`
  ADD CONSTRAINT `WhistleblowAccessGrant_tenantId_fkey`
  FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `WhistleblowAccessGrant`
  ADD CONSTRAINT `WhistleblowAccessGrant_whistleblowingId_fkey`
  FOREIGN KEY (`whistleblowingId`) REFERENCES `Whistleblowing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `WhistleblowAccessGrant`
  ADD CONSTRAINT `WhistleblowAccessGrant_granteeId_fkey`
  FOREIGN KEY (`granteeId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `WhistleblowAccessGrant`
  ADD CONSTRAINT `WhistleblowAccessGrant_grantedById_fkey`
  FOREIGN KEY (`grantedById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `WhistleblowMeasure`
  ADD CONSTRAINT `WhistleblowMeasure_tenantId_fkey`
  FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `WhistleblowMeasure`
  ADD CONSTRAINT `WhistleblowMeasure_whistleblowingId_fkey`
  FOREIGN KEY (`whistleblowingId`) REFERENCES `Whistleblowing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `WhistleblowMeasure`
  ADD CONSTRAINT `WhistleblowMeasure_grantId_fkey`
  FOREIGN KEY (`grantId`) REFERENCES `WhistleblowAccessGrant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `WhistleblowMeasure`
  ADD CONSTRAINT `WhistleblowMeasure_createdById_fkey`
  FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `WhistleblowMeasure`
  ADD CONSTRAINT `WhistleblowMeasure_assigneeId_fkey`
  FOREIGN KEY (`assigneeId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `WhistleblowStatement`
  ADD CONSTRAINT `WhistleblowStatement_whistleblowingId_fkey`
  FOREIGN KEY (`whistleblowingId`) REFERENCES `Whistleblowing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `WhistleblowStatement`
  ADD CONSTRAINT `WhistleblowStatement_grantId_fkey`
  FOREIGN KEY (`grantId`) REFERENCES `WhistleblowAccessGrant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `WhistleblowStatement`
  ADD CONSTRAINT `WhistleblowStatement_createdById_fkey`
  FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `WhistleblowStatement`
  ADD CONSTRAINT `WhistleblowStatement_assigneeId_fkey`
  FOREIGN KEY (`assigneeId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `WhistleblowAuditLog`
  ADD CONSTRAINT `WhistleblowAuditLog_tenantId_fkey`
  FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `WhistleblowAuditLog`
  ADD CONSTRAINT `WhistleblowAuditLog_whistleblowingId_fkey`
  FOREIGN KEY (`whistleblowingId`) REFERENCES `Whistleblowing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `WhistleblowAuditLog`
  ADD CONSTRAINT `WhistleblowAuditLog_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `WhistleblowBreakGlassRequest`
  ADD CONSTRAINT `WhistleblowBreakGlassRequest_tenantId_fkey`
  FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `WhistleblowBreakGlassRequest`
  ADD CONSTRAINT `WhistleblowBreakGlassRequest_whistleblowingId_fkey`
  FOREIGN KEY (`whistleblowingId`) REFERENCES `Whistleblowing`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `WhistleblowBreakGlassRequest`
  ADD CONSTRAINT `WhistleblowBreakGlassRequest_requesterId_fkey`
  FOREIGN KEY (`requesterId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `WhistleblowBreakGlassRequest`
  ADD CONSTRAINT `WhistleblowBreakGlassRequest_decidedById_fkey`
  FOREIGN KEY (`decidedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `WhistleblowGdprAssessment`
  ADD CONSTRAINT `WhistleblowGdprAssessment_whistleblowingId_fkey`
  FOREIGN KEY (`whistleblowingId`) REFERENCES `Whistleblowing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `WhistleblowGdprAssessment`
  ADD CONSTRAINT `WhistleblowGdprAssessment_assessedById_fkey`
  FOREIGN KEY (`assessedById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Notification`
  MODIFY `type` ENUM(
    'NEW_INCIDENT',
    'INCIDENT_UPDATED',
    'INCIDENT_CLOSED',
    'INCIDENT_OVERDUE',
    'FORM_SUBMITTED',
    'FORM_APPROVED',
    'FORM_REJECTED',
    'WHISTLEBLOWING',
    'WHISTLEBLOWING_MSG',
    'MEASURE_OVERDUE',
    'MEASURE_ASSIGNED',
    'MEASURE_DUE_SOON',
    'MEASURE_REMINDER',
    'AUDIT_SCHEDULED',
    'AUDIT_REMINDER',
    'AUDIT_FINDING_OPEN',
    'TRAINING_DUE',
    'TRAINING_EXPIRED',
    'TRAINING_ASSIGNED',
    'MEETING_REMINDER',
    'MEETING_SCHEDULED',
    'INSPECTION_REMINDER',
    'INSPECTION_SCHEDULED',
    'INSPECTION_OVERDUE',
    'INSPECTION_FINDING',
    'RISK_REVIEW_DUE',
    'RISK_HIGH_SCORE',
    'RISK_CONTROL_DUE',
    'DOCUMENT_REVIEW_DUE',
    'DOCUMENT_EXPIRED',
    'DOCUMENT_APPROVED',
    'ROUTINE_ASSIGNED',
    'ROUTINE_REVIEW_DUE',
    'CHEMICAL_SDS_REVIEW',
    'CHEMICAL_EXPIRED',
    'GOAL_AT_RISK',
    'GOAL_MEASUREMENT_DUE',
    'ENVIRONMENTAL_LIMIT',
    'MGMT_REVIEW_DUE',
    'MGMT_REVIEW_SCHEDULED',
    'EMPLOYEE_REVIEW_DUE',
    'EMPLOYEE_REVIEW_UPCOMING',
    'EMPLOYEE_REVIEW_SIGN',
    'DAILY_DIGEST',
    'WEEKLY_DIGEST',
    'SYSTEM_ALERT',
    'GUEST_SUBMISSION',
    'SUPPORT_TICKET',
    'SUPPORT_MSG',
    'IMPROVEMENT_SUGGESTION',
    'IMPROVEMENT_REMINDER',
    'HMS_SCORE_DROP',
    'HMS_SCORE_MILESTONE',
    'ROUTINE_COMPLIANCE_ALERT',
    'LAW_CHANGE_ALERT',
    'HANDBOOK_APPROVAL_REQUESTED',
    'HANDBOOK_NEW_VERSION',
    'ABSENCE_REQUESTED',
    'ABSENCE_APPROVED',
    'ABSENCE_REJECTED',
    'SICK_LEAVE_PLAN_DUE',
    'SICK_LEAVE_DIALOG_DUE',
    'SICK_LEAVE_OVERDUE',
    'BOARDING_TASK_ASSIGNED',
    'BOARDING_TASK_OVERDUE',
    'BOARDING_COMPLETED',
    'GOAL_UPDATED',
    'GOAL_COMPLETED',
    'GOAL_OVERDUE',
    'CONFIDENTIAL_ACCESS',
    'BREAK_GLASS_REQUEST'
  ) NOT NULL;
