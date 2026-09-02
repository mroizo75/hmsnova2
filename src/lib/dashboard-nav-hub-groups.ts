import { CORE_HUB_ORDER, type CoreHub, type DashboardNavItemConfig } from "@/lib/dashboard-nav-config";

export interface DashboardNavHubGroup {
  hub: CoreHub;
  labelKey: string;
  items: DashboardNavItemConfig[];
}

const HUB_LABEL_KEYS: Record<CoreHub, string> = {
  oversikt: "dashboardNav.hubs.oversikt",
  handbok: "dashboardNav.hubs.handbok",
  risiko: "dashboardNav.hubs.risiko",
  avvikTiltak: "dashboardNav.hubs.avvikTiltak",
  organisasjon: "dashboardNav.hubs.organisasjon",
  tilleggsmoduler: "dashboardNav.hubs.tilleggsmoduler",
};

/**
 * Grupperer allerede filtrerte/sorterte menyelementer under de 5 core-hubbene
 * + tilleggsmoduler, i fast rekkefølge (CORE_HUB_ORDER). Rekkefølgen innad i
 * hver gruppe beholdes slik den kom inn (dvs. alfabetisk fra sortDashboardNavItems).
 */
export function groupNavItemsByHub(items: DashboardNavItemConfig[]): DashboardNavHubGroup[] {
  return CORE_HUB_ORDER.map((hub) => ({
    hub,
    labelKey: HUB_LABEL_KEYS[hub],
    items: items.filter((item) => item.coreHub === hub),
  })).filter((group) => group.items.length > 0);
}
