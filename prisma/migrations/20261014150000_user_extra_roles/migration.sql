-- Flere roller på samme bruker. Hovedrollen ligger fortsatt i UserTenant.role.

ALTER TABLE `UserTenant`
  ADD COLUMN `extraRoles` VARCHAR(255) NULL;
