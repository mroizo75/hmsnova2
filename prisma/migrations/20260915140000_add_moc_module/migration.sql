-- Management of Change (ISO 45001:2018 8.1.3, IK-HMS § 5 nr. 2 og nr. 6)

ALTER TABLE `Tenant`
  ADD COLUMN `mocModuleEnabled` BOOLEAN NOT NULL DEFAULT false;

UPDATE `Tenant`
SET `mocModuleEnabled` = true
WHERE LOWER(`industry`) IN (
  'oil_gas',
  'offshore',
  'manufacturing',
  'bergverk',
  'marine',
  'elektro',
  'construction'
);

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
    'BREAK_GLASS_REQUEST',
    'MOC_UPDATED'
  ) NOT NULL;

CREATE TABLE `ManagementOfChange` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `number` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NOT NULL,
  `changeType` ENUM('PROCESS','WORKPLACE','ORGANIZATION','CONDITIONS','EQUIPMENT','WORKFORCE','LEGAL','KNOWLEDGE','TECHNOLOGY') NOT NULL,
  `duration` ENUM('TEMPORARY','PERMANENT') NOT NULL DEFAULT 'PERMANENT',
  `source` ENUM('PLANNED','UNINTENDED') NOT NULL DEFAULT 'PLANNED',
  `classification` ENUM('MINOR','SIGNIFICANT','MAJOR') NOT NULL DEFAULT 'MINOR',
  `status` ENUM('DRAFT','IMPACT_ASSESSMENT','PENDING_APPROVAL','APPROVED','IMPLEMENTING','VERIFYING','CLOSED','REJECTED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  `proposedById` VARCHAR(191) NOT NULL,
  `responsibleId` VARCHAR(191) NULL,
  `approvedById` VARCHAR(191) NULL,
  `approvedAt` DATETIME(3) NULL,
  `rejectedReason` TEXT NULL,
  `impactAssessment` TEXT NULL,
  `hseImpact` TEXT NULL,
  `plannedStartAt` DATETIME(3) NULL,
  `plannedEndAt` DATETIME(3) NULL,
  `implementedAt` DATETIME(3) NULL,
  `informedAt` DATETIME(3) NULL,
  `verifiedAt` DATETIME(3) NULL,
  `verifiedById` VARCHAR(191) NULL,
  `verificationNote` TEXT NULL,
  `rollbackPlan` TEXT NULL,
  `cancelledReason` TEXT NULL,
  `voReviewedAt` DATETIME(3) NULL,
  `voReviewedById` VARCHAR(191) NULL,
  `projectId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`),
  UNIQUE INDEX `ManagementOfChange_tenantId_number_key` (`tenantId`, `number`),
  INDEX `ManagementOfChange_tenantId_idx` (`tenantId`),
  INDEX `ManagementOfChange_status_idx` (`status`),
  INDEX `ManagementOfChange_proposedById_idx` (`proposedById`),
  INDEX `ManagementOfChange_responsibleId_idx` (`responsibleId`),
  INDEX `ManagementOfChange_projectId_idx` (`projectId`),
  INDEX `ManagementOfChange_classification_idx` (`classification`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ManagementOfChange` ADD CONSTRAINT `ManagementOfChange_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ManagementOfChange` ADD CONSTRAINT `ManagementOfChange_proposedById_fkey` FOREIGN KEY (`proposedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `ManagementOfChange` ADD CONSTRAINT `ManagementOfChange_responsibleId_fkey` FOREIGN KEY (`responsibleId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `ManagementOfChange` ADD CONSTRAINT `ManagementOfChange_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `ManagementOfChange` ADD CONSTRAINT `ManagementOfChange_verifiedById_fkey` FOREIGN KEY (`verifiedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `ManagementOfChange` ADD CONSTRAINT `ManagementOfChange_voReviewedById_fkey` FOREIGN KEY (`voReviewedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `ManagementOfChange` ADD CONSTRAINT `ManagementOfChange_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Measure` ADD COLUMN `mocId` VARCHAR(191) NULL;
CREATE INDEX `Measure_mocId_idx` ON `Measure`(`mocId`);
ALTER TABLE `Measure` ADD CONSTRAINT `Measure_mocId_fkey` FOREIGN KEY (`mocId`) REFERENCES `ManagementOfChange`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `MocRiskLink` (
  `id` VARCHAR(191) NOT NULL,
  `mocId` VARCHAR(191) NOT NULL,
  `riskId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `MocRiskLink_mocId_riskId_key` (`mocId`, `riskId`),
  INDEX `MocRiskLink_riskId_idx` (`riskId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `MocRiskLink` ADD CONSTRAINT `MocRiskLink_mocId_fkey` FOREIGN KEY (`mocId`) REFERENCES `ManagementOfChange`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `MocRiskLink` ADD CONSTRAINT `MocRiskLink_riskId_fkey` FOREIGN KEY (`riskId`) REFERENCES `Risk`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `MocDocumentLink` (
  `id` VARCHAR(191) NOT NULL,
  `mocId` VARCHAR(191) NOT NULL,
  `documentId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `MocDocumentLink_mocId_documentId_key` (`mocId`, `documentId`),
  INDEX `MocDocumentLink_documentId_idx` (`documentId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `MocDocumentLink` ADD CONSTRAINT `MocDocumentLink_mocId_fkey` FOREIGN KEY (`mocId`) REFERENCES `ManagementOfChange`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `MocDocumentLink` ADD CONSTRAINT `MocDocumentLink_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `Document`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `MocRoutineLink` (
  `id` VARCHAR(191) NOT NULL,
  `mocId` VARCHAR(191) NOT NULL,
  `routineId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `MocRoutineLink_mocId_routineId_key` (`mocId`, `routineId`),
  INDEX `MocRoutineLink_routineId_idx` (`routineId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `MocRoutineLink` ADD CONSTRAINT `MocRoutineLink_mocId_fkey` FOREIGN KEY (`mocId`) REFERENCES `ManagementOfChange`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `MocRoutineLink` ADD CONSTRAINT `MocRoutineLink_routineId_fkey` FOREIGN KEY (`routineId`) REFERENCES `Routine`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `MocSjaLink` (
  `id` VARCHAR(191) NOT NULL,
  `mocId` VARCHAR(191) NOT NULL,
  `sjaAnalysisId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `MocSjaLink_mocId_sjaAnalysisId_key` (`mocId`, `sjaAnalysisId`),
  INDEX `MocSjaLink_sjaAnalysisId_idx` (`sjaAnalysisId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `MocSjaLink` ADD CONSTRAINT `MocSjaLink_mocId_fkey` FOREIGN KEY (`mocId`) REFERENCES `ManagementOfChange`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `MocSjaLink` ADD CONSTRAINT `MocSjaLink_sjaAnalysisId_fkey` FOREIGN KEY (`sjaAnalysisId`) REFERENCES `SjaAnalysis`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `MocIncidentLink` (
  `id` VARCHAR(191) NOT NULL,
  `mocId` VARCHAR(191) NOT NULL,
  `incidentId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `MocIncidentLink_mocId_incidentId_key` (`mocId`, `incidentId`),
  INDEX `MocIncidentLink_incidentId_idx` (`incidentId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `MocIncidentLink` ADD CONSTRAINT `MocIncidentLink_mocId_fkey` FOREIGN KEY (`mocId`) REFERENCES `ManagementOfChange`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `MocIncidentLink` ADD CONSTRAINT `MocIncidentLink_incidentId_fkey` FOREIGN KEY (`incidentId`) REFERENCES `Incident`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `MocAffectedUser` (
  `id` VARCHAR(191) NOT NULL,
  `mocId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `informedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `MocAffectedUser_mocId_userId_key` (`mocId`, `userId`),
  INDEX `MocAffectedUser_userId_idx` (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `MocAffectedUser` ADD CONSTRAINT `MocAffectedUser_mocId_fkey` FOREIGN KEY (`mocId`) REFERENCES `ManagementOfChange`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `MocAffectedUser` ADD CONSTRAINT `MocAffectedUser_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
