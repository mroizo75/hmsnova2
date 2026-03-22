import { matchesIndustryScope } from "@/lib/industry-scope";

export function tenantCanUseGlobalFormTemplate(
  form: { isGlobal: boolean; tenantId: string | null; industryScope: unknown },
  tenantIndustry: string | null | undefined,
  options: { allTemplatesView?: boolean }
): boolean {
  if (!form.isGlobal || form.tenantId !== null) {
    return true;
  }
  if (options.allTemplatesView) {
    return true;
  }
  return matchesIndustryScope(form.industryScope, tenantIndustry);
}
