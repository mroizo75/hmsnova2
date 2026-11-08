ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "tripletexSalaryNormalId" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "tripletexSalaryOt50Id" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "tripletexSalaryOt100Id" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "tripletexMileageRateTypeId" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "tripletexTemplateProjectExternalId" TEXT;

ALTER TABLE "AccountingProduct" ADD COLUMN IF NOT EXISTS "imageDocumentId" TEXT;

ALTER TABLE "ProjectUsageLine" ADD COLUMN IF NOT EXISTS "fromAddress" TEXT;
ALTER TABLE "ProjectUsageLine" ADD COLUMN IF NOT EXISTS "toAddress" TEXT;
ALTER TABLE "ProjectUsageLine" ADD COLUMN IF NOT EXISTS "travelExternalId" TEXT;

CREATE TABLE IF NOT EXISTS "AccountingActivity" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "number" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccountingActivity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AccountingActivity_tenantId_externalId_key" ON "AccountingActivity"("tenantId", "externalId");
CREATE INDEX IF NOT EXISTS "AccountingActivity_tenantId_idx" ON "AccountingActivity"("tenantId");

CREATE TABLE IF NOT EXISTS "AccountingProductGroup" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "parentExternalId" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccountingProductGroup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AccountingProductGroup_tenantId_externalId_key" ON "AccountingProductGroup"("tenantId", "externalId");
CREATE INDEX IF NOT EXISTS "AccountingProductGroup_tenantId_idx" ON "AccountingProductGroup"("tenantId");

CREATE TABLE IF NOT EXISTS "AccountingProductGroupMember" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "productExternalId" TEXT NOT NULL,
  "groupExternalId" TEXT NOT NULL,
  CONSTRAINT "AccountingProductGroupMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AccountingProductGroupMember_tenantId_productExternalId_groupExternalId_key" ON "AccountingProductGroupMember"("tenantId", "productExternalId", "groupExternalId");
CREATE INDEX IF NOT EXISTS "AccountingProductGroupMember_tenantId_groupExternalId_idx" ON "AccountingProductGroupMember"("tenantId", "groupExternalId");

ALTER TABLE "AccountingActivity" DROP CONSTRAINT IF EXISTS "AccountingActivity_tenantId_fkey";
ALTER TABLE "AccountingActivity" ADD CONSTRAINT "AccountingActivity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AccountingProductGroup" DROP CONSTRAINT IF EXISTS "AccountingProductGroup_tenantId_fkey";
ALTER TABLE "AccountingProductGroup" ADD CONSTRAINT "AccountingProductGroup_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AccountingProductGroupMember" DROP CONSTRAINT IF EXISTS "AccountingProductGroupMember_tenantId_fkey";
ALTER TABLE "AccountingProductGroupMember" ADD CONSTRAINT "AccountingProductGroupMember_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
