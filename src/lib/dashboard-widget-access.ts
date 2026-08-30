import { DASHBOARD_NAV_CONFIG } from "@/lib/dashboard-nav-config";

const PERMISSION_ALIASES: Record<string, string> = {
  bcm: "audits",
  wellbeing: "inspections",
};

export function resolveWidgetNavPermission(permission?: string): string | undefined {
  if (!permission) return undefined;
  return PERMISSION_ALIASES[permission] ?? permission;
}

function navPath(href: string): string {
  return href.split("?")[0];
}

export function isDashboardWidgetAllowed(
  widget: { permission?: string; href: string },
  visibleNavItems: Record<string, boolean | undefined>,
): boolean {
  const permission = resolveWidgetNavPermission(widget.permission);
  if (permission) {
    return visibleNavItems[permission] === true;
  }

  const path = navPath(widget.href);
  const navItem = DASHBOARD_NAV_CONFIG.filter(
    (item) => path === item.href || (item.href !== "/dashboard" && path.startsWith(`${item.href}/`)),
  ).sort((a, b) => b.href.length - a.href.length)[0];
  if (!navItem) return false;
  return visibleNavItems[navItem.permission] === true;
}

export function filterDashboardWidgets<T extends { permission?: string; href: string }>(
  widgets: T[],
  visibleNavItems: Record<string, boolean | undefined>,
): T[] {
  return widgets.filter((widget) => isDashboardWidgetAllowed(widget, visibleNavItems));
}
