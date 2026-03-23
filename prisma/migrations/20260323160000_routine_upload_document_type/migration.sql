-- AlterTable: add documentType to RoutineUploadedDocument (mapped to ElectroInstruction)
ALTER TABLE `ElectroInstruction` ADD COLUMN `documentType` VARCHAR(191) NOT NULL DEFAULT 'RUTINE';
