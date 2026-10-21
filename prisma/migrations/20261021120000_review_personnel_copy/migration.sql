-- Bekreftet samtale lagres i personalmappen (AML § 4-6 (5))

ALTER TABLE `EmployeeReview`
  ADD COLUMN `personnelDocumentId` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `EmployeeReview_personnelDocumentId_key` ON `EmployeeReview`(`personnelDocumentId`);

ALTER TABLE `EmployeeReview`
  ADD CONSTRAINT `EmployeeReview_personnelDocumentId_fkey`
  FOREIGN KEY (`personnelDocumentId`) REFERENCES `PersonnelDocument`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
