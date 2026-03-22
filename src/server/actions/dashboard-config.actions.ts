"use server";

import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getDefaultWidgetIdsForIndustry } from "@/features/dashboard/lib/widget-registry";
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
}

const ALLOWED_CUSTOM_ICONS = new Set([
  "star",
  "flag",
  "clipboard",
  "bell",
  "shield",
  "file",
  "check",
  "alert",
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
        return {
          id: widget.id,
          order: index,
          type,
          customLabel,
          customHref,
          customIconName,
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

export async function getDashboardConfig(): Promise<{
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

    const config = await prisma.dashboardConfig.findUnique({
      where: { userId_tenantId: { userId: user.id, tenantId } },
    });

    if (!config) {
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
      return { success: true, data: defaultWidgets };
    }

    const storedWidgets = config.widgets as unknown as DashboardWidgetConfig[];
    return { success: true, data: normalizeDashboardWidgets(storedWidgets) };
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

    const normalizedWidgets = normalizeDashboardWidgets(widgets);

    await prisma.dashboardConfig.upsert({
      where: { userId_tenantId: { userId: user.id, tenantId } },
      update: { widgets: normalizedWidgets as unknown as import("@prisma/client").Prisma.InputJsonValue },
      create: {
        userId: user.id,
        tenantId,
        widgets: normalizedWidgets as unknown as import("@prisma/client").Prisma.InputJsonValue,
      },
    });

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
