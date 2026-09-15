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
import { aliasDashboardMenuHrefs } from "@/lib/legal-link-repair";
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
  const industryHrefs = aliasDashboardMenuHrefs(getIndustrySimpleHrefs(opts.tenantIndustry)) ?? [];
  const simpleMenuItems = aliasDashboardMenuHrefs(opts.simpleMenuItems);
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
      simpleMenuItems,
      industryHrefs,
    );
  });
}

export const DASHBOARD_HOME_HREF = "/dashboard";

export function isDashboardNavHrefActive(
  pathname: string,
  href: string,
  allHrefs: string[] = [],
): boolean {
  if (href === DASHBOARD_HOME_HREF) {
    return pathname === DASHBOARD_HOME_HREF || pathname === `${DASHBOARD_HOME_HREF}/`;
  }
  const matches = pathname === href || pathname.startsWith(`${href}/`);
  if (!matches) return false;
  return !allHrefs.some(
    (other) =>
      other !== href &&
      other.startsWith(`${href}/`) &&
      (pathname === other || pathname.startsWith(`${other}/`)),
  );
}

const NAV_CONFIG_ORDER = new Map(
  DASHBOARD_NAV_CONFIG.map((item, index) => [item.href, index]),
);

/**
 * Beholder arbeidsflyt-rekkefølgen fra DASHBOARD_NAV_CONFIG.
 * getLabel brukes bare som tiebreaker for ukjente href.
 */
export function sortDashboardNavItems(
  items: DashboardNavItemConfig[],
  getLabel?: (item: DashboardNavItemConfig) => string,
): DashboardNavItemConfig[] {
  return [...items].sort((a, b) => {
    const aOrder = NAV_CONFIG_ORDER.get(a.href) ?? Number.MAX_SAFE_INTEGER;
    const bOrder = NAV_CONFIG_ORDER.get(b.href) ?? Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    if (!getLabel) return 0;
    return getLabel(a).localeCompare(getLabel(b), "nb");
  });
}
