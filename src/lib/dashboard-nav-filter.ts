import { Role } from "@prisma/client";
import { BRANSJE_MODULES } from "@/lib/bransje-modules";
import {
  DASHBOARD_NAV_CONFIG,
  type DashboardNavItemConfig,
} from "@/lib/dashboard-nav-config";
import {
  isNavItemAllowedByModuleVisibility,
  type ModuleVisibilityConfig,
} from "@/lib/module-visibility";
import type { RolePermissions } from "@/lib/permissions";

export function normalizeIndustryKey(industry: string | null | undefined): string | null {
  if (!industry) return null;
  const key = industry.trim().toLowerCase();
  return key.length > 0 ? key : null;
}

export function isNavItemAllowedForIndustry(
  industries: string[] | undefined,
  tenantIndustry: string | null | undefined,
): boolean {
  if (!industries || industries.length === 0) return true;
  const key = normalizeIndustryKey(tenantIndustry);
  if (!key) return false;
  return industries.includes(key);
}

export function getIndustrySimpleHrefs(industry: string | null | undefined): string[] {
  const key = normalizeIndustryKey(industry);
  if (!key) return [];
  return BRANSJE_MODULES[key]?.modules ?? [];
}

export function isHrefVisibleInSimpleMode(
  href: string,
  defaultSimple: boolean,
  alwaysShow: boolean | undefined,
  simpleMenuItems: string[] | null,
  industryHrefs: string[],
): boolean {
  if (alwaysShow) return true;
  if (industryHrefs.includes(href)) return true;
  if (simpleMenuItems !== null) return simpleMenuItems.includes(href);
  return defaultSimple;
}

export function filterDashboardNavItems(opts: {
  visibleNavItems: Record<string, boolean | undefined>;
  role: Role | null;
  permissions: RolePermissions | null;
  moduleVisibility: ModuleVisibilityConfig | null;
  tenantFeatures: string[] | null;
  tenantIndustry: string | null;
  isSimpleMode: boolean;
  simpleMenuItems: string[] | null;
  hasKonsernMenu?: boolean;
  items?: DashboardNavItemConfig[];
}): DashboardNavItemConfig[] {
  const industryHrefs = getIndustrySimpleHrefs(opts.tenantIndustry);
  const items = opts.items ?? DASHBOARD_NAV_CONFIG;

  return items.filter((item) => {
    if (item.requiresKonsern && !opts.hasKonsernMenu) return false;
    if (!opts.visibleNavItems[item.permission]) return false;
    if (item.feature && !opts.tenantFeatures?.includes(item.feature)) return false;
    if (!isNavItemAllowedForIndustry(item.industries, opts.tenantIndustry)) return false;
    if (
      opts.role &&
      !isNavItemAllowedByModuleVisibility(
        item.permission,
        opts.role,
        opts.moduleVisibility,
        opts.permissions,
      )
    ) {
      return false;
    }
    if (!opts.isSimpleMode) return true;
    return isHrefVisibleInSimpleMode(
      item.href,
      item.defaultSimple,
      item.alwaysShow,
      opts.simpleMenuItems,
      industryHrefs,
    );
  });
}

export const DASHBOARD_HOME_HREF = "/dashboard";

export function sortDashboardNavItems(
  items: DashboardNavItemConfig[],
  getLabel: (item: DashboardNavItemConfig) => string,
): DashboardNavItemConfig[] {
  const home = items.filter((item) => item.href === DASHBOARD_HOME_HREF);
  const rest = items
    .filter((item) => item.href !== DASHBOARD_HOME_HREF)
    .sort((a, b) => getLabel(a).localeCompare(getLabel(b), "nb"));
  return [...home, ...rest];
}
