-- IK-HMS § 5 nr. 3 og 6: sporbar gjenbruk, import og menneskelig verifisering.
ALTER TABLE `RiskAssessment`
  ADD COLUMN `importSourceFileKey` VARCHAR(191) NULL,
  ADD COLUMN `importSourceFileName` VARCHAR(191) NULL,
  ADD COLUMN `importSourceMimeType` VARCHAR(191) NULL,
  ADD COLUMN `importedAt` DATETIME(3) NULL,
  ADD COLUMN `importedById` VARCHAR(191) NULL,
  ADD COLUMN `importVerifiedAt` DATETIME(3) NULL,
  ADD COLUMN `importVerifiedById` VARCHAR(191) NULL;

ALTER TABLE `SjaAnalysis`
  ADD COLUMN `sourceRiskAssessmentId` VARCHAR(191) NULL;

ALTER TABLE `SjaHazard`
  ADD COLUMN `riskSnapshot` JSON NULL;

CREATE INDEX `RiskAssessment_importedAt_idx` ON `RiskAssessment`(`importedAt`);
CREATE INDEX `RiskAssessment_importVerifiedAt_idx` ON `RiskAssessment`(`importVerifiedAt`);
CREATE INDEX `SjaAnalysis_sourceRiskAssessmentId_idx` ON `SjaAnalysis`(`sourceRiskAssessmentId`);

ALTER TABLE `SjaAnalysis`
  ADD CONSTRAINT `SjaAnalysis_sourceRiskAssessmentId_fkey`
  FOREIGN KEY (`sourceRiskAssessmentId`) REFERENCES `RiskAssessment`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
