import type { Prisma } from "@prisma/client";
import { isBcmTemplateCategory } from "@/lib/bcm-audit";

/**
 * Dokumentmodulen er arkivet for styrende dokumenter som skal
 * distribueres til ansatte (IK-HMS § 5: kjennskap til internkontrollen).
 *
 * Innhold som har egen funksjon skal ikke opprettes eller vises her:
 * - BCM / beredskap → /dashboard/bcm (AML § 3-2)
 * - HR / arbeidsavtale → /dashboard/personalarkiv (AML § 14-5/14-6, GDPR)
 * - SDS → stoffkartotek (AML § 4-5)
 * - Sjekklister og skjemaer → /dashboard/forms
 * - HMS-håndbok → /dashboard/hms-handbok
 * - Rutiner → /dashboard/rutiner
 */
export const DISTRIBUTABLE_DOCUMENT_KINDS = ["LAW", "PROCEDURE", "PLAN", "OTHER"] as const;

export type DistributableDocumentKind = (typeof DISTRIBUTABLE_DOCUMENT_KINDS)[number];

export function isHrDocumentCategory(category?: string | null): boolean {
  return (category ?? "").trim().toUpperCase() === "HR";
}

export function isModuleOwnedDocumentCategory(category?: string | null): boolean {
  return isBcmTemplateCategory(category) || isHrDocumentCategory(category);
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

/** Malbiblioteket viser HR-maler (de hentes til personalarkivet), men ikke beredskap. */
export function filterMalerHubDocumentTemplates<T extends { category?: string | null }>(
  templates: T[],
): T[] {
  return templates.filter((template) => !isBcmTemplateCategory(template.category));
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
