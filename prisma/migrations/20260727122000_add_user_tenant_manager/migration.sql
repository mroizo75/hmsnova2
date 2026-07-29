-- Nærmeste leder og stillingstittel per ansatt per virksomhet
-- AML § 3-1: HMS-ansvar skal være plassert i linjen. Brukes til å rute avvik til rett leder.
ALTER TABLE `UserTenant`
  ADD COLUMN `managerId` VARCHAR(191) NULL,
  ADD COLUMN `position` VARCHAR(191) NULL;

CREATE INDEX `UserTenant_managerId_idx` ON `UserTenant`(`managerId`);

ALTER TABLE `UserTenant`
  ADD CONSTRAINT `UserTenant_managerId_fkey`
  FOREIGN KEY (`managerId`) REFERENCES `User`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
