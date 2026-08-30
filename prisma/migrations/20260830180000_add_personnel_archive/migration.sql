-- Personalarkiv. Rører ikke Notification-enum.

CREATE TABLE `PersonnelDocument` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `category` ENUM('CONTRACT','AMENDMENT','CERTIFICATE','WARNING','TAX','CORRESPONDENCE','OTHER') NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `fileKey` VARCHAR(512) NOT NULL,
  `fileName` VARCHAR(191) NOT NULL,
  `mime` VARCHAR(191) NOT NULL DEFAULT 'application/pdf',
  `fileSize` INTEGER NOT NULL,
  `legalRef` VARCHAR(191) NULL,
  `retainUntil` DATETIME(3) NULL,
  `notes` TEXT NULL,
  `uploadedById` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `PersonnelDocument_tenantId_userId_idx` ON `PersonnelDocument`(`tenantId`, `userId`);
CREATE INDEX `PersonnelDocument_tenantId_category_idx` ON `PersonnelDocument`(`tenantId`, `category`);
ALTER TABLE `PersonnelDocument` ADD CONSTRAINT `PersonnelDocument_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `PersonnelDocument` ADD CONSTRAINT `PersonnelDocument_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `PersonnelDocument` ADD CONSTRAINT `PersonnelDocument_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
