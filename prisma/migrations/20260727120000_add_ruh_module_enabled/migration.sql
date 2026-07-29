-- Per-tenant bryter for RUH-modulen
-- IK-HMS § 5: virksomheten velger selv struktur for avviksregistrering.
-- Standard true betyr at eksisterende virksomheter beholder dagens oppsett med både Avvik og RUH.
ALTER TABLE `Tenant`
  ADD COLUMN `ruhModuleEnabled` BOOLEAN NOT NULL DEFAULT true;

-- Rydd bort ubrukt kolonne fra forkastet avviksskjema-konfigurasjon
ALTER TABLE `Tenant`
  DROP COLUMN `incidentFormConfig`;
