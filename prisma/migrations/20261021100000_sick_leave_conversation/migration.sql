-- Sykefraværssamtale under medarbeidersamtale (AML § 4-6)

ALTER TABLE `EmployeeReview`
  ADD COLUMN `kind` ENUM('MEDARBEIDER', 'SYKEFRAVAER') NOT NULL DEFAULT 'MEDARBEIDER',
  ADD COLUMN `templateKey` VARCHAR(191) NULL,
  ADD COLUMN `absenceId` VARCHAR(191) NULL,
  ADD COLUMN `templateAnswers` JSON NULL;

CREATE INDEX `EmployeeReview_kind_idx` ON `EmployeeReview`(`kind`);
CREATE INDEX `EmployeeReview_absenceId_idx` ON `EmployeeReview`(`absenceId`);

ALTER TABLE `EmployeeReview`
  ADD CONSTRAINT `EmployeeReview_absenceId_fkey`
  FOREIGN KEY (`absenceId`) REFERENCES `Absence`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
