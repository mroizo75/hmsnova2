import type { Prisma } from "@prisma/client";
import { isBcmTemplateCategory } from "@/lib/bcm-audit";

/**
 * Dokumentmodulen er arkivet for styrende dokumenter som skal
 * distribueres til ansatte (IK-HMS § 5: kjennskap til internkontrollen).
 *
 * Innhold som har egen funksjon skal ikke opprettes eller vises her:
 * - BCM / beredskap → /dashboard/bcm (AML § 3-2)
 * - SDS → stoffkartotek (AML § 4-5)
 * - Sjekklister og skjemaer → /dashboard/forms
 * - HMS-håndbok → /dashboard/hms-handbok
 * - Rutiner → /dashboard/rutiner
 */
export const DISTRIBUTABLE_DOCUMENT_KINDS = ["LAW", "PROCEDURE", "PLAN", "OTHER"] as const;

export type DistributableDocumentKind = (typeof DISTRIBUTABLE_DOCUMENT_KINDS)[number];

export function isModuleOwnedDocumentCategory(category?: string | null): boolean {
  return isBcmTemplateCategory(category);
}

export function isModuleOwnedFormCategory(category?: string | null): boolean {
  return isBcmTemplateCategory(category);
}

export function isDistributableDocumentKind(kind?: string | null): boolean {
  return DISTRIBUTABLE_DOCUMENT_KINDS.includes(kind as DistributableDocumentKind);
}

export const moduleOwnedDocumentsWhere: Prisma.DocumentWhereInput = {
  OR: [
    {
      template: {
        is: { category: "BCM" },
      },
    },
    {
      AND: [
        { kind: "PLAN" },
        {
          OR: [
            { title: { contains: "beredskap" } },
            { title: { contains: "kontinuitet" } },
            { title: { contains: "bcm" } },
            { title: { contains: "krisehåndbok" } },
            { title: { contains: "krisehandbok" } },
          ],
        },
      ],
    },
  ],
};

export const distributableDocumentsWhere: Prisma.DocumentWhereInput = {
  NOT: moduleOwnedDocumentsWhere,
};

export function filterDistributableDocumentTemplates<T extends { category?: string | null }>(
  templates: T[],
): T[] {
  return templates.filter((template) => !isModuleOwnedDocumentCategory(template.category));
}

export function filterDistributableFormTemplates<T extends { category?: string | null }>(
  templates: T[],
): T[] {
  return templates.filter((template) => !isModuleOwnedFormCategory(template.category));
}

export function documentKindsForForm(currentKind?: string | null): string[] {
  const kinds = [...DISTRIBUTABLE_DOCUMENT_KINDS];
  if (currentKind && !kinds.includes(currentKind as DistributableDocumentKind)) {
    kinds.push(currentKind as DistributableDocumentKind);
  }
  return kinds;
}
