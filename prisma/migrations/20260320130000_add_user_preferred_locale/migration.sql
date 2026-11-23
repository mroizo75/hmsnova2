-- Add persisted user locale preference for i18n
ALTER TABLE `User`
ADD COLUMN `preferredLocale` VARCHAR(191) NOT NULL DEFAULT 'nb';
