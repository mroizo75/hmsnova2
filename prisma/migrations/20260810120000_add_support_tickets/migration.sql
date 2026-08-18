-- Support chat + ticketsystem for HMS-representanter
-- NotificationType: legg nye verdier bakerst (MySQL in-place ENUM)

ALTER TABLE `Notification` MODIFY COLUMN `type` ENUM(
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
  'SUPPORT_MSG'
) NOT NULL;

CREATE TABLE `SupportTicket` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `ticketNumber` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `category` ENUM('QUESTION', 'HMS_ADVICE', 'TECHNICAL', 'BILLING', 'FEATURE', 'OTHER') NOT NULL DEFAULT 'QUESTION',
    `priority` ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT') NOT NULL DEFAULT 'NORMAL',
    `status` ENUM('OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `createdById` VARCHAR(191) NOT NULL,
    `assignedToId` VARCHAR(191) NULL,
    `lastMessageAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `closedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`),
    UNIQUE INDEX `SupportTicket_ticketNumber_key`(`ticketNumber`),
    INDEX `SupportTicket_tenantId_idx`(`tenantId`),
    INDEX `SupportTicket_status_idx`(`status`),
    INDEX `SupportTicket_assignedToId_idx`(`assignedToId`),
    INDEX `SupportTicket_lastMessageAt_idx`(`lastMessageAt`),
    INDEX `SupportTicket_createdById_idx`(`createdById`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SupportMessage` (
    `id` VARCHAR(191) NOT NULL,
    `ticketId` VARCHAR(191) NOT NULL,
    `senderUserId` VARCHAR(191) NOT NULL,
    `senderType` ENUM('CUSTOMER', 'SUPPORT', 'SYSTEM') NOT NULL,
    `body` TEXT NOT NULL,
    `isInternal` BOOLEAN NOT NULL DEFAULT false,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`),
    INDEX `SupportMessage_ticketId_idx`(`ticketId`),
    INDEX `SupportMessage_createdAt_idx`(`createdAt`),
    INDEX `SupportMessage_senderUserId_idx`(`senderUserId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `SupportTicket` ADD CONSTRAINT `SupportTicket_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `SupportTicket` ADD CONSTRAINT `SupportTicket_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `SupportTicket` ADD CONSTRAINT `SupportTicket_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `SupportMessage` ADD CONSTRAINT `SupportMessage_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `SupportTicket`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `SupportMessage` ADD CONSTRAINT `SupportMessage_senderUserId_fkey` FOREIGN KEY (`senderUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
