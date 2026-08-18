"use server";

import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/server-authorization";
import { revalidatePath } from "next/cache";

const DEFAULT_NAVIGATION_ITEMS = [
  { key: "dashboard", label: "nav.dashboard", icon: "LayoutDashboard", href: "/dashboard", permission: "dashboard", isSimpleMode: true, order: 1 },
  { key: "documents", label: "nav.documents", icon: "FileText", href: "/dashboard/documents", permission: "documents", isSimpleMode: true, order: 2 },
  { key: "routines", label: "nav.routines", icon: "ListChecks", href: "/dashboard/rutiner", permission: "routines", isSimpleMode: true, order: 3 },
  { key: "electro", label: "nav.electro", icon: "FileCheck2", href: "/dashboard/samsvarserklaringer", permission: "documents", isSimpleMode: true, order: 3 },
  { key: "incidents", label: "nav.incidents", icon: "AlertTriangle", href: "/dashboard/incidents", permission: "incidents", isSimpleMode: true, order: 4 },
  { key: "ruh", label: "nav.ruh", icon: "FileWarning", href: "/dashboard/ruh", permission: "ruh", isSimpleMode: true, order: 4 },
  { key: "sja", label: "nav.sja", icon: "HardHat", href: "/dashboard/sja", permission: "sja", isSimpleMode: true, order: 4 },
  { key: "inspections", label: "nav.inspections", icon: "ClipboardCheck", href: "/dashboard/inspections", permission: "inspections", isSimpleMode: true, order: 5 },
  { key: "training", label: "nav.training", icon: "GraduationCap", href: "/dashboard/training", permission: "training", isSimpleMode: true, order: 5 },
  { key: "actions", label: "nav.actions", icon: "CheckSquare", href: "/dashboard/actions", permission: "actions", isSimpleMode: true, order: 6 },
  { key: "chemicals", label: "nav.chemicals", icon: "Beaker", href: "/dashboard/chemicals", permission: "chemicals", isSimpleMode: true, order: 7 },
  { key: "risks", label: "nav.risks", icon: "ShieldAlert", href: "/dashboard/risks", permission: "risks", isSimpleMode: false, order: 9 },
  { key: "riskRegister", label: "nav.riskRegister", icon: "ScrollText", href: "/dashboard/risk-register", permission: "riskRegister", isSimpleMode: false, order: 10 },
  { key: "wellbeing", label: "nav.wellbeing", icon: "Heart", href: "/dashboard/wellbeing", permission: "wellbeing", isSimpleMode: false, order: 12 },
  { key: "complaints", label: "nav.complaints", icon: "MessageSquareWarning", href: "/dashboard/complaints", permission: "complaints", isSimpleMode: false, order: 13 },
  { key: "feedback", label: "nav.feedback", icon: "MessageSquare", href: "/dashboard/feedback", permission: "feedback", isSimpleMode: false, order: 14 },
  { key: "environment", label: "nav.environment", icon: "Leaf", href: "/dashboard/environment", permission: "environment", isSimpleMode: false, order: 15 },
  { key: "bcm", label: "nav.bcm", icon: "ShieldCheck", href: "/dashboard/bcm", permission: "bcm", isSimpleMode: false, order: 16 },
  { key: "audits", label: "nav.audits", icon: "Search", href: "/dashboard/audits", permission: "audits", isSimpleMode: false, order: 17 },
  { key: "managementReviews", label: "nav.managementReviews", icon: "Users", href: "/dashboard/management-reviews", permission: "managementReviews", isSimpleMode: false, order: 18 },
  { key: "annualHmsPlan", label: "nav.annualHmsPlan", icon: "ClipboardCheck", href: "/dashboard/annual-hms-plan", permission: "annualHmsPlan", isSimpleMode: true, order: 19 },
  { key: "meetings", label: "nav.meetings", icon: "CalendarDays", href: "/dashboard/meetings", permission: "meetings", isSimpleMode: false, order: 20 },
  { key: "whistleblowing", label: "nav.whistleblowing", icon: "MessageCircle", href: "/dashboard/whistleblowing", permission: "whistleblowing", isSimpleMode: false, order: 21 },
  { key: "goals", label: "nav.goals", icon: "Target", href: "/dashboard/goals", permission: "goals", isSimpleMode: false, order: 22 },
  { key: "settings", label: "nav.settings", icon: "Settings", href: "/dashboard/settings", permission: "settings", isSimpleMode: true, order: 99 },
];

export async function getNavigationItems(tenantId: string) {
  try {
    const context = await requirePermission("canAccessDashboard");

    const tenantItems = await prisma.navigationItem.findMany({
      where: { tenantId },
      orderBy: { order: "asc" },
    });

    if (tenantItems.length === 0) {
      const globalItems = await prisma.navigationItem.findMany({
        where: { tenantId: null, isActive: true },
        orderBy: { order: "asc" },
      });
      return { success: true, data: globalItems };
    }

    return { success: true, data: tenantItems };
  } catch (error: any) {
    console.error("Get navigation items error:", error);
    return { success: false, error: error.message || "Kunne ikke hente meny-items" };
  }
}

export async function initializeDefaultNavigation(tenantId?: string) {
  try {
    const items = DEFAULT_NAVIGATION_ITEMS.map((item) => ({
      ...item,
      tenantId: tenantId || null,
    }));

    await prisma.navigationItem.createMany({
      data: items,
      skipDuplicates: true,
    });

    return { success: true, data: items };
  } catch (error: any) {
    console.error("Initialize navigation error:", error);
    return { success: false, error: error.message || "Kunne ikke initialisere meny" };
  }
}

export async function updateNavigationItem(id: string, data: {
  label?: string;
  icon?: string;
  href?: string;
  isSimpleMode?: boolean;
  isActive?: boolean;
  order?: number;
}) {
  try {
    const context = await requirePermission("canUpdateSettings");

    const updated = await prisma.navigationItem.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");

    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Update navigation item error:", error);
    return { success: false, error: error.message || "Kunne ikke oppdatere meny-item" };
  }
}

export async function createNavigationItem(tenantId: string, data: {
  key: string;
  label: string;
  icon?: string;
  href: string;
  permission: string;
  isSimpleMode?: boolean;
  order?: number;
}) {
  try {
    const context = await requirePermission("canUpdateSettings");

    const created = await prisma.navigationItem.create({
      data: {
        ...data,
        tenantId,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");

    return { success: true, data: created };
  } catch (error: any) {
    console.error("Create navigation item error:", error);
    return { success: false, error: error.message || "Kunne ikke opprette meny-item" };
  }
}

export async function deleteNavigationItem(id: string) {
  try {
    const context = await requirePermission("canUpdateSettings");

    await prisma.navigationItem.delete({
      where: { id },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");

    return { success: true };
  } catch (error: any) {
    console.error("Delete navigation item error:", error);
    return { success: false, error: error.message || "Kunne ikke slette meny-item" };
  }
}

export async function reorderNavigationItems(items: { id: string; order: number }[]) {
  try {
    const context = await requirePermission("canUpdateSettings");

    await Promise.all(
      items.map((item) =>
        prisma.navigationItem.update({
          where: { id: item.id },
          data: { order: item.order },
        })
      )
    );

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");

    return { success: true };
  } catch (error: any) {
    console.error("Reorder navigation items error:", error);
    return { success: false, error: error.message || "Kunne ikke omorganisere meny" };
  }
}
