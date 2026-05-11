-- Legg til dashboard-lås for tenant-admin
-- Når dashboardLocked = true, ser alle ikke-admin-brukere det låste dashboardet
ALTER TABLE `Tenant`
  ADD COLUMN `dashboardLocked` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `lockedDashboardConfig` JSON NULL;
