-- Verneområde er avdelingen virksomheten selv oppretter (forskrift om organisering,
-- ledelse og medvirkning § 3-1). Hovedverneombud etter AML § 6-1 ser hele virksomheten.

ALTER TABLE `Department`
  ADD COLUMN `safetyRepresentativeId` VARCHAR(191) NULL;

CREATE INDEX `Department_safetyRepresentativeId_idx` ON `Department`(`safetyRepresentativeId`);

ALTER TABLE `Department`
  ADD CONSTRAINT `Department_safetyRepresentativeId_fkey`
  FOREIGN KEY (`safetyRepresentativeId`) REFERENCES `User`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `UserTenant`
  ADD COLUMN `isChiefSafetyRep` BOOLEAN NOT NULL DEFAULT false;
