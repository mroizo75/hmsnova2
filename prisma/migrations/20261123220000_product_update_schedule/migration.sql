-- Dag og klokkeslett for planlagt oppgradering. Samme tidspunkt for alle bedrifter.
ALTER TABLE `ProductUpdate` ADD COLUMN `scheduledAt` DATETIME(3) NULL;
