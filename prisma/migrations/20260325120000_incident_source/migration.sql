-- AlterTable: legg til source-felt for å skille interne og eksterne avvik
ALTER TABLE `Incident` ADD COLUMN `source` VARCHAR(191) NOT NULL DEFAULT 'INTERNAL';
