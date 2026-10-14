-- Avvik kan meldes på avdeling slik at leder i linjen varsles (AML § 3-1, IK-HMS § 5 nr. 7).
ALTER TABLE `Incident` ADD COLUMN `departmentId` VARCHAR(191) NULL;
CREATE INDEX `Incident_departmentId_idx` ON `Incident`(`departmentId`);
ALTER TABLE `Incident` ADD CONSTRAINT `Incident_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
