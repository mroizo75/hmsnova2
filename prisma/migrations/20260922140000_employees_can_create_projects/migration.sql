-- Ansatte kan opprette prosjekt (felt/timeliste). Av: kun leder/HMS/admin.
ALTER TABLE `Tenant`
  ADD COLUMN `employeesCanCreateProjects` BOOLEAN NOT NULL DEFAULT true;
