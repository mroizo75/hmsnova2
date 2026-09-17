-- AI-tillegg: alltid av som standard, 99 kr/mnd + mva ved aktivering
ALTER TABLE `Tenant` ADD COLUMN `aiAddonActivatedAt` DATETIME(3) NULL;
ALTER TABLE `Tenant` ADD COLUMN `aiAddonCanceledAt` DATETIME(3) NULL;
ALTER TABLE `Tenant` MODIFY `aiEnabled` BOOLEAN NOT NULL DEFAULT false;
UPDATE `Tenant` SET `aiEnabled` = false, `speechToTextEnabled` = false;
