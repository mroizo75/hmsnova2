-- IK-HMS § 5 nr. 6: funnet skal kunne spores til riktig sjekkpunkt, også etter at runden er ferdig.
ALTER TABLE `InspectionFinding`
  ADD COLUMN `checklistFieldId` VARCHAR(191) NULL,
  ADD INDEX `InspectionFinding_checklistFieldId_idx` (`checklistFieldId`);
