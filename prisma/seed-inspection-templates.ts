/**
 * Standalone seed for inspeksjonsmaler.
 * Kan kjøres på produksjon uten å kjøre full seed:
 *   npx tsx prisma/seed-inspection-templates.ts
 *
 * Idempotent: oppdaterer eksisterende, oppretter manglende.
 */

import { PrismaClient } from "@prisma/client";
import { getGlobalFormTemplateLibrary } from "../src/lib/form-template-library";
import { toIndustryScopeJson } from "../src/lib/industry-scope";

const prisma = new PrismaClient();

async function main() {
  const entries = getGlobalFormTemplateLibrary().filter(
    (e) => e.category === "INSPECTION",
  );

  console.log(`Found ${entries.length} INSPECTION templates to seed...`);

  let created = 0;
  let updated = 0;

  for (const entry of entries) {
    const scopeJson = toIndustryScopeJson(entry.industryScope);
    const existing = await prisma.formTemplate.findFirst({
      where: {
        tenantId: null,
        isGlobal: true,
        title: entry.title,
        category: "INSPECTION",
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.formField.deleteMany({
        where: { formTemplateId: existing.id },
      });
      await prisma.formTemplate.update({
        where: { id: existing.id },
        data: {
          description: entry.description,
          industryScope: scopeJson,
          requiresSignature: entry.requiresSignature ?? false,
          requiresApproval: false,
          accessType: "ALL",
        },
      });
      await prisma.formField.createMany({
        data: entry.fields.map((field, index) => ({
          formTemplateId: existing.id,
          fieldType: field.fieldType,
          label: field.label,
          helpText: field.helpText ?? null,
          placeholder: field.placeholder ?? null,
          isRequired: field.isRequired ?? false,
          order: index + 1,
          options: field.options ? JSON.stringify(field.options) : null,
        })),
      });
      updated++;
    } else {
      const formTemplate = await prisma.formTemplate.create({
        data: {
          tenantId: null,
          isGlobal: true,
          title: entry.title,
          description: entry.description,
          category: "INSPECTION",
          requiresSignature: entry.requiresSignature ?? false,
          requiresApproval: false,
          accessType: "ALL",
          isActive: true,
          industryScope: scopeJson,
          createdBy: "SYSTEM_SEED",
        },
      });
      await prisma.formField.createMany({
        data: entry.fields.map((field, index) => ({
          formTemplateId: formTemplate.id,
          fieldType: field.fieldType,
          label: field.label,
          helpText: field.helpText ?? null,
          placeholder: field.placeholder ?? null,
          isRequired: field.isRequired ?? false,
          order: index + 1,
          options: field.options ? JSON.stringify(field.options) : null,
        })),
      });
      created++;
    }
  }

  console.log(`✅ Done: ${created} created, ${updated} updated.`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
