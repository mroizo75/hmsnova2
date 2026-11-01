-- Sjekklisteinnsending kan knyttes til prosjekt (AML § 3-1).

ALTER TABLE `ChecklistRun`
  ADD COLUMN `projectId` VARCHAR(191) NULL;

CREATE INDEX `ChecklistRun_projectId_idx` ON `ChecklistRun`(`projectId`);

ALTER TABLE `ChecklistRun`
  ADD CONSTRAINT `ChecklistRun_projectId_fkey`
  FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
