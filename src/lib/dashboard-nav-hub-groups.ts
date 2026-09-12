import {
  CORE_HUB_ORDER,
  PINNED_FOOTER_HUB,
  type CoreHub,
  type DashboardNavItemConfig,
} from "@/lib/dashboard-nav-config";

export interface DashboardNavHubGroup {
  hub: CoreHub;
  labelKey: string;
  items: DashboardNavItemConfig[];
}

const HUB_LABEL_KEYS: Record<CoreHub, string> = {
  oversikt: "dashboardNav.hubs.oversikt",
  avvikTiltak: "dashboardNav.hubs.avvikTiltak",
  dokumenter: "dashboardNav.hubs.dokumenter",
  risiko: "dashboardNav.hubs.risiko",
  skjema: "dashboardNav.hubs.skjema",
  organisasjon: "dashboardNav.hubs.organisasjon",
  hr: "dashboardNav.hubs.hr",
  system: "dashboardNav.hubs.system",
};

/**
 * Grupperer allerede filtrerte menyelementer under hubbene i fast
 * arbeidsflyt-rekkefølge (CORE_HUB_ORDER). Rekkefølgen innad i hver gruppe
 * følger DASHBOARD_NAV_CONFIG (ikke alfabetisk).
 */
export function groupNavItemsByHub(items: DashboardNavItemConfig[]): DashboardNavHubGroup[] {
  return CORE_HUB_ORDER.map((hub) => ({
    hub,
    labelKey: HUB_LABEL_KEYS[hub],
    items: items.filter((item) => item.coreHub === hub),
  })).filter((group) => group.items.length > 0);
}

export function partitionNavHubGroups(groups: DashboardNavHubGroup[]): {
  workGroups: DashboardNavHubGroup[];
  footerGroups: DashboardNavHubGroup[];
} {
  const workGroups: DashboardNavHubGroup[] = [];
  const footerGroups: DashboardNavHubGroup[] = [];
  for (const group of groups) {
    if (group.hub === PINNED_FOOTER_HUB) {
      footerGroups.push(group);
    } else {
      workGroups.push(group);
    }
  }
  return { workGroups, footerGroups };
}

export const NAV_HUB_OPEN_STORAGE_KEY = "hms-nova-nav-hubs";

const CORE_HUB_SET = new Set<string>(CORE_HUB_ORDER);

export function parseNavHubOpenState(raw: string | null): Partial<Record<CoreHub, boolean>> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const result: Partial<Record<CoreHub, boolean>> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (CORE_HUB_SET.has(key) && typeof value === "boolean") {
        result[key as CoreHub] = value;
      }
    }
    return result;
  } catch {
    return {};
  }
}

/** Hubber er åpne som standard. Lagret false betyr at brukeren har lukket dem. */
export function isNavHubOpen(hub: CoreHub, stored: Partial<Record<CoreHub, boolean>>): boolean {
  return stored[hub] !== false;
}
