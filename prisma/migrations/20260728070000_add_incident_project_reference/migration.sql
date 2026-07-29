-- Fritekst prosjektnummer/referanse på avvik, for sporbarhet når prosjektet
-- ikke er registrert som eget prosjekt i systemet.
ALTER TABLE `incident` ADD COLUMN `projectReference` VARCHAR(191) NULL;
