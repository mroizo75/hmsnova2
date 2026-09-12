-- HR-rolle, avdelinger, HR-profil, pårørende og avvikskommentarer
-- GDPR art. 5/6: personaldata per arbeidsforhold. AML § 6-2: VO beholder HMS-innsyn.

ALTER TABLE `UserTenant`
  MODIFY `role` ENUM('ADMIN', 'HMS', 'LEDER', 'HR', 'VERNEOMBUD', 'ANSATT', 'BHT', 'REVISOR', 'VARSLINGSANSVARLIG') NOT NULL;

ALTER TABLE `Tenant`
  MODIFY `azureAdAutoRole` ENUM('ADMIN', 'HMS', 'LEDER', 'HR', 'VERNEOMBUD', 'ANSATT', 'BHT', 'REVISOR', 'VARSLINGSANSVARLIG') NULL;

ALTER TABLE `Tenant`
  MODIFY `constructionDailyCheckAlertRole` ENUM('ADMIN', 'HMS', 'LEDER', 'HR', 'VERNEOMBUD', 'ANSATT', 'BHT', 'REVISOR', 'VARSLINGSANSVARLIG') NOT NULL DEFAULT 'HMS';

CREATE TABLE `Department` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `code` VARCHAR(191) NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `Department_tenantId_name_key` (`tenantId`, `name`),
  INDEX `Department_tenantId_idx` (`tenantId`),
  CONSTRAINT `Department_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `UserTenant`
  ADD COLUMN `departmentId` VARCHAR(191) NULL;

ALTER TABLE `UserTenant`
  ADD INDEX `UserTenant_departmentId_idx` (`departmentId`);

ALTER TABLE `UserTenant`
  ADD CONSTRAINT `UserTenant_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `Department` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO `Department` (`id`, `tenantId`, `name`, `isActive`, `sortOrder`, `createdAt`, `updatedAt`)
SELECT
  CONCAT('dept_', MD5(CONCAT(`tenantId`, '|', `department`))),
  `tenantId`,
  `department`,
  true,
  0,
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3)
FROM `UserTenant`
WHERE `department` IS NOT NULL AND TRIM(`department`) <> ''
GROUP BY `tenantId`, `department`;

UPDATE `UserTenant` `ut`
INNER JOIN `Department` `d` ON `d`.`tenantId` = `ut`.`tenantId` AND `d`.`name` = `ut`.`department`
SET `ut`.`departmentId` = `d`.`id`
WHERE `ut`.`department` IS NOT NULL AND TRIM(`ut`.`department`) <> '';

CREATE TABLE `EmployeeHrProfile` (
  `id` VARCHAR(191) NOT NULL,
  `userTenantId` VARCHAR(191) NOT NULL,
  `nationality` VARCHAR(191) NULL,
  `languages` VARCHAR(191) NULL,
  `hrNotes` TEXT NULL,
  `startedAt` DATETIME(3) NULL,
  `dateOfBirth` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `EmployeeHrProfile_userTenantId_key` (`userTenantId`),
  CONSTRAINT `EmployeeHrProfile_userTenantId_fkey` FOREIGN KEY (`userTenantId`) REFERENCES `UserTenant` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `EmployeeNextOfKin` (
  `id` VARCHAR(191) NOT NULL,
  `userTenantId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `relation` VARCHAR(191) NULL,
  `phone` VARCHAR(191) NULL,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `EmployeeNextOfKin_userTenantId_idx` (`userTenantId`),
  CONSTRAINT `EmployeeNextOfKin_userTenantId_fkey` FOREIGN KEY (`userTenantId`) REFERENCES `UserTenant` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Incident`
  ADD COLUMN `treatmentOtherText` TEXT NULL;

CREATE TABLE `IncidentComment` (
  `id` VARCHAR(191) NOT NULL,
  `incidentId` VARCHAR(191) NOT NULL,
  `authorId` VARCHAR(191) NOT NULL,
  `body` TEXT NOT NULL,
  `kind` ENUM('SUBMITTER', 'TREATMENT') NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `IncidentComment_incidentId_idx` (`incidentId`),
  INDEX `IncidentComment_authorId_idx` (`authorId`),
  CONSTRAINT `IncidentComment_incidentId_fkey` FOREIGN KEY (`incidentId`) REFERENCES `Incident` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `IncidentComment_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
