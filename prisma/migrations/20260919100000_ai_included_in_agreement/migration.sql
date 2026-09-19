-- Superadmin kan inkludere AI i avtalen (NHO m.m.) uten 99 kr/mnd tillegg
ALTER TABLE `Tenant` ADD COLUMN `aiIncludedInAgreement` BOOLEAN NOT NULL DEFAULT false;
