-- Time/prosjekt Tripletex: usage-dato, km-satser, avvisningsgrunn, timebank-status

ALTER TABLE `Tenant`
  ADD COLUMN `tripletexProductKmNonTaxableId` VARCHAR(191) NULL,
  ADD COLUMN `absencePayrollTypes` JSON NULL,
  ADD COLUMN `timeBankMaxBalance` DOUBLE NULL,
  ADD COLUMN `timeBankMinBalance` DOUBLE NULL;

ALTER TABLE `TimeEntry`
  ADD COLUMN `rejectionReason` TEXT NULL;

ALTER TABLE `ProjectUsageLine`
  ADD COLUMN `date` DATE NULL,
  ADD COLUMN `isPrivateCar` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `kmTaxable` BOOLEAN NOT NULL DEFAULT false;

UPDATE `ProjectUsageLine`
SET `date` = DATE(`createdAt`)
WHERE `date` IS NULL;

ALTER TABLE `ProjectUsageLine`
  MODIFY `date` DATE NOT NULL;

CREATE INDEX `ProjectUsageLine_tenantId_userId_date_idx` ON `ProjectUsageLine`(`tenantId`, `userId`, `date`);

ALTER TABLE `TimeBankRule`
  ADD COLUMN `maxTakeHours` DOUBLE NULL;

ALTER TABLE `TimeBankLedger`
  ADD COLUMN `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'APPROVED';
