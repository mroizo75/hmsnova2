-- IK-HMS § 5 nr. 3: Hvem deltok i vurderingen (arbeidstakere, verneombud) – AML § 3-1 (1)
-- IK-HMS § 5 nr. 6: Godkjenning av risikovurderingen (skriftlig dokumentasjon påkrevd)
-- IK-HMS § 5 nr. 8: Hvem gjennomgikk vurderingen periodisk (skriftlig dokumentasjon påkrevd)

ALTER TABLE `RiskAssessment`
  ADD COLUMN `participants` TEXT NULL,
  ADD COLUMN `approvedById` VARCHAR(191) NULL,
  ADD COLUMN `approvedAt` DATETIME(3) NULL,
  ADD COLUMN `reviewedById` VARCHAR(191) NULL,
  ADD COLUMN `reviewedAt` DATETIME(3) NULL;

CREATE INDEX `RiskAssessment_approvedById_idx` ON `RiskAssessment`(`approvedById`);
CREATE INDEX `RiskAssessment_reviewedById_idx` ON `RiskAssessment`(`reviewedById`);
