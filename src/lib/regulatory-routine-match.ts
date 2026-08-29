/**
 * Kobler lovkrav (IK-HMS § 5, AML m.m.) mot rutinemaler via kategori og lovhjemmel.
 */

export type RoutineMatchInput = {
  category: string | null;
  legalReference: string | null;
};

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function legalParts(legalText: string): string[] {
  return legalText
    .split(/[,;/]| og /i)
    .map((part) => normalize(part))
    .filter((part) => part.length >= 4);
}

export function isRoutineRecommendedForRequirements(
  template: RoutineMatchInput,
  requirementCategories: string[],
  requirementLegalBases: string[],
): boolean {
  const category = template.category?.trim();
  if (category && requirementCategories.includes(category)) {
    return true;
  }

  const reference = template.legalReference?.trim();
  if (!reference) {
    return false;
  }

  const templateParts = legalParts(reference);
  const requirementParts = requirementLegalBases.flatMap(legalParts);
  return templateParts.some((tpl) =>
    requirementParts.some((req) => req.includes(tpl) || tpl.includes(req)),
  );
}

export function partitionRoutineTemplateIds(
  selectedIds: string[],
  publishedTemplateIds: string[],
): { toPublish: string[]; toKeep: string[] } {
  const selected = new Set(selectedIds);
  const published = new Set(publishedTemplateIds);
  const toPublish = selectedIds.filter((id) => !published.has(id));
  const toKeep = publishedTemplateIds.filter((id) => selected.has(id));
  return { toPublish, toKeep };
}

export function templateIdsToArchive(
  publishedTemplateIds: string[],
  selectedIds: string[],
): string[] {
  const selected = new Set(selectedIds);
  return publishedTemplateIds.filter((id) => !selected.has(id));
}
