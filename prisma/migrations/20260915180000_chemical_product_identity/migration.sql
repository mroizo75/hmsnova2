-- Produktidentitet for matching mot intern SDS-master / leverandørportal.
-- Fritekst leverandør er ikke tilstrekkelig (REACH art. 31-kjede).

ALTER TABLE `Chemical`
  ADD COLUMN `gtin` VARCHAR(14) NULL,
  ADD COLUMN `supplierProductCode` VARCHAR(80) NULL;

CREATE INDEX `Chemical_gtin_idx` ON `Chemical`(`gtin`);
CREATE INDEX `Chemical_supplierProductCode_idx` ON `Chemical`(`supplierProductCode`);
