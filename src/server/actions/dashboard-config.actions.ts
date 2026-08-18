"use server";

import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getDefaultWidgetIdsForIndustry } from "@/features/dashboard/lib/widget-registry";
import { menuPathsToWidgetIds } from "@/lib/menu-widget-sync";
import {
  DEFAULT_HMS_PULSE_ITEMS,
  ensureMandatoryHmsPulseItems,
  normalizeHmsPulseItems,
  type HmsPulseItem,
} from "@/features/dashboard/lib/hms-pulse-config";
import { UserTenant } from "@prisma/client";

export interface DashboardWidgetConfig {
  id: string;
  order: number;
  type?: "builtin" | "custom";
  customLabel?: string;
  customHref?: string;
  customIconName?: string;
  customColorKey?: string;
}

const ALLOWED_CUSTOM_ICONS = new Set([
  "star", "flag", "clipboard", "bell", "shield", "file", "check", "alert",
  "flame", "droplets", "zap", "hardhat", "stethoscope", "heart", "leaf",
  "wrench", "truck", "building", "utensils", "graduation", "plug",
  "thermometer", "eye", "lock", "package", "hammer", "warehouse",
]);

const ALLOWED_CUSTOM_COLORS = new Set([
  "slate", "blue", "red", "orange", "amber", "yellow", "green", "emerald",
  "teal", "cyan", "sky", "indigo", "violet", "purple", "pink", "rose",
]);

function normalizeDashboardWidgets(input: DashboardWidgetConfig[]): DashboardWidgetConfig[] {
  const seenIds = new Set<string>();
  const normalized = input
    .filter((widget) => typeof widget.id === "string" && widget.id.trim().length > 0)
    .filter((widget) => {
      if (seenIds.has(widget.id)) return false;
      seenIds.add(widget.id);
      return true;
    })
    .map((widget, index) => {
      const type = widget.type === "custom" ? "custom" : "builtin";
      if (type === "custom") {
        const customLabel = (widget.customLabel || "").trim();
        const customHref = (widget.customHref || "").trim();
        const customIconName = (widget.customIconName || "").trim().toLowerCase();
        if (customLabel.length === 0 || customHref.length === 0) {
          return null;
        }
        if (!ALLOWED_CUSTOM_ICONS.has(customIconName)) {
          return null;
        }
        const customColorKey = (widget.customColorKey || "").trim().toLowerCase();
        return {
          id: widget.id,
          order: index,
          type,
          customLabel,
          customHref,
          customIconName,
          ...(ALLOWED_CUSTOM_COLORS.has(customColorKey) ? { customColorKey } : {}),
        } satisfies DashboardWidgetConfig;
      }
      return {
        id: widget.id,
        order: index,
        type,
      } satisfies DashboardWidgetConfig;
    })
    .filter((widget) => widget !== null) as DashboardWidgetConfig[];

  return normalized;
}

function resolveActiveTenantId(
  tenantMemberships: UserTenant[],
  sessionTenantId?: string
): string | null {
  if (sessionTenantId) {
    const hasMembership = tenantMemberships.some((membership) => membership.tenantId === sessionTenantId);
    if (!hasMembership) return null;
    return sessionTenantId;
  }
  return tenantMemberships[0]?.tenantId ?? null;
}

/**
 * Utled widget-IDer fra tenant-data. Prioriterer simpleMenuItems
 * slik at fliser og enkel meny alltid er i synk.
 * Faller tilbake til bransje-config hvis simpleMenuItems er tom.
 */
function deriveWidgetIdsFromTenant(
  tenant: { simpleMenuItems?: unknown; industry?: string | null } | null
): string[] {
  const menuItems = tenant?.simpleMenuItems;
  if (Array.isArray(menuItems) && menuItems.length > 0) {
    return menuPathsToWidgetIds(menuItems as string[]);
  }
  return getDefaultWidgetIdsForIndustry(tenant?.industry);
}

export async function getDashboardConfig(): Promise<{
  success: boolean;
  data?: DashboardWidgetConfig[];
  locked?: boolean;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { success: false, error: "Ikke autentisert" };
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { tenants: true },
    });

    if (!user || user.tenants.length === 0) {
      return { success: false, error: "Ingen tenant funnet" };
    }

    const tenantId = resolveActiveTenantId(
      user.tenants,
      (session.user as { tenantId?: string }).tenantId
    );
    if (!tenantId) {
      return { success: false, error: "Ingen gyldig tenant-kontekst" };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { industry: true, simpleMenuItems: true, dashboardLocked: true, lockedDashboardConfig: true },
    });

    const membership = user.tenants.find((t) => t.tenantId === tenantId);
    const isAdmin = membership?.role === "ADMIN";

    if (tenant?.dashboardLocked && !isAdmin) {
      if (tenant.lockedDashboardConfig) {
        const lockedWidgets = tenant.lockedDashboardConfig as unknown as DashboardWidgetConfig[];
        return {
          success: true,
          data: normalizeDashboardWidgets(lockedWidgets),
          locked: true,
        };
      }
      const widgetIds = deriveWidgetIdsFromTenant(tenant);
      return {
        success: true,
        data: widgetIds.map((id, index) => ({ id, order: index, type: "builtin" as const })),
        locked: true,
      };
    }

    const config = await prisma.dashboardConfig.findUnique({
      where: { userId_tenantId: { userId: user.id, tenantId } },
    });

    if (!config) {
      const widgetIds = deriveWidgetIdsFromTenant(tenant);
      return {
        success: true,
        data: widgetIds.map((id, index) => ({ id, order: index, type: "builtin" as const })),
      };
    }

    const storedWidgets = config.widgets as unknown as DashboardWidgetConfig[];
    return { success: true, data: normalizeDashboardWidgets(storedWidgets) };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Ukjent feil";
    return { success: false, error: message };
  }
}

/**
 * Slett brukerens lagrede dashboard-config og returner bransje-defaults.
 * Brukes for "Tilbakestill"-knappen i dashboard-redigering.
 */
export async function resetDashboardToDefaults(): Promise<{
  success: boolean;
  data?: DashboardWidgetConfig[];
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { success: false, error: "Ikke autentisert" };
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { tenants: true },
    });

    if (!user || user.tenants.length === 0) {
      return { success: false, error: "Ingen tenant funnet" };
    }

    const tenantId = resolveActiveTenantId(
      user.tenants,
      (session.user as { tenantId?: string }).tenantId
    );
    if (!tenantId) {
      return { success: false, error: "Ingen gyldig tenant-kontekst" };
    }

    await prisma.dashboardConfig.deleteMany({
      where: { userId: user.id, tenantId },
    });

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { industry: true, simpleMenuItems: true },
    });

    const defaultWidgetIds = deriveWidgetIdsFromTenant(tenant);
    return {
      success: true,
      data: defaultWidgetIds.map((id, index) => ({ id, order: index, type: "builtin" as const })),
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Ukjent feil";
    return { success: false, error: message };
  }
}

export async function saveDashboardConfig(
  widgets: DashboardWidgetConfig[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { success: false, error: "Ikke autentisert" };
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { tenants: true },
    });

    if (!user || user.tenants.length === 0) {
      return { success: false, error: "Ingen tenant funnet" };
    }

    const tenantId = resolveActiveTenantId(
      user.tenants,
      (session.user as { tenantId?: string }).tenantId
    );
    if (!tenantId) {
      return { success: false, error: "Ingen gyldig tenant-kontekst" };
    }

    const tenantRecord = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { dashboardLocked: true },
    });

    const membership = user.tenants.find((t) => t.tenantId === tenantId);
    const isAdmin = membership?.role === "ADMIN";

    if (tenantRecord?.dashboardLocked && !isAdmin) {
      return { success: false, error: "Dashboardet er låst av administrator" };
    }

    const normalizedWidgets = normalizeDashboardWidgets(widgets);
    const widgetsJson = normalizedWidgets as unknown as import("@prisma/client").Prisma.InputJsonValue;

    await prisma.dashboardConfig.upsert({
      where: { userId_tenantId: { userId: user.id, tenantId } },
      update: { widgets: widgetsJson },
      create: { userId: user.id, tenantId, widgets: widgetsJson },
    });

    if (tenantRecord?.dashboardLocked && isAdmin) {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { lockedDashboardConfig: widgetsJson },
      });
    }

    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Ukjent feil";
    return { success: false, error: message };
  }
}

export async function getHmsPulseConfig(): Promise<{
  success: boolean;
  data?: HmsPulseItem[];
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { success: false, error: "Ikke autentisert" };
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { tenants: true },
    });

    if (!user || user.tenants.length === 0) {
      return { success: false, error: "Ingen tenant funnet" };
    }

    const tenantId = resolveActiveTenantId(
      user.tenants,
      (session.user as { tenantId?: string }).tenantId
    );
    if (!tenantId) {
      return { success: false, error: "Ingen gyldig tenant-kontekst" };
    }
    const config = await prisma.dashboardConfig.findUnique({
      where: { userId_tenantId: { userId: user.id, tenantId } },
      select: { hmsPulseItems: true },
    });

    if (!config?.hmsPulseItems) {
      return { success: true, data: DEFAULT_HMS_PULSE_ITEMS };
    }

    const items = ensureMandatoryHmsPulseItems(
      normalizeHmsPulseItems(config.hmsPulseItems as unknown as HmsPulseItem[])
    );
    return { success: true, data: items.length > 0 ? items : DEFAULT_HMS_PULSE_ITEMS };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Ukjent feil";
    return { success: false, error: message };
  }
}

export async function saveHmsPulseConfig(
  items: HmsPulseItem[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { success: false, error: "Ikke autentisert" };
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { tenants: true },
    });

    if (!user || user.tenants.length === 0) {
      return { success: false, error: "Ingen tenant funnet" };
    }

    const tenantId = resolveActiveTenantId(
      user.tenants,
      (session.user as { tenantId?: string }).tenantId
    );
    if (!tenantId) {
      return { success: false, error: "Ingen gyldig tenant-kontekst" };
    }

    const tenantData = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { dashboardLocked: true },
    });
    if (tenantData?.dashboardLocked) {
      const membership = user.tenants.find((t) => t.tenantId === tenantId);
      if (!membership || membership.role !== "ADMIN") {
        return { success: false, error: "Dashboardet er låst av administrator" };
      }
    }

    const normalizedItems = ensureMandatoryHmsPulseItems(normalizeHmsPulseItems(items));
    const safeItems = normalizedItems.length > 0 ? normalizedItems : DEFAULT_HMS_PULSE_ITEMS;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { industry: true },
    });
    const defaultWidgetIds = getDefaultWidgetIdsForIndustry(tenant?.industry);
    const defaultWidgets = defaultWidgetIds.map((id, index) => ({
      id,
      order: index,
      type: "builtin" as const,
    }));

    await prisma.dashboardConfig.upsert({
      where: { userId_tenantId: { userId: user.id, tenantId } },
      update: {
        hmsPulseItems: safeItems as unknown as import("@prisma/client").Prisma.InputJsonValue,
      },
      create: {
        userId: user.id,
        tenantId,
        widgets: defaultWidgets as unknown as import("@prisma/client").Prisma.InputJsonValue,
        hmsPulseItems: safeItems as unknown as import("@prisma/client").Prisma.InputJsonValue,
      },
    });

    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Ukjent feil";
    return { success: false, error: message };
  }
}
