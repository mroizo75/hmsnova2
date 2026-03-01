-- Legg til nye hendelsestyper i tråd med AML § 5-1/5-2 og IK-HMS
-- ULYKKE = arbeidsulykke (erstatter SKADE som ny anbefalt type)
-- FARLIG_SITUASJON = farlig tilstand/observasjon (AML § 2-3)
-- YRKESSYKDOM = arbeidsrelatert sykdom (AML § 5-1, § 5-3)
ALTER TABLE `Incident`
  MODIFY COLUMN `type` ENUM(
    'AVVIK',
    'NESTEN',
    'SKADE',
    'MILJO',
    'KVALITET',
    'HMS',
    'CUSTOMER',
    'ULYKKE',
    'FARLIG_SITUASJON',
    'YRKESSYKDOM'
  ) NOT NULL;

-- Legg til felt for å rapportere avvik på vegne av en annen ansatt
ALTER TABLE `Incident`
  ADD COLUMN `reportedForUserId` VARCHAR(191) NULL AFTER `reportedBy`;

CREATE INDEX `Incident_reportedForUserId_idx` ON `Incident`(`reportedForUserId`);
