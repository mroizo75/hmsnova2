-- Manuelt organisasjonskart, og skille mellom person og avdeling i kartet.
ALTER TABLE `Tenant`
  ADD COLUMN `orgChartManual` BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE `OrgChartNode`
  ADD COLUMN `kind` VARCHAR(191) NOT NULL DEFAULT 'PERSON';
