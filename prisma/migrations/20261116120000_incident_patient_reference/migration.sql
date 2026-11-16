-- Valgfri intern pasient-ID for helsevirksomheter. Ikke fødselsnummer (GDPR art. 9).
ALTER TABLE `Incident`
  ADD COLUMN `patientReference` VARCHAR(40) NULL;
