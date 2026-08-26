"use server";

import { prisma } from "@/lib/db";
import { getActionContext } from "@/server/actions/action-context";
import { revalidatePath } from "next/cache";
import { deriveActiveActivities } from "@/lib/activity-questions";

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
          where: { tenantId, status: "ACTIVE", title: { contains: "brann" } },
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
  const count = await prisma.regulatoryRequirement.count();
  if (count > 0) return { seeded: false, count };

  const { REGULATORY_REQUIREMENTS } = await import("@/lib/regulatory-requirements-seed");

  for (let i = 0; i < REGULATORY_REQUIREMENTS.length; i++) {
    const req = REGULATORY_REQUIREMENTS[i];
    await prisma.regulatoryRequirement.create({
      data: {
        title: req.title,
        description: req.description,
        legalBasis: req.legalBasis,
        sourceUrl: req.sourceUrl ?? null,
        triggerActivities: req.triggerActivities,
        hmsNovaFeature: req.hmsNovaFeature ?? null,
        hmsNovaRoute: req.hmsNovaRoute ?? null,
        routineCategory: req.routineCategory ?? null,
        severity: req.severity,
        sortOrder: i,
      },
    });
  }

  return { seeded: true, count: REGULATORY_REQUIREMENTS.length };
}
