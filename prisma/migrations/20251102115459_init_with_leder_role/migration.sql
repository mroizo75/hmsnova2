-- CreateTable
CREATE TABLE `Account` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `providerAccountId` VARCHAR(191) NOT NULL,
    `refresh_token` TEXT NULL,
    `access_token` TEXT NULL,
    `expires_at` INTEGER NULL,
    `token_type` VARCHAR(191) NULL,
    `scope` VARCHAR(191) NULL,
    `id_token` TEXT NULL,
    `session_state` VARCHAR(191) NULL,

    INDEX `Account_userId_idx`(`userId`),
    UNIQUE INDEX `Account_provider_providerAccountId_key`(`provider`, `providerAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(191) NOT NULL,
    `sessionToken` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `expires` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Session_sessionToken_key`(`sessionToken`),
    INDEX `Session_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `emailVerified` DATETIME(3) NULL,
    `image` VARCHAR(191) NULL,
    `password` VARCHAR(191) NULL,
    `isSuperAdmin` BOOLEAN NOT NULL DEFAULT false,
    `isSupport` BOOLEAN NOT NULL DEFAULT false,
    `phone` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `postalCode` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_email_idx`(`email`),
    INDEX `User_isSuperAdmin_idx`(`isSuperAdmin`),
    INDEX `User_isSupport_idx`(`isSupport`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VerificationToken` (
    `identifier` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expires` DATETIME(3) NOT NULL,

    UNIQUE INDEX `VerificationToken_token_key`(`token`),
    UNIQUE INDEX `VerificationToken_identifier_token_key`(`identifier`, `token`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Tenant` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `orgNumber` VARCHAR(191) NULL,
    `slug` VARCHAR(191) NOT NULL,
    `status` ENUM('TRIAL', 'ACTIVE', 'SUSPENDED', 'CANCELLED') NOT NULL DEFAULT 'TRIAL',
    `trialEndsAt` DATETIME(3) NULL,
    `contactEmail` VARCHAR(191) NULL,
    `contactPhone` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `postalCode` VARCHAR(191) NULL,
    `fikenCompanyId` VARCHAR(191) NULL,
    `invoiceEmail` VARCHAR(191) NULL,
    `useEHF` BOOLEAN NOT NULL DEFAULT false,
    `invoiceAddress` VARCHAR(191) NULL,
    `invoicePostalCode` VARCHAR(191) NULL,
    `invoiceCity` VARCHAR(191) NULL,
    `employeeCount` INTEGER NULL,
    `pricingTier` ENUM('MICRO', 'SMALL', 'MEDIUM', 'LARGE') NULL,
    `industry` VARCHAR(191) NULL,
    `contactPerson` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `onboardingStatus` ENUM('NOT_STARTED', 'IN_PROGRESS', 'ADMIN_CREATED', 'DOCUMENTS_UPLOADED', 'TRAINING_SCHEDULED', 'COMPLETED') NOT NULL DEFAULT 'NOT_STARTED',
    `onboardingCompletedAt` DATETIME(3) NULL,
    `salesRep` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Tenant_slug_key`(`slug`),
    UNIQUE INDEX `Tenant_fikenCompanyId_key`(`fikenCompanyId`),
    INDEX `Tenant_status_idx`(`status`),
    INDEX `Tenant_fikenCompanyId_idx`(`fikenCompanyId`),
    INDEX `Tenant_pricingTier_idx`(`pricingTier`),
    INDEX `Tenant_onboardingStatus_idx`(`onboardingStatus`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GeneratedDocument` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `companyName` VARCHAR(191) NOT NULL,
    `orgNumber` VARCHAR(191) NULL,
    `industry` ENUM('CONSTRUCTION', 'HEALTHCARE', 'TRANSPORT', 'MANUFACTURING', 'RETAIL', 'HOSPITALITY', 'EDUCATION', 'TECHNOLOGY', 'AGRICULTURE', 'OTHER') NOT NULL,
    `employees` INTEGER NOT NULL,
    `ceoName` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NULL,
    `postalCode` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `hmsResponsible` VARCHAR(191) NULL,
    `hmsEmail` VARCHAR(191) NULL,
    `hmsPhone` VARCHAR(191) NULL,
    `safetyRep` VARCHAR(191) NULL,
    `safetyRepEmail` VARCHAR(191) NULL,
    `safetyRepPhone` VARCHAR(191) NULL,
    `hasBHT` BOOLEAN NOT NULL DEFAULT false,
    `bhtProvider` VARCHAR(191) NULL,
    `bhtContact` VARCHAR(191) NULL,
    `departments` JSON NULL,
    `completedTraining` JSON NULL,
    `companyDescription` TEXT NULL,
    `handbookKey` VARCHAR(191) NULL,
    `riskKey` VARCHAR(191) NULL,
    `trainingKey` VARCHAR(191) NULL,
    `vernerundeKey` VARCHAR(191) NULL,
    `amuKey` VARCHAR(191) NULL,
    `zipKey` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'GENERATING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `generatedAt` DATETIME(3) NULL,
    `downloadCount` INTEGER NOT NULL DEFAULT 0,
    `lastDownloadAt` DATETIME(3) NULL,
    `convertedToTrial` BOOLEAN NOT NULL DEFAULT false,
    `convertedAt` DATETIME(3) NULL,
    `marketingConsent` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `GeneratedDocument_email_idx`(`email`),
    INDEX `GeneratedDocument_industry_idx`(`industry`),
    INDEX `GeneratedDocument_status_idx`(`status`),
    INDEX `GeneratedDocument_createdAt_idx`(`createdAt`),
    INDEX `GeneratedDocument_convertedToTrial_idx`(`convertedToTrial`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Subscription` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `plan` ENUM('STARTER', 'PROFESSIONAL', 'ENTERPRISE') NOT NULL,
    `status` ENUM('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    `price` DOUBLE NOT NULL,
    `billingInterval` ENUM('MONTHLY', 'YEARLY') NOT NULL DEFAULT 'MONTHLY',
    `currentPeriodStart` DATETIME(3) NOT NULL,
    `currentPeriodEnd` DATETIME(3) NOT NULL,
    `cancelAtPeriodEnd` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Subscription_tenantId_key`(`tenantId`),
    INDEX `Subscription_tenantId_idx`(`tenantId`),
    INDEX `Subscription_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Invoice` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `fikenInvoiceId` VARCHAR(191) NULL,
    `invoiceNumber` VARCHAR(191) NULL,
    `amount` DOUBLE NOT NULL,
    `dueDate` DATETIME(3) NOT NULL,
    `paidDate` DATETIME(3) NULL,
    `status` ENUM('PENDING', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `period` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Invoice_fikenInvoiceId_key`(`fikenInvoiceId`),
    INDEX `Invoice_tenantId_idx`(`tenantId`),
    INDEX `Invoice_status_idx`(`status`),
    INDEX `Invoice_fikenInvoiceId_idx`(`fikenInvoiceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserTenant` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'HMS', 'LEDER', 'VERNEOMBUD', 'ANSATT', 'BHT', 'REVISOR') NOT NULL,
    `department` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `UserTenant_userId_idx`(`userId`),
    INDEX `UserTenant_tenantId_idx`(`tenantId`),
    UNIQUE INDEX `UserTenant_userId_tenantId_key`(`userId`, `tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Document` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `kind` ENUM('LAW', 'PROCEDURE', 'CHECKLIST', 'FORM', 'SDS', 'PLAN', 'OTHER') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `version` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'APPROVED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `fileKey` VARCHAR(191) NOT NULL,
    `approvedBy` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `updatedBy` VARCHAR(191) NULL,
    `nextReviewDate` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Document_tenantId_idx`(`tenantId`),
    INDEX `Document_status_idx`(`status`),
    INDEX `Document_nextReviewDate_idx`(`nextReviewDate`),
    UNIQUE INDEX `Document_tenantId_slug_key`(`tenantId`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DocumentVersion` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `documentId` VARCHAR(191) NOT NULL,
    `version` VARCHAR(191) NOT NULL,
    `fileKey` VARCHAR(191) NOT NULL,
    `changeComment` TEXT NULL,
    `uploadedBy` VARCHAR(191) NOT NULL,
    `approvedBy` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `supersededAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DocumentVersion_tenantId_idx`(`tenantId`),
    INDEX `DocumentVersion_documentId_idx`(`documentId`),
    INDEX `DocumentVersion_version_idx`(`version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Risk` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `context` TEXT NOT NULL,
    `likelihood` INTEGER NOT NULL,
    `consequence` INTEGER NOT NULL,
    `score` INTEGER NOT NULL,
    `ownerId` VARCHAR(191) NOT NULL,
    `status` ENUM('OPEN', 'MITIGATING', 'ACCEPTED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `reviewedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Risk_tenantId_idx`(`tenantId`),
    INDEX `Risk_status_idx`(`status`),
    INDEX `Risk_score_idx`(`score`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Measure` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `riskId` VARCHAR(191) NULL,
    `incidentId` VARCHAR(191) NULL,
    `auditId` VARCHAR(191) NULL,
    `goalId` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `dueAt` DATETIME(3) NOT NULL,
    `responsibleId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'IN_PROGRESS', 'DONE', 'OVERDUE') NOT NULL DEFAULT 'PENDING',
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Measure_tenantId_idx`(`tenantId`),
    INDEX `Measure_status_idx`(`status`),
    INDEX `Measure_dueAt_idx`(`dueAt`),
    INDEX `Measure_riskId_idx`(`riskId`),
    INDEX `Measure_incidentId_idx`(`incidentId`),
    INDEX `Measure_auditId_idx`(`auditId`),
    INDEX `Measure_goalId_idx`(`goalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Incident` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `type` ENUM('AVVIK', 'NESTEN', 'SKADE', 'MILJO', 'KVALITET') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `severity` INTEGER NOT NULL,
    `occurredAt` DATETIME(3) NOT NULL,
    `reportedBy` VARCHAR(191) NOT NULL,
    `responsibleId` VARCHAR(191) NULL,
    `location` VARCHAR(191) NULL,
    `witnessName` VARCHAR(191) NULL,
    `immediateAction` TEXT NULL,
    `rootCause` TEXT NULL,
    `contributingFactors` TEXT NULL,
    `investigatedBy` VARCHAR(191) NULL,
    `investigatedAt` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'OPEN',
    `closedBy` VARCHAR(191) NULL,
    `closedAt` DATETIME(3) NULL,
    `effectivenessReview` TEXT NULL,
    `lessonsLearned` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Incident_tenantId_idx`(`tenantId`),
    INDEX `Incident_type_idx`(`type`),
    INDEX `Incident_status_idx`(`status`),
    INDEX `Incident_occurredAt_idx`(`occurredAt`),
    INDEX `Incident_severity_idx`(`severity`),
    INDEX `Incident_responsibleId_idx`(`responsibleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Training` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `courseKey` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `completedAt` DATETIME(3) NULL,
    `validUntil` DATETIME(3) NULL,
    `proofDocKey` VARCHAR(191) NULL,
    `isRequired` BOOLEAN NOT NULL DEFAULT false,
    `effectiveness` TEXT NULL,
    `evaluatedBy` VARCHAR(191) NULL,
    `evaluatedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Training_tenantId_idx`(`tenantId`),
    INDEX `Training_userId_idx`(`userId`),
    INDEX `Training_courseKey_idx`(`courseKey`),
    INDEX `Training_validUntil_idx`(`validUntil`),
    INDEX `Training_completedAt_idx`(`completedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Audit` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `auditType` ENUM('INTERNAL', 'EXTERNAL', 'SUPPLIER', 'CERTIFICATION') NOT NULL DEFAULT 'INTERNAL',
    `scope` TEXT NOT NULL,
    `criteria` TEXT NOT NULL,
    `leadAuditorId` VARCHAR(191) NOT NULL,
    `teamMemberIds` TEXT NULL,
    `scheduledDate` DATETIME(3) NOT NULL,
    `completedAt` DATETIME(3) NULL,
    `area` VARCHAR(191) NOT NULL,
    `department` VARCHAR(191) NULL,
    `status` ENUM('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PLANNED',
    `summary` TEXT NULL,
    `conclusion` TEXT NULL,
    `reportKey` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Audit_tenantId_idx`(`tenantId`),
    INDEX `Audit_scheduledDate_idx`(`scheduledDate`),
    INDEX `Audit_status_idx`(`status`),
    INDEX `Audit_auditType_idx`(`auditType`),
    INDEX `Audit_leadAuditorId_idx`(`leadAuditorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditFinding` (
    `id` VARCHAR(191) NOT NULL,
    `auditId` VARCHAR(191) NOT NULL,
    `findingType` ENUM('MAJOR_NC', 'MINOR_NC', 'OBSERVATION', 'STRENGTH') NOT NULL,
    `clause` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `evidence` TEXT NOT NULL,
    `requirement` TEXT NOT NULL,
    `responsibleId` VARCHAR(191) NOT NULL,
    `dueDate` DATETIME(3) NULL,
    `correctiveAction` TEXT NULL,
    `rootCause` TEXT NULL,
    `status` ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'VERIFIED') NOT NULL DEFAULT 'OPEN',
    `closedAt` DATETIME(3) NULL,
    `verifiedById` VARCHAR(191) NULL,
    `verifiedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AuditFinding_auditId_idx`(`auditId`),
    INDEX `AuditFinding_status_idx`(`status`),
    INDEX `AuditFinding_findingType_idx`(`findingType`),
    INDEX `AuditFinding_responsibleId_idx`(`responsibleId`),
    INDEX `AuditFinding_dueDate_idx`(`dueDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Goal` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `category` ENUM('QUALITY', 'HMS', 'ENVIRONMENT', 'CUSTOMER', 'EFFICIENCY', 'FINANCE', 'COMPETENCE', 'OTHER') NOT NULL DEFAULT 'QUALITY',
    `targetValue` DOUBLE NULL,
    `currentValue` DOUBLE NULL,
    `unit` VARCHAR(191) NULL,
    `baseline` DOUBLE NULL,
    `year` INTEGER NOT NULL,
    `quarter` INTEGER NULL,
    `startDate` DATETIME(3) NULL,
    `deadline` DATETIME(3) NULL,
    `ownerId` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'ACHIEVED', 'AT_RISK', 'FAILED', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Goal_tenantId_idx`(`tenantId`),
    INDEX `Goal_year_idx`(`year`),
    INDEX `Goal_quarter_idx`(`quarter`),
    INDEX `Goal_status_idx`(`status`),
    INDEX `Goal_category_idx`(`category`),
    INDEX `Goal_ownerId_idx`(`ownerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KpiMeasurement` (
    `id` VARCHAR(191) NOT NULL,
    `goalId` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `value` DOUBLE NOT NULL,
    `measurementDate` DATETIME(3) NOT NULL,
    `measurementType` ENUM('MANUAL', 'AUTOMATIC', 'CALCULATED') NOT NULL DEFAULT 'MANUAL',
    `comment` TEXT NULL,
    `measuredById` VARCHAR(191) NULL,
    `source` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `KpiMeasurement_goalId_idx`(`goalId`),
    INDEX `KpiMeasurement_tenantId_idx`(`tenantId`),
    INDEX `KpiMeasurement_measurementDate_idx`(`measurementDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Chemical` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `productName` VARCHAR(191) NOT NULL,
    `supplier` VARCHAR(191) NULL,
    `casNumber` VARCHAR(191) NULL,
    `hazardClass` VARCHAR(191) NULL,
    `hazardStatements` TEXT NULL,
    `warningPictograms` TEXT NULL,
    `requiredPPE` TEXT NULL,
    `sdsKey` VARCHAR(191) NULL,
    `sdsVersion` VARCHAR(191) NULL,
    `sdsDate` DATETIME(3) NULL,
    `nextReviewDate` DATETIME(3) NULL,
    `location` VARCHAR(191) NULL,
    `quantity` DOUBLE NULL,
    `unit` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'PHASED_OUT', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    `notes` TEXT NULL,
    `lastVerifiedAt` DATETIME(3) NULL,
    `lastVerifiedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Chemical_tenantId_idx`(`tenantId`),
    INDEX `Chemical_status_idx`(`status`),
    INDEX `Chemical_nextReviewDate_idx`(`nextReviewDate`),
    INDEX `Chemical_casNumber_idx`(`casNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Attachment` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `incidentId` VARCHAR(191) NULL,
    `objectType` VARCHAR(191) NULL,
    `objectId` VARCHAR(191) NULL,
    `fileKey` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `mime` VARCHAR(191) NOT NULL,
    `size` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Attachment_tenantId_idx`(`tenantId`),
    INDEX `Attachment_objectType_objectId_idx`(`objectType`, `objectId`),
    INDEX `Attachment_incidentId_idx`(`incidentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `resource` VARCHAR(191) NULL,
    `metadata` TEXT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_tenantId_idx`(`tenantId`),
    INDEX `AuditLog_userId_idx`(`userId`),
    INDEX `AuditLog_action_idx`(`action`),
    INDEX `AuditLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FormTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `category` ENUM('MEETING', 'INSPECTION', 'INCIDENT', 'RISK', 'TRAINING', 'CHECKLIST', 'CUSTOM') NOT NULL DEFAULT 'CUSTOM',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `requiresSignature` BOOLEAN NOT NULL DEFAULT true,
    `requiresApproval` BOOLEAN NOT NULL DEFAULT false,
    `isRecurring` BOOLEAN NOT NULL DEFAULT false,
    `recurrenceRule` TEXT NULL,
    `accessType` ENUM('ALL', 'ROLES', 'USERS', 'ROLES_AND_USERS') NOT NULL DEFAULT 'ALL',
    `allowedRoles` TEXT NULL,
    `allowedUsers` TEXT NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `FormTemplate_tenantId_idx`(`tenantId`),
    INDEX `FormTemplate_createdBy_idx`(`createdBy`),
    INDEX `FormTemplate_category_idx`(`category`),
    INDEX `FormTemplate_isActive_idx`(`isActive`),
    INDEX `FormTemplate_accessType_idx`(`accessType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FormField` (
    `id` VARCHAR(191) NOT NULL,
    `formTemplateId` VARCHAR(191) NOT NULL,
    `fieldType` ENUM('TEXT', 'TEXTAREA', 'NUMBER', 'DATE', 'DATETIME', 'CHECKBOX', 'RADIO', 'SELECT', 'FILE', 'SIGNATURE') NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `helpText` TEXT NULL,
    `placeholder` VARCHAR(191) NULL,
    `isRequired` BOOLEAN NOT NULL DEFAULT false,
    `order` INTEGER NOT NULL,
    `validation` TEXT NULL,
    `options` TEXT NULL,
    `conditionalLogic` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FormField_formTemplateId_idx`(`formTemplateId`),
    INDEX `FormField_order_idx`(`order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FormSubmission` (
    `id` VARCHAR(191) NOT NULL,
    `formTemplateId` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `submittedById` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'DRAFT',
    `signedAt` DATETIME(3) NULL,
    `approvedById` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `metadata` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `FormSubmission_tenantId_idx`(`tenantId`),
    INDEX `FormSubmission_submittedById_idx`(`submittedById`),
    INDEX `FormSubmission_formTemplateId_idx`(`formTemplateId`),
    INDEX `FormSubmission_status_idx`(`status`),
    INDEX `FormSubmission_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FormFieldValue` (
    `id` VARCHAR(191) NOT NULL,
    `submissionId` VARCHAR(191) NOT NULL,
    `fieldId` VARCHAR(191) NOT NULL,
    `value` TEXT NULL,
    `fileKey` VARCHAR(191) NULL,

    INDEX `FormFieldValue_submissionId_idx`(`submissionId`),
    INDEX `FormFieldValue_fieldId_idx`(`fieldId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Account` ADD CONSTRAINT `Account_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Subscription` ADD CONSTRAINT `Subscription_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserTenant` ADD CONSTRAINT `UserTenant_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserTenant` ADD CONSTRAINT `UserTenant_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `Document_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentVersion` ADD CONSTRAINT `DocumentVersion_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentVersion` ADD CONSTRAINT `DocumentVersion_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `Document`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Risk` ADD CONSTRAINT `Risk_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Measure` ADD CONSTRAINT `Measure_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Measure` ADD CONSTRAINT `Measure_riskId_fkey` FOREIGN KEY (`riskId`) REFERENCES `Risk`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Measure` ADD CONSTRAINT `Measure_incidentId_fkey` FOREIGN KEY (`incidentId`) REFERENCES `Incident`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Measure` ADD CONSTRAINT `Measure_auditId_fkey` FOREIGN KEY (`auditId`) REFERENCES `Audit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Measure` ADD CONSTRAINT `Measure_goalId_fkey` FOREIGN KEY (`goalId`) REFERENCES `Goal`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Incident` ADD CONSTRAINT `Incident_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Training` ADD CONSTRAINT `Training_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Audit` ADD CONSTRAINT `Audit_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditFinding` ADD CONSTRAINT `AuditFinding_auditId_fkey` FOREIGN KEY (`auditId`) REFERENCES `Audit`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Goal` ADD CONSTRAINT `Goal_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KpiMeasurement` ADD CONSTRAINT `KpiMeasurement_goalId_fkey` FOREIGN KEY (`goalId`) REFERENCES `Goal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KpiMeasurement` ADD CONSTRAINT `KpiMeasurement_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Chemical` ADD CONSTRAINT `Chemical_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attachment` ADD CONSTRAINT `Attachment_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attachment` ADD CONSTRAINT `Attachment_incidentId_fkey` FOREIGN KEY (`incidentId`) REFERENCES `Incident`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FormTemplate` ADD CONSTRAINT `FormTemplate_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FormField` ADD CONSTRAINT `FormField_formTemplateId_fkey` FOREIGN KEY (`formTemplateId`) REFERENCES `FormTemplate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FormSubmission` ADD CONSTRAINT `FormSubmission_formTemplateId_fkey` FOREIGN KEY (`formTemplateId`) REFERENCES `FormTemplate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FormSubmission` ADD CONSTRAINT `FormSubmission_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FormFieldValue` ADD CONSTRAINT `FormFieldValue_submissionId_fkey` FOREIGN KEY (`submissionId`) REFERENCES `FormSubmission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FormFieldValue` ADD CONSTRAINT `FormFieldValue_fieldId_fkey` FOREIGN KEY (`fieldId`) REFERENCES `FormField`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
