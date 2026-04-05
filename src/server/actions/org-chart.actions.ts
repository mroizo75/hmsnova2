"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission, getAuthContext } from "@/lib/server-authorization";

export async function getOrgChart() {
  try {
    const context = await getAuthContext();
    if (!context) {
      return { success: false, error: "Ikke autentisert" };
    }

    const nodes = await prisma.orgChartNode.findMany({
      where: { tenantId: context.tenantId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return { success: true, data: nodes };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke hente organisasjonskart" };
  }
}

export async function createOrgChartNode(input: {
  parentId?: string | null;
  title: string;
  name?: string | null;
  department?: string | null;
  sortOrder?: number;
}) {
  try {
    const context = await requirePermission("canManageUsers");

    if (!input.title || input.title.trim().length === 0) {
      return { success: false, error: "Tittel er påkrevd" };
    }

    if (input.parentId) {
      const parent = await prisma.orgChartNode.findFirst({
        where: { id: input.parentId, tenantId: context.tenantId },
      });
      if (!parent) {
        return { success: false, error: "Overordnet node finnes ikke" };
      }
    }

    const node = await prisma.orgChartNode.create({
      data: {
        tenantId: context.tenantId,
        parentId: input.parentId ?? null,
        title: input.title.trim(),
        name: input.name?.trim() || null,
        department: input.department?.trim() || null,
        sortOrder: input.sortOrder ?? 0,
      },
    });

    revalidatePath("/dashboard/organisasjonskart");
    return { success: true, data: node };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke opprette node" };
  }
}

export async function updateOrgChartNode(input: {
  id: string;
  parentId?: string | null;
  title?: string;
  name?: string | null;
  department?: string | null;
  sortOrder?: number;
}) {
  try {
    const context = await requirePermission("canManageUsers");

    const existing = await prisma.orgChartNode.findFirst({
      where: { id: input.id, tenantId: context.tenantId },
    });

    if (!existing) {
      return { success: false, error: "Node finnes ikke" };
    }

    if (input.parentId === input.id) {
      return { success: false, error: "En node kan ikke være sin egen forelder" };
    }

    const updateData: any = {};
    if (input.title !== undefined) updateData.title = input.title.trim();
    if (input.name !== undefined) updateData.name = input.name?.trim() || null;
    if (input.department !== undefined) updateData.department = input.department?.trim() || null;
    if (input.sortOrder !== undefined) updateData.sortOrder = input.sortOrder;
    if (Object.prototype.hasOwnProperty.call(input, "parentId")) {
      updateData.parentId = input.parentId ?? null;
    }

    const node = await prisma.orgChartNode.update({
      where: { id: input.id },
      data: updateData,
    });

    revalidatePath("/dashboard/organisasjonskart");
    return { success: true, data: node };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke oppdatere node" };
  }
}

export async function deleteOrgChartNode(id: string) {
  try {
    const context = await requirePermission("canManageUsers");

    const existing = await prisma.orgChartNode.findFirst({
      where: { id, tenantId: context.tenantId },
      include: { children: true },
    });

    if (!existing) {
      return { success: false, error: "Node finnes ikke" };
    }

    // Flytt barn til forelderen før sletting
    if (existing.children.length > 0) {
      await prisma.orgChartNode.updateMany({
        where: { parentId: id },
        data: { parentId: existing.parentId },
      });
    }

    await prisma.orgChartNode.delete({
      where: { id },
    });

    revalidatePath("/dashboard/organisasjonskart");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke slette node" };
  }
}
