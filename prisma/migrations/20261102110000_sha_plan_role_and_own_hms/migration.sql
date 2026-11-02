-- SHA-plan hører til prosjektet. Entreprenør mottar byggherrens plan og skriver egen HMS-plan.
-- Byggherreforskriften § 5 og § 7–9. Egen HMS-plan: AML § 3-1, IK-HMS § 5.

ALTER TABLE `ConstructionShaPlan`
  ADD COLUMN `holderRole` ENUM('ENTREPRENOR', 'BYGGHERRE') NOT NULL DEFAULT 'ENTREPRENOR',
  ADD COLUMN `receivedAt` DATETIME(3) NULL,
  ADD COLUMN `sourceNote` TEXT NULL,
  ADD COLUMN `ownHmsPlan` TEXT NULL,
  ADD COLUMN `shaIncorporated` BOOLEAN NOT NULL DEFAULT false;
