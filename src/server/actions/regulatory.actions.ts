"use server";

import { prisma } from "@/lib/db";
import { RoutineStatus } from "@prisma/client";
import { getActionContext } from "@/server/actions/action-context";
import { revalidatePath } from "next/cache";
import { deriveActiveActivities } from "@/lib/activity-questions";
import { matchesIndustryScope } from "@/lib/industry-scope";
import {
  isRoutineRecommendedForRequirements,
  partitionRoutineTemplateIds,
  templateIdsToArchive,
} from "@/lib/regulatory-routine-match";
import { triggerRealtimeEvent } from "@/lib/pusher-server";
import { requirePermission } from "@/lib/server-authorization";
import { generateChangeNumber } from "@/lib/change-number";
import { AuditLog } from "@/lib/audit-log";
import { ensureGlobalRoutineTemplateLibrarySeeded } from "@/server/actions/routine-library.actions";
import {
  canonicalRequirementTitle,
  repairDashboardRoute,
  repairLovdataUrl,
  REQUIREMENT_TITLE_ALIASES,
} from "@/lib/legal-link-repair";

export async function saveActivityProfile(input: {
  answers: Record<string, boolean>;
}) {
  const { tenantId } = await getActionContext();

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { naceCode: true },
  });

  const activeActivities = deriveActiveActivities(input.answers, tenant?.naceCode);

  const profile = await prisma.tenantActivityProfile.upsert({
    where: { tenantId },
    create: {
      tenantId,
      answers: input.answers,
      activeActivities,
      completedAt: new Date(),
    },
    update: {
      answers: input.answers,
      activeActivities,
      completedAt: new Date(),
    },
  });

  await generateRegulatoryProfile(tenantId, activeActivities);

  revalidatePath("/dashboard/juridisk-register");
  revalidatePath("/dashboard/hms-handbok");
  triggerRealtimeEvent(tenantId, "settings-updated");
  return { success: true, data: profile };
}

async function generateRegulatoryProfile(tenantId: string, activeActivities: string[]) {
  const requirements = await prisma.regulatoryRequirement.findMany();

  const matchedRequirements = requirements.filter((req) => {
    const triggers = req.triggerActivities as string[];
    return triggers.some((t) => activeActivities.includes(t));
  });

  const requirementStatuses = matchedRequirements.map((req) => ({
    requirementId: req.id,
    status: "UNCHECKED",
    checkedAt: new Date().toISOString(),
  }));

  await prisma.tenantRegulatoryProfile.upsert({
    where: { tenantId },
    create: {
      tenantId,
      requirements: requirementStatuses,
    },
    update: {
      requirements: requirementStatuses,
      generatedAt: new Date(),
    },
  });
}

export async function getRegulatoryStatusForTenant(tenantId: string) {
  return getRegulatoryStatusInternal(tenantId);
}

export async function getRegulatoryStatus() {
  const { tenantId } = await getActionContext();
  return getRegulatoryStatusInternal(tenantId);
}

async function getRegulatoryStatusInternal(tenantId: string) {

  const [profile, activityProfile, tenant, requirements] = await Promise.all([
    prisma.tenantRegulatoryProfile.findUnique({ where: { tenantId } }),
    prisma.tenantActivityProfile.findUnique({ where: { tenantId } }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        naceCode: true,
        naceDescription: true,
        subIndustry: true,
        industry: true,
        name: true,
        orgNumber: true,
      },
    }),
    prisma.regulatoryRequirement.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  if (!activityProfile || !profile) {
    return {
      hasProfile: false,
      tenant,
      requirements: [],
      compliancePercentage: 0,
      activityProfile: null,
    };
  }

  const activeActivities = activityProfile.activeActivities as string[];

  const overrides = await prisma.tenantRequirementOverride.findMany({
    where: { tenantId },
    include: { verifiedBy: { select: { name: true } } },
  });

  const overrideMap = new Map(
    overrides
      .filter((o) => o.regulatoryRequirementId)
      .map((o) => [o.regulatoryRequirementId!, o]),
  );

  const relevantRequirements = requirements.filter((req) => {
    const triggers = req.triggerActivities as string[];
    return triggers.some((t) => activeActivities.includes(t));
  });

  const requirementStatuses = await Promise.all(
    relevantRequirements.map(async (req) => {
      const override = overrideMap.get(req.id);

      let status: "COMPLIANT" | "PARTIAL" | "MISSING" | "NOT_APPLICABLE" = "MISSING";
      let statusNote: string | null = null;
      let documentUrl: string | null = null;
      let documentName: string | null = null;
      let verifiedAt: string | null = null;
      let verifiedByName: string | null = null;
      let hasOverride = false;

      if (override) {
        hasOverride = true;
        status = override.manualStatus as typeof status;
        statusNote = override.statusNote;
        documentUrl = override.documentUrl;
        documentName = override.documentName;
        verifiedAt = override.verifiedAt?.toISOString() ?? null;
        verifiedByName = override.verifiedBy?.name ?? null;
      } else if (req.hmsNovaFeature) {
        status = await checkFeatureCompliance(tenantId, req.hmsNovaFeature);
      }

      return {
        ...req,
        hmsNovaRoute: repairDashboardRoute(req.hmsNovaRoute),
        sourceUrl: repairLovdataUrl(req.sourceUrl),
        status,
        statusNote,
        documentUrl,
        documentName,
        verifiedAt,
        verifiedByName,
        hasOverride,
        isCustom: false,
      };
    })
  );

  const customRequirements = overrides
    .filter((o) => o.isCustomRequirement)
    .map((o) => ({
      id: o.id,
      title: o.customTitle ?? "Egendefinert krav",
      description: o.customDescription ?? "",
      legalBasis: o.customLegalBasis ?? "",
      sourceUrl: null,
      hmsNovaFeature: null,
      hmsNovaRoute: null,
      severity: "MANDATORY",
      status: o.manualStatus as "COMPLIANT" | "PARTIAL" | "MISSING" | "NOT_APPLICABLE",
      statusNote: o.statusNote,
      documentUrl: o.documentUrl,
      documentName: o.documentName,
      verifiedAt: o.verifiedAt?.toISOString() ?? null,
      verifiedByName: o.verifiedBy?.name ?? null,
      hasOverride: true,
      isCustom: true,
    }));

  const allRequirements = [...requirementStatuses, ...customRequirements];
  const activeRequirements = allRequirements.filter((r) => r.status !== "NOT_APPLICABLE");
  const compliant = activeRequirements.filter((r) => r.status === "COMPLIANT").length;
  const total = activeRequirements.length;
  const compliancePercentage = total > 0 ? Math.round((compliant / total) * 100) : 0;

  return {
    hasProfile: true,
    tenant,
    requirements: allRequirements,
    compliancePercentage,
    activityProfile: {
      answers: activityProfile.answers as Record<string, boolean>,
      activeActivities,
      completedAt: activityProfile.completedAt,
    },
  };
}

async function checkFeatureCompliance(
  tenantId: string,
  feature: string,
): Promise<"COMPLIANT" | "PARTIAL" | "MISSING"> {
  switch (feature) {
    case "risk_assessment": {
      const count = await prisma.riskAssessment.count({ where: { tenantId } });
      return count > 0 ? "COMPLIANT" : "MISSING";
    }
    case "incident_management": {
      const routineCount = await prisma.routine.count({
        where: { tenantId, category: "AVVIK", status: "ACTIVE" },
      });
      return routineCount > 0 ? "COMPLIANT" : "MISSING";
    }
    case "hms_handbook": {
      const handbook = await prisma.hmsHandbook.findUnique({ where: { tenantId } });
      return handbook ? "COMPLIANT" : "MISSING";
    }
    case "training": {
      const count = await prisma.training.count({ where: { tenantId } });
      return count > 0 ? "COMPLIANT" : "MISSING";
    }
    case "chemical_register": {
      const count = await prisma.chemical.count({ where: { tenantId } });
      return count > 0 ? "COMPLIANT" : "MISSING";
    }
    case "routines": {
      const count = await prisma.routine.count({ where: { tenantId, status: "ACTIVE" } });
      return count >= 3 ? "COMPLIANT" : count > 0 ? "PARTIAL" : "MISSING";
    }
    case "org_chart": {
      const count = await prisma.orgChartNode.count({ where: { tenantId } });
      return count >= 2 ? "COMPLIANT" : "MISSING";
    }
    case "sja": {
      const count = await prisma.sjaAnalysis.count({ where: { tenantId } });
      return count > 0 ? "COMPLIANT" : "MISSING";
    }
    case "fire_drill": {
      const [drillCount, routineCount] = await Promise.all([
        prisma.fireDrill.count({ where: { tenantId } }),
        prisma.routine.count({
          where: {
            tenantId,
            status: "ACTIVE",
            OR: [
              { category: "BRANN" },
              { title: { contains: "brann" } },
              { title: { contains: "Brann" } },
            ],
          },
        }),
      ]);
      if (routineCount > 0 && drillCount > 0) return "COMPLIANT";
      if (routineCount > 0 || drillCount > 0) return "PARTIAL";
      return "MISSING";
    }
    case "exposure_register": {
      const count = await prisma.exposureRegister.count({ where: { tenantId } });
      return count > 0 ? "COMPLIANT" : "MISSING";
    }
    case "whistleblowing": {
      const count = await prisma.whistleblowing.count({ where: { tenantId } });
      return count > 0 ? "COMPLIANT" : "MISSING";
    }
    case "bht": {
      const avtale = await prisma.bhtAvtale.findFirst({ where: { tenantId } });
      return avtale ? "COMPLIANT" : "MISSING";
    }
    case "time_registration": {
      const count = await prisma.timeEntry.count({ where: { tenantId } });
      return count > 0 ? "COMPLIANT" : "MISSING";
    }
    case "haccp": {
      const count = await prisma.haccpPlan.count({ where: { tenantId } });
      return count > 0 ? "COMPLIANT" : "MISSING";
    }
    case "temperatur": {
      const count = await prisma.temperaturLog.count({ where: { tenantId } });
      return count > 0 ? "COMPLIANT" : "MISSING";
    }
    case "varemottak": {
      const count = await prisma.matVaremottak.count({ where: { tenantId } });
      return count > 0 ? "COMPLIANT" : "MISSING";
    }
    case "renhold": {
      const count = await prisma.matRenhold.count({ where: { tenantId } });
      return count > 0 ? "COMPLIANT" : "MISSING";
    }
    case "skjenking": {
      const [bevilling, hendelser] = await Promise.all([
        prisma.skjenkeBevilling.findFirst({ where: { tenantId } }),
        prisma.skjenkeHendelse.count({ where: { tenantId } }),
      ]);
      if (bevilling && (bevilling.internregler || bevilling.skjenketider) && hendelser > 0) {
        return "COMPLIANT";
      }
      if (bevilling || hendelser > 0) return "PARTIAL";
      return "MISSING";
    }
    case "allergen": {
      const [oversiktCount, routineCount] = await Promise.all([
        prisma.allergenOversikt.count({ where: { tenantId } }),
        prisma.routine.count({
          where: { tenantId, category: "HOTELL_RESTAURANT", status: "ACTIVE", title: { contains: "allergen" } },
        }),
      ]);
      if (oversiktCount > 0 && routineCount > 0) return "COMPLIANT";
      if (oversiktCount > 0 || routineCount > 0) return "PARTIAL";
      return "MISSING";
    }
    case "meetings_amu": {
      const count = await prisma.meeting.count({ where: { tenantId, type: "AMU" } });
      return count > 0 ? "COMPLIANT" : "MISSING";
    }
    case "sha_plan": {
      const count = await prisma.routine.count({
        where: { tenantId, category: "BYGG_ANLEGG", status: "ACTIVE" },
      });
      return count > 0 ? "COMPLIANT" : "MISSING";
    }
    default:
      return "MISSING";
  }
}

export async function ensureRegulatoryRequirementsSeeded() {
  const { REGULATORY_REQUIREMENTS } = await import("@/lib/regulatory-requirements-seed");

  let created = 0;
  let updated = 0;

  for (let i = 0; i < REGULATORY_REQUIREMENTS.length; i++) {
    const req = REGULATORY_REQUIREMENTS[i];
    const sourceUrl = repairLovdataUrl(req.sourceUrl ?? null);
    const hmsNovaRoute = repairDashboardRoute(req.hmsNovaRoute ?? null);

    const aliasTitles = Object.entries(REQUIREMENT_TITLE_ALIASES)
      .filter(([, canonical]) => canonical === req.title)
      .map(([oldTitle]) => oldTitle);

    const existing = await prisma.regulatoryRequirement.findFirst({
      where: {
        OR: [
          { title: req.title, legalBasis: req.legalBasis },
          ...(aliasTitles.length > 0 ? [{ title: { in: aliasTitles } }] : []),
        ],
      },
    });

    if (!existing) {
      await prisma.regulatoryRequirement.create({
        data: {
          title: req.title,
          description: req.description,
          legalBasis: req.legalBasis,
          sourceUrl,
          triggerActivities: req.triggerActivities,
          hmsNovaFeature: req.hmsNovaFeature ?? null,
          hmsNovaRoute,
          routineCategory: req.routineCategory ?? null,
          severity: req.severity,
          sortOrder: i,
        },
      });
      created++;
      continue;
    }

    if (
      existing.title !== req.title ||
      existing.sourceUrl !== sourceUrl ||
      existing.hmsNovaRoute !== hmsNovaRoute ||
      existing.description !== req.description
    ) {
      await prisma.regulatoryRequirement.update({
        where: { id: existing.id },
        data: {
          title: req.title,
          sourceUrl,
          hmsNovaRoute,
          description: req.description,
          legalBasis: req.legalBasis,
          hmsNovaFeature: req.hmsNovaFeature ?? existing.hmsNovaFeature,
          routineCategory: req.routineCategory ?? existing.routineCategory,
        },
      });
      updated++;
    }
  }

  const leftover = await prisma.regulatoryRequirement.findMany({
    select: { id: true, title: true, hmsNovaRoute: true, sourceUrl: true },
  });
  for (const row of leftover) {
    const nextTitle = canonicalRequirementTitle(row.title);
    const nextRoute = repairDashboardRoute(row.hmsNovaRoute);
    const nextUrl = repairLovdataUrl(row.sourceUrl);
    if (
      nextTitle === row.title &&
      nextRoute === row.hmsNovaRoute &&
      nextUrl === row.sourceUrl
    ) {
      continue;
    }
    await prisma.regulatoryRequirement.update({
      where: { id: row.id },
      data: { title: nextTitle, hmsNovaRoute: nextRoute, sourceUrl: nextUrl },
    });
    updated++;
  }

  return { seeded: created > 0, created, updated, count: REGULATORY_REQUIREMENTS.length };
}

export type RegulatoryRoutineSuggestion = {
  templateId: string;
  title: string;
  description: string | null;
  category: string | null;
  legalReference: string | null;
  recommended: boolean;
  publishedRoutineId: string | null;
};

export async function getRegulatoryRoutineSuggestions(): Promise<RegulatoryRoutineSuggestion[]> {
  const { tenantId } = await getActionContext();
  await ensureGlobalRoutineTemplateLibrarySeeded();

  const [status, tenant, templates, existingRoutines] = await Promise.all([
    getRegulatoryStatusInternal(tenantId),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { industry: true },
    }),
    prisma.routineTemplate.findMany({
      where: {
        isActive: true,
        OR: [{ tenantId }, { isGlobal: true }],
      },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        legalReference: true,
        industryScope: true,
      },
    }),
    prisma.routine.findMany({
      where: {
        tenantId,
        templateId: { not: null },
        status: { not: RoutineStatus.ARCHIVED },
      },
      select: { id: true, templateId: true },
    }),
  ]);

  const requirementCategories = status.requirements
    .filter((r) => r.status !== "NOT_APPLICABLE")
    .map((r) => {
      const category = (r as { routineCategory?: string | null }).routineCategory;
      return typeof category === "string" && category.length > 0 ? category : null;
    })
    .filter((c): c is string => c !== null);
  const requirementLegalBases = status.requirements
    .filter((r) => r.status !== "NOT_APPLICABLE")
    .map((r) => r.legalBasis);

  const publishedByTemplate = new Map(
    existingRoutines
      .filter((r) => r.templateId)
      .map((r) => [r.templateId as string, r.id]),
  );

  return templates
    .filter((tpl) => matchesIndustryScope(tpl.industryScope, tenant?.industry))
    .map((tpl) => ({
      templateId: tpl.id,
      title: tpl.title,
      description: tpl.description,
      category: tpl.category,
      legalReference: tpl.legalReference,
      recommended: isRoutineRecommendedForRequirements(
        { category: tpl.category, legalReference: tpl.legalReference },
        requirementCategories,
        requirementLegalBases,
      ),
      publishedRoutineId: publishedByTemplate.get(tpl.id) ?? null,
    }))
    .sort((a, b) => {
      if (a.recommended !== b.recommended) return a.recommended ? -1 : 1;
      return a.title.localeCompare(b.title, "nb");
    });
}

export async function publishRegulatoryRoutines(selectedTemplateIds: string[]) {
  const context = await requirePermission("canCreateDocuments");
  const { tenantId, userId } = context;

  const uniqueIds = [...new Set(selectedTemplateIds.filter((id) => id.length > 0))];
  const suggestions = await getRegulatoryRoutineSuggestions();
  const allowedIds = new Set(suggestions.map((s) => s.templateId));
  const selected = uniqueIds.filter((id) => allowedIds.has(id));

  const publishedTemplateIds = suggestions
    .filter((s) => s.publishedRoutineId)
    .map((s) => s.templateId);

  const { toPublish } = partitionRoutineTemplateIds(selected, publishedTemplateIds);
  const archiveIds = templateIdsToArchive(publishedTemplateIds, selected);

  let published = 0;
  let archived = 0;

  for (const templateId of toPublish) {
    const template = await prisma.routineTemplate.findFirst({
      where: {
        id: templateId,
        isActive: true,
        OR: [{ tenantId }, { isGlobal: true }],
      },
    });
    if (!template) continue;

    const existing = await prisma.routine.findFirst({
      where: { tenantId, templateId },
      select: { id: true, status: true, title: true },
    });

    if (existing) {
      if (existing.status === RoutineStatus.ARCHIVED) {
        await prisma.routine.update({
          where: { id: existing.id },
          data: { status: RoutineStatus.ACTIVE, updatedBy: userId },
        });
        published += 1;
      }
      continue;
    }

    const routine = await prisma.routine.create({
      data: {
        tenantId,
        templateId: template.id,
        title: template.title,
        description: template.description,
        category: template.category,
        content: template.content,
        legalReference: template.legalReference,
        createdBy: userId,
        status: RoutineStatus.ACTIVE,
        reviewIntervalMonths: 12,
      },
    });

    const changeNumber = await generateChangeNumber(tenantId);
    await prisma.routineVersion.create({
      data: {
        routineId: routine.id,
        versionNumber: 1,
        changeNumber,
        changeSummary: `Rutine publisert fra regelverksprofil: ${template.title}`,
        content: template.content ?? {},
        legalReference: template.legalReference,
        changedById: userId,
      },
    });

    AuditLog.log(tenantId, userId, "ROUTINE_PUBLISHED", "Routine", routine.id, {
      title: routine.title,
      templateId: template.id,
    }).catch(() => {});

    published += 1;
  }

  if (archiveIds.length > 0) {
    const toArchive = suggestions.filter(
      (s) => s.publishedRoutineId && archiveIds.includes(s.templateId),
    );
    for (const item of toArchive) {
      if (!item.publishedRoutineId) continue;
      await prisma.routine.update({
        where: { id: item.publishedRoutineId },
        data: { status: RoutineStatus.ARCHIVED, updatedBy: userId },
      });
      AuditLog.log(tenantId, userId, "ROUTINE_UPDATED", "Routine", item.publishedRoutineId, {
        title: item.title,
        status: "ARCHIVED",
      }).catch(() => {});
      archived += 1;
    }
  }

  revalidatePath("/dashboard/juridisk-register");
  revalidatePath("/dashboard/rutiner");
  revalidatePath("/dashboard/hms-handbok");
  triggerRealtimeEvent(tenantId, "routine-updated");
  triggerRealtimeEvent(tenantId, "settings-updated");

  return { success: true as const, published, archived };
}
