-- Bilder på sjekklistepunkt og kobling til avvik (IK-HMS § 5 nr. 7, AML § 2-3).

ALTER TABLE `ChecklistAnswer`
  ADD COLUMN `incidentId` VARCHAR(191) NULL;

CREATE INDEX `ChecklistAnswer_incidentId_idx` ON `ChecklistAnswer`(`incidentId`);

ALTER TABLE `ChecklistAnswer`
  ADD CONSTRAINT `ChecklistAnswer_incidentId_fkey`
  FOREIGN KEY (`incidentId`) REFERENCES `Incident`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `ChecklistAnswerPhoto` (
  `id` VARCHAR(191) NOT NULL,
  `answerId` VARCHAR(191) NOT NULL,
  `fileKey` VARCHAR(191) NOT NULL,
  `fileName` VARCHAR(191) NOT NULL,
  `mimeType` VARCHAR(191) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `ChecklistAnswerPhoto_answerId_idx` ON `ChecklistAnswerPhoto`(`answerId`);

ALTER TABLE `ChecklistAnswerPhoto`
  ADD CONSTRAINT `ChecklistAnswerPhoto_answerId_fkey`
  FOREIGN KEY (`answerId`) REFERENCES `ChecklistAnswer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
