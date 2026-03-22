-- Add persisted user locale preference for i18n
ALTER TABLE "User"
ADD COLUMN "preferredLocale" TEXT NOT NULL DEFAULT 'nb';
