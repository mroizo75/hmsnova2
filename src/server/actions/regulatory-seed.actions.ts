"use server";

import { prisma } from "@/lib/db";
import { REGULATORY_REQUIREMENTS } from "@/lib/regulatory-requirements-seed";
import { repairDashboardRoute, repairLovdataUrl } from "@/lib/legal-link-repair";

export async function seedRegulatoryRequirements(): Promise<{
  created: number;
  existing: number;
}> {
  let created = 0;
  let existing = 0;

  for (const req of REGULATORY_REQUIREMENTS) {
    const exists = await prisma.regulatoryRequirement.findFirst({
      where: { title: req.title, legalBasis: req.legalBasis },
    });

    if (exists) {
      existing++;
      continue;
    }

    await prisma.regulatoryRequirement.create({
      data: {
        title: req.title,
        description: req.description,
        legalBasis: req.legalBasis,
        sourceUrl: repairLovdataUrl(req.sourceUrl ?? null),
        triggerActivities: req.triggerActivities,
        hmsNovaFeature: req.hmsNovaFeature ?? null,
        hmsNovaRoute: repairDashboardRoute(req.hmsNovaRoute ?? null),
        routineCategory: req.routineCategory ?? null,
        severity: req.severity,
        sortOrder: REGULATORY_REQUIREMENTS.indexOf(req),
      },
    });
    created++;
  }

  return { created, existing };
}
