-- Avdelingsleder, overordnet avdeling, midlertidig ansettelse og skoleungdom
-- AML § 3-1, § 14-9 og kap. 11

ALTER TABLE `Department`
  ADD COLUMN `parentId` VARCHAR(191) NULL,
  ADD COLUMN `leaderId` VARCHAR(191) NULL;

CREATE INDEX `Department_parentId_idx` ON `Department`(`parentId`);
CREATE INDEX `Department_leaderId_idx` ON `Department`(`leaderId`);

ALTER TABLE `Department`
  ADD CONSTRAINT `Department_parentId_fkey`
  FOREIGN KEY (`parentId`) REFERENCES `Department`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Department_leaderId_fkey`
  FOREIGN KEY (`leaderId`) REFERENCES `User`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `UserTenant`
  ADD COLUMN `employmentType` ENUM('FAST', 'MIDLERTIDIG', 'SKOLEUNGDOM') NOT NULL DEFAULT 'FAST',
  ADD COLUMN `temporaryBasis` ENUM('MIDLERTIDIG_KARAKTER', 'VIKARIAT', 'PRAKSIS', 'ARBEIDSMARKEDSTILTAK', 'IDRETT') NULL,
  ADD COLUMN `employmentEndsAt` DATETIME(3) NULL;
