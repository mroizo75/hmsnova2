-- AlterTable: add category to ElectroComplianceDeclaration
ALTER TABLE `ElectroComplianceDeclaration` ADD COLUMN `category` VARCHAR(191) NOT NULL DEFAULT 'ELEKTRO';
