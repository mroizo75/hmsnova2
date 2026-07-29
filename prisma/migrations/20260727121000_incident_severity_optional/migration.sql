-- Alvorlighetsgrad blir valgfri ved registrering
-- Melder skal ikke tvinges til å sette grad; leder vurderer ved behandling (IK-HMS § 5, ISO 9001 kap. 10.2).
-- Null = ikke vurdert. Eksisterende avvik beholder sin verdi.
ALTER TABLE `Incident`
  MODIFY COLUMN `severity` INTEGER NULL;
