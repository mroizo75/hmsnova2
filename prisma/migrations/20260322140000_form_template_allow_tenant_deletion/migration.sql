-- Additive: tillat å markere tenant-skjema som ikke kan slettes (bransje-/systemmaler).
-- Eksisterende rader får true (samme oppførsel som før for sletting).

ALTER TABLE `FormTemplate`
  ADD COLUMN `allowTenantDeletion` BOOLEAN NOT NULL DEFAULT true;
