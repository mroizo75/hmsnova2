-- Tavlen kan sperre innsjekk til prosjektlokasjonen. Posisjonen til den
-- enkelte lagres ikke (GDPR art. 5). userId knytter innsjekk til HMS-kort.

ALTER TABLE `HmsTavle`
  ADD COLUMN `siteLatitude` DOUBLE NULL,
  ADD COLUMN `siteLongitude` DOUBLE NULL,
  ADD COLUMN `geofenceRadiusMeters` INTEGER NULL;

ALTER TABLE `TavleCheckin`
  ADD COLUMN `userId` VARCHAR(191) NULL,
  ADD INDEX `TavleCheckin_userId_idx`(`userId`),
  ADD CONSTRAINT `TavleCheckin_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
