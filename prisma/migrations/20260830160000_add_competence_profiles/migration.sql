-- Kompetanseprofiler og gap-analyse
-- AML § 3-2, § 3-5, IK-HMS § 5 nr. 2/5

-- CompetenceProfile
CREATE TABLE `CompetenceProfile` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `industry` VARCHAR(191) NULL,
  `isDefault` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `CompetenceProfile_tenantId_industry_idx` ON `CompetenceProfile`(`tenantId`, `industry`);
ALTER TABLE `CompetenceProfile` ADD CONSTRAINT `CompetenceProfile_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- CompetenceRequirement
CREATE TABLE `CompetenceRequirement` (
  `id` VARCHAR(191) NOT NULL,
  `profileId` VARCHAR(191) NOT NULL,
  `courseKey` VARCHAR(191) NOT NULL,
  `requiredLevel` VARCHAR(191) NOT NULL DEFAULT 'REQUIRED',
  `priority` INTEGER NOT NULL DEFAULT 0,
  `legalRef` VARCHAR(191) NULL,
  `notes` TEXT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE UNIQUE INDEX `CompetenceRequirement_profileId_courseKey_key` ON `CompetenceRequirement`(`profileId`, `courseKey`);
CREATE INDEX `CompetenceRequirement_profileId_idx` ON `CompetenceRequirement`(`profileId`);
ALTER TABLE `CompetenceRequirement` ADD CONSTRAINT `CompetenceRequirement_profileId_fkey` FOREIGN KEY (`profileId`) REFERENCES `CompetenceProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- UserCompetenceProfile
CREATE TABLE `UserCompetenceProfile` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `profileId` VARCHAR(191) NOT NULL,
  `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `assignedBy` VARCHAR(191) NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE UNIQUE INDEX `UserCompetenceProfile_userId_profileId_tenantId_key` ON `UserCompetenceProfile`(`userId`, `profileId`, `tenantId`);
CREATE INDEX `UserCompetenceProfile_tenantId_userId_idx` ON `UserCompetenceProfile`(`tenantId`, `userId`);
ALTER TABLE `UserCompetenceProfile` ADD CONSTRAINT `UserCompetenceProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `UserCompetenceProfile` ADD CONSTRAINT `UserCompetenceProfile_profileId_fkey` FOREIGN KEY (`profileId`) REFERENCES `CompetenceProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `UserCompetenceProfile` ADD CONSTRAINT `UserCompetenceProfile_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
