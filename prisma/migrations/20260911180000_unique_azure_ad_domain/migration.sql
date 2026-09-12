-- Unikt SSO-domene per tenant. MySQL tillater flere NULL i UNIQUE.
-- Duplikater nulles ut (eldste rad beholdes) før indeksen opprettes.

UPDATE `Tenant` AS `later`
INNER JOIN `Tenant` AS `earlier`
  ON `later`.`azureAdDomain` = `earlier`.`azureAdDomain`
  AND `later`.`id` > `earlier`.`id`
SET `later`.`azureAdDomain` = NULL,
    `later`.`azureAdEnabled` = false
WHERE `later`.`azureAdDomain` IS NOT NULL;

CREATE UNIQUE INDEX `Tenant_azureAdDomain_key` ON `Tenant`(`azureAdDomain`);
