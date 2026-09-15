export const BCM_PATH = "/dashboard/bcm";

export function isBcmContinuityAudit(input: {
  area?: string | null;
  title?: string | null;
}): boolean {
  const area = input.area?.toLowerCase() ?? "";
  const title = input.title?.toLowerCase() ?? "";
  return (
    area.includes("kontinuitet") ||
    area.includes("beredskap") ||
    title.includes("bcm") ||
    title.includes("kontinuitet") ||
    title.includes("beredskapsøvelse") ||
    title.includes("beredskapsovelse")
  );
}

export function isBcmReturnContext(
  from: string | null | undefined,
  audit?: { area?: string | null; title?: string | null },
): boolean {
  if (from === "bcm") return true;
  return audit ? isBcmContinuityAudit(audit) : false;
}

export function isBcmTemplateCategory(category?: string | null): boolean {
  return (category ?? "").toUpperCase() === "BCM";
}

export function bcmPlanHref(documentId: string): string {
  return `/dashboard/bcm/planer/${documentId}`;
}

export function bcmPlanEditHref(documentId: string): string {
  return `/dashboard/bcm/planer/${documentId}/rediger`;
}

export function bcmAuditHref(auditId: string): string {
  return `/dashboard/bcm/ovelser/${auditId}`;
}

export function bcmAuditEditHref(auditId: string): string {
  return `/dashboard/bcm/ovelser/${auditId}/rediger`;
}

export function bcmNewAuditHref(): string {
  return "/dashboard/bcm/ovelser/ny";
}

export function bcmFormHref(formId: string): string {
  return `/dashboard/bcm/skjemaer/${formId}`;
}
