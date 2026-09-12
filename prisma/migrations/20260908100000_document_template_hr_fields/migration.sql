-- AlterTable: add bodyHtml, variables, industryScope to DocumentTemplate for HR document templates
ALTER TABLE `DocumentTemplate` ADD COLUMN `bodyHtml` LONGTEXT NULL;
ALTER TABLE `DocumentTemplate` ADD COLUMN `variables` JSON NULL;
ALTER TABLE `DocumentTemplate` ADD COLUMN `industryScope` JSON NULL;

-- CreateIndex
CREATE INDEX `DocumentTemplate_category_idx` ON `DocumentTemplate`(`category`);
