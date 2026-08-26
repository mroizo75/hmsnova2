"use server";

import { revalidatePath } from "next/cache";
import {
  CorporateGroupContentType,
  CorporateGroupDistMode,
  CorporateGroupContentStatus,
} from "@prisma/client";

import { prisma } from "@/lib/db";
import {
  requireGroupPermission,
  requireCorporateGroupContext,
  requireTenantInGroup,
  getAccessibleTenantIds,
} from "@/lib/corporate-group-context";

export async function listGroupContent(filters?: {
  contentType?: CorporateGroupContentType;
  status?: CorporateGroupContentStatus;
}) {
  const context = await requireGroupPermission("canReadContent");

  return prisma.corporateGroupContent.findMany({
    where: {
      groupId: context.groupId,
      ...(filters?.contentType && { contentType: filters.contentType }),
      ...(filters?.status && { status: filters.status }),
    },
    include: {
      _count: { select: { distributions: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getGroupContentById(contentId: string) {
  const context = await requireGroupPermission("canReadContent");

  const content = await prisma.corporateGroupContent.findUnique({
    where: { id: contentId },
    include: {
      distributions: {
        include: {
          tenant: {
            select: { id: true, name: true, slug: true, city: true },
          },
        },
      },
    },
  });

  if (!content || content.groupId !== context.groupId) {
    throw new Error("Innhold ikke funnet");
  }

  return content;
}

export async function createGroupContent(data: {
  contentType: CorporateGroupContentType;
  title: string;
  description?: string;
  content?: Record<string, unknown>;
  fileKey?: string;
  mime?: string;
  distributionMode?: CorporateGroupDistMode;
  legalReference?: string;
  category?: string;
}) {
  const context = await requireGroupPermission("canCreateContent");

  const created = await prisma.corporateGroupContent.create({
    data: {
      groupId: context.groupId,
      contentType: data.contentType,
      title: data.title,
      description: data.description,
      content: data.content ? JSON.parse(JSON.stringify(data.content)) : undefined,
      fileKey: data.fileKey,
      mime: data.mime,
      distributionMode: data.distributionMode ?? "CUSTOMIZABLE",
      legalReference: data.legalReference,
      category: data.category,
      createdById: context.userId,
    },
  });

  await logContentAction(context.groupId, context.userId, "CREATE_CONTENT", created.id);
  revalidatePath("/konsern/innhold");
  return created;
}

export async function updateGroupContent(
  contentId: string,
  data: {
    title?: string;
    description?: string;
    content?: Record<string, unknown>;
    fileKey?: string;
    mime?: string;
    distributionMode?: CorporateGroupDistMode;
    legalReference?: string;
    category?: string;
    status?: CorporateGroupContentStatus;
  }
) {
  const context = await requireGroupPermission("canEditContent");

  const existing = await prisma.corporateGroupContent.findUnique({
    where: { id: contentId },
  });

  if (!existing || existing.groupId !== context.groupId) {
    throw new Error("Innhold ikke funnet");
  }

  const updated = await prisma.corporateGroupContent.update({
    where: { id: contentId },
    data: {
      ...data,
      content: data.content ? JSON.parse(JSON.stringify(data.content)) : undefined,
      updatedById: context.userId,
    },
  });

  if (existing.status === "PUBLISHED" && data.content) {
    await syncLockedDistributions(contentId, context.groupId, context.userId);
  }

  await logContentAction(context.groupId, context.userId, "UPDATE_CONTENT", contentId);
  revalidatePath("/konsern/innhold");
  return updated;
}

export async function publishGroupContent(contentId: string) {
  const context = await requireGroupPermission("canPublishContent");

  const existing = await prisma.corporateGroupContent.findUnique({
    where: { id: contentId },
  });

  if (!existing || existing.groupId !== context.groupId) {
    throw new Error("Innhold ikke funnet");
  }

  await prisma.corporateGroupContent.update({
    where: { id: contentId },
    data: { status: "PUBLISHED", updatedById: context.userId },
  });

  await logContentAction(context.groupId, context.userId, "PUBLISH_CONTENT", contentId);
  revalidatePath("/konsern/innhold");
}

export async function archiveGroupContent(contentId: string) {
  const context = await requireGroupPermission("canEditContent");

  const existing = await prisma.corporateGroupContent.findUnique({
    where: { id: contentId },
  });

  if (!existing || existing.groupId !== context.groupId) {
    throw new Error("Innhold ikke funnet");
  }

  await prisma.corporateGroupContent.update({
    where: { id: contentId },
    data: { status: "ARCHIVED", updatedById: context.userId },
  });

  await logContentAction(context.groupId, context.userId, "ARCHIVE_CONTENT", contentId);
  revalidatePath("/konsern/innhold");
}

export async function deleteGroupContent(contentId: string) {
  const context = await requireGroupPermission("canEditContent");

  const existing = await prisma.corporateGroupContent.findUnique({
    where: { id: contentId },
    include: { _count: { select: { distributions: true } } },
  });

  if (!existing || existing.groupId !== context.groupId) {
    throw new Error("Innhold ikke funnet");
  }

  if (existing._count.distributions > 0) {
    throw new Error("Kan ikke slette innhold som er distribuert. Trekk tilbake distribusjonene først.");
  }

  await prisma.corporateGroupContent.delete({ where: { id: contentId } });

  await logContentAction(context.groupId, context.userId, "DELETE_CONTENT", contentId);
  revalidatePath("/konsern/innhold");
}

// ============================================
// Distribusjon
// ============================================

export async function distributeContent(
  contentId: string,
  tenantIds: string[]
) {
  const context = await requireGroupPermission("canDistributeContent");

  const content = await prisma.corporateGroupContent.findUnique({
    where: { id: contentId },
  });

  if (!content || content.groupId !== context.groupId) {
    throw new Error("Innhold ikke funnet");
  }

  if (content.status !== "PUBLISHED") {
    throw new Error("Kun publisert innhold kan distribueres");
  }

  const accessibleTenantIds = await getAccessibleTenantIds(context.groupId);
  const invalidTenants = tenantIds.filter((id) => !accessibleTenantIds.includes(id));
  if (invalidTenants.length > 0) {
    throw new Error("En eller flere bedrifter tilhører ikke konsernet");
  }

  const results = await Promise.allSettled(
    tenantIds.map(async (tenantId) => {
      const existing = await prisma.corporateGroupDistribution.findUnique({
        where: { contentId_tenantId: { contentId, tenantId } },
      });

      if (existing && existing.status === "DISTRIBUTED") {
        return { tenantId, status: "already_distributed" as const };
      }

      const localResourceId = await createLocalResource(content, tenantId, context.userId);

      if (existing) {
        await prisma.corporateGroupDistribution.update({
          where: { id: existing.id },
          data: {
            status: "DISTRIBUTED",
            localResourceId,
            distributedAt: new Date(),
            distributedById: context.userId,
            locallyModified: false,
          },
        });
      } else {
        await prisma.corporateGroupDistribution.create({
          data: {
            contentId,
            groupId: context.groupId,
            tenantId,
            status: "DISTRIBUTED",
            localResourceId,
            distributedAt: new Date(),
            distributedById: context.userId,
          },
        });
      }

      return { tenantId, status: "distributed" as const, localResourceId };
    })
  );

  await logContentAction(context.groupId, context.userId, "DISTRIBUTE_CONTENT", contentId, {
    tenantIds,
    results: results.map((r) => (r.status === "fulfilled" ? r.value : { error: String(r.reason) })),
  });

  revalidatePath("/konsern/distribusjon");
  revalidatePath("/konsern/innhold");
  return results;
}

export async function withdrawDistribution(contentId: string, tenantId: string) {
  const context = await requireGroupPermission("canDistributeContent");

  await requireTenantInGroup(context.groupId, tenantId);

  const distribution = await prisma.corporateGroupDistribution.findUnique({
    where: { contentId_tenantId: { contentId, tenantId } },
  });

  if (!distribution || distribution.groupId !== context.groupId) {
    throw new Error("Distribusjon ikke funnet");
  }

  await prisma.corporateGroupDistribution.update({
    where: { id: distribution.id },
    data: { status: "WITHDRAWN" },
  });

  if (distribution.localResourceId) {
    await removeLocalLock(distribution.localResourceId, distribution.groupId);
  }

  await logContentAction(context.groupId, context.userId, "WITHDRAW_DISTRIBUTION", contentId, { tenantId });
  revalidatePath("/konsern/distribusjon");
}

export async function listDistributions(filters?: {
  contentId?: string;
  tenantId?: string;
}) {
  const context = await requireCorporateGroupContext();

  return prisma.corporateGroupDistribution.findMany({
    where: {
      groupId: context.groupId,
      ...(filters?.contentId && { contentId: filters.contentId }),
      ...(filters?.tenantId && { tenantId: filters.tenantId }),
    },
    include: {
      content: {
        select: { id: true, title: true, contentType: true, distributionMode: true, status: true },
      },
      tenant: {
        select: { id: true, name: true, slug: true, city: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getDistributionStats() {
  const context = await requireCorporateGroupContext();

  const stats = await prisma.corporateGroupDistribution.groupBy({
    by: ["status"],
    where: { groupId: context.groupId },
    _count: true,
  });

  const byContentType = await prisma.corporateGroupContent.groupBy({
    by: ["contentType"],
    where: { groupId: context.groupId },
    _count: true,
  });

  return { distributionsByStatus: stats, contentByType: byContentType };
}

// ============================================
// Interne hjelpefunksjoner
// ============================================

async function createLocalResource(
  content: {
    id: string;
    contentType: CorporateGroupContentType;
    title: string;
    description: string | null;
    content: unknown;
    fileKey: string | null;
    mime: string | null;
    legalReference: string | null;
    category: string | null;
    distributionMode: CorporateGroupDistMode;
  },
  tenantId: string,
  userId: string
): Promise<string> {
  const isLocked = content.distributionMode === "LOCKED";

  switch (content.contentType) {
    case "ROUTINE": {
      const routine = await prisma.routine.create({
        data: {
          tenantId,
          title: content.title,
          description: content.description,
          content: content.content as any ?? undefined,
          legalReference: content.legalReference,
          category: content.category,
          status: "ACTIVE",
          corporateGroupContentId: content.id,
          isLockedByGroup: isLocked,
          createdBy: userId,
        },
      });
      return routine.id;
    }

    case "DOCUMENT": {
      const slug = `konsern-${content.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
      const uniqueSlug = `${slug}-${Date.now()}`;
      const document = await prisma.document.create({
        data: {
          tenantId,
          kind: "PROCEDURE",
          title: content.title,
          slug: uniqueSlug,
          version: "1.0",
          status: "APPROVED",
          fileKey: content.fileKey ?? "",
          mime: content.mime ?? "application/pdf",
          corporateGroupContentId: content.id,
          isLockedByGroup: isLocked,
        },
      });
      return document.id;
    }

    case "RISK_ASSESSMENT": {
      const ra = await prisma.riskAssessment.create({
        data: {
          tenantId,
          title: content.title,
          assessmentYear: new Date().getFullYear(),
          corporateGroupContentId: content.id,
          isLockedByGroup: isLocked,
        },
      });
      return ra.id;
    }

    case "INSPECTION_TEMPLATE": {
      const tmpl = await prisma.inspectionTemplate.create({
        data: {
          tenantId,
          name: content.title,
          description: content.description,
          category: content.category,
          checklist: content.content as any ?? undefined,
          corporateGroupContentId: content.id,
          isLockedByGroup: isLocked,
        },
      });
      return tmpl.id;
    }

    case "SJA_TEMPLATE": {
      const sja = await prisma.sjaTemplate.create({
        data: {
          tenantId,
          name: content.title,
          description: content.description,
          corporateGroupContentId: content.id,
          isLockedByGroup: isLocked,
          createdById: userId,
          createdByName: "Konsern",
        },
      });
      return sja.id;
    }

    case "TRAINING_COURSE": {
      const courseKey = `konsern-${content.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
      const course = await prisma.courseTemplate.create({
        data: {
          tenantId,
          courseKey,
          title: content.title,
          description: content.description,
          corporateGroupContentId: content.id,
          isLockedByGroup: isLocked,
        },
      });
      return course.id;
    }

    case "CHEMICAL": {
      const chemical = await prisma.chemical.create({
        data: {
          tenantId,
          productName: content.title,
          notes: content.description,
          corporateGroupContentId: content.id,
          isLockedByGroup: isLocked,
        },
      });
      return chemical.id;
    }

    case "HANDBOOK_SECTION": {
      const routine = await prisma.routine.create({
        data: {
          tenantId,
          title: `[HMS-håndbok] ${content.title}`,
          description: content.description,
          content: content.content as any ?? undefined,
          category: "handbook",
          status: "ACTIVE",
          corporateGroupContentId: content.id,
          isLockedByGroup: isLocked,
          createdBy: userId,
        },
      });
      return routine.id;
    }

    default:
      throw new Error(`Ukjent innholdstype: ${content.contentType}`);
  }
}

async function syncLockedDistributions(
  contentId: string,
  groupId: string,
  userId: string
) {
  const content = await prisma.corporateGroupContent.findUnique({
    where: { id: contentId },
  });

  if (!content || content.distributionMode !== "LOCKED") return;

  const distributions = await prisma.corporateGroupDistribution.findMany({
    where: { contentId, groupId, status: "DISTRIBUTED" },
  });

  for (const dist of distributions) {
    if (!dist.localResourceId) continue;

    try {
      await updateLocalResource(content, dist.localResourceId);
    } catch {
      // Logg feil men fortsett med andre
    }
  }
}

async function updateLocalResource(
  content: {
    contentType: CorporateGroupContentType;
    title: string;
    description: string | null;
    content: unknown;
    legalReference: string | null;
    category: string | null;
  },
  localResourceId: string
) {
  switch (content.contentType) {
    case "ROUTINE":
    case "HANDBOOK_SECTION":
      await prisma.routine.update({
        where: { id: localResourceId },
        data: {
          title: content.contentType === "HANDBOOK_SECTION" ? `[HMS-håndbok] ${content.title}` : content.title,
          description: content.description,
          content: content.content as any ?? undefined,
          legalReference: content.legalReference,
          category: content.category,
        },
      });
      break;

    case "INSPECTION_TEMPLATE":
      await prisma.inspectionTemplate.update({
        where: { id: localResourceId },
        data: {
          name: content.title,
          description: content.description,
          checklist: content.content as any ?? undefined,
          category: content.category,
        },
      });
      break;

    case "SJA_TEMPLATE":
      await prisma.sjaTemplate.update({
        where: { id: localResourceId },
        data: {
          name: content.title,
          description: content.description,
        },
      });
      break;

    case "TRAINING_COURSE":
      await prisma.courseTemplate.update({
        where: { id: localResourceId },
        data: {
          title: content.title,
          description: content.description,
        },
      });
      break;

    case "CHEMICAL":
      await prisma.chemical.update({
        where: { id: localResourceId },
        data: {
          productName: content.title,
          notes: content.description,
        },
      });
      break;
  }
}

async function removeLocalLock(localResourceId: string, groupId: string) {
  const tables = [
    { model: "routine" as const, field: "corporateGroupContentId" },
    { model: "document" as const, field: "corporateGroupContentId" },
    { model: "riskAssessment" as const, field: "corporateGroupContentId" },
    { model: "inspectionTemplate" as const, field: "corporateGroupContentId" },
    { model: "sjaTemplate" as const, field: "corporateGroupContentId" },
    { model: "courseTemplate" as const, field: "corporateGroupContentId" },
    { model: "chemical" as const, field: "corporateGroupContentId" },
  ];

  for (const table of tables) {
    try {
      await (prisma[table.model] as any).updateMany({
        where: { id: localResourceId, corporateGroupContentId: { not: null } },
        data: { isLockedByGroup: false, corporateGroupContentId: null },
      });
    } catch {
      // Ignorer feil for tabeller der ID ikke finnes
    }
  }
}

async function logContentAction(
  groupId: string,
  userId: string,
  action: string,
  targetId: string,
  details?: Record<string, unknown>
) {
  await prisma.corporateGroupAuditLog.create({
    data: {
      groupId,
      userId,
      action,
      targetType: "content",
      targetId,
      details: details ? JSON.parse(JSON.stringify(details)) : undefined,
    },
  });
}
